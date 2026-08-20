-- DevFlow schema migration 0003
-- Organizations and organization membership.

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  created_by uuid not null references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger organizations_set_updated_at
  before update on organizations
  for each row
  execute function set_updated_at();

create table organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  role app_role not null default 'developer',
  invited_by uuid references profiles (id),
  joined_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index organization_members_org_idx on organization_members (organization_id);
create index organization_members_user_idx on organization_members (user_id);

-- ---------------------------------------------------------------------------
-- Helper functions used throughout RLS policies (SECURITY DEFINER so they
-- can read organization_members/project_members without triggering RLS
-- recursion on those same tables).
-- ---------------------------------------------------------------------------

create or replace function is_platform_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select is_platform_admin from profiles where id = auth.uid()), false);
$$;

create or replace function is_org_member(target_org_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from organization_members
    where organization_id = target_org_id and user_id = auth.uid()
  ) or is_platform_admin();
$$;

create or replace function is_org_admin(target_org_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from organization_members
    where organization_id = target_org_id
      and user_id = auth.uid()
      and role = 'administrator'
  ) or is_platform_admin();
$$;

-- Automatically add the creator as an administrator member. This runs as
-- the function owner (security definer) so it bypasses the chicken-and-egg
-- RLS problem of "you must already be an admin member to insert a member".
create or replace function handle_new_organization()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.organization_members (organization_id, user_id, role, invited_by)
  values (new.id, new.created_by, 'administrator', new.created_by);
  return new;
end;
$$;

create trigger on_organization_created
  after insert on organizations
  for each row
  execute function handle_new_organization();

alter table organizations enable row level security;
alter table organization_members enable row level security;

create policy "Members can view their organizations"
  on organizations for select
  to authenticated
  using (is_org_member(id));

create policy "Authenticated users can create organizations"
  on organizations for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "Org admins can update their organization"
  on organizations for update
  to authenticated
  using (is_org_admin(id))
  with check (is_org_admin(id));

create policy "Members can view organization membership"
  on organization_members for select
  to authenticated
  using (is_org_member(organization_id));

create policy "Org admins can manage membership"
  on organization_members for insert
  to authenticated
  with check (is_org_admin(organization_id));

create policy "Org admins can update membership"
  on organization_members for update
  to authenticated
  using (is_org_admin(organization_id))
  with check (is_org_admin(organization_id));

create policy "Org admins can remove membership"
  on organization_members for delete
  to authenticated
  using (is_org_admin(organization_id));
