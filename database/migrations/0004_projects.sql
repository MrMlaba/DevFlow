-- DevFlow schema migration 0004
-- Projects, project membership, and project invitations.

create table projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  repository_url text,
  tech_stack text[] not null default '{}',
  status project_status not null default 'planning',
  created_by uuid not null references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create index projects_org_idx on projects (organization_id);

create trigger projects_set_updated_at
  before update on projects
  for each row
  execute function set_updated_at();

create table project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  role app_role not null default 'developer',
  invited_by uuid references profiles (id),
  joined_at timestamptz not null default now(),
  unique (project_id, user_id)
);

create index project_members_project_idx on project_members (project_id);
create index project_members_user_idx on project_members (user_id);

create table project_invitations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  email text not null,
  role app_role not null default 'developer',
  invited_by uuid not null references profiles (id),
  status invitation_status not null default 'pending',
  token uuid not null default gen_random_uuid(),
  expires_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now()
);

create index project_invitations_project_idx on project_invitations (project_id);
create index project_invitations_email_idx on project_invitations (email);

-- ---------------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------------

create or replace function project_org_id(target_project_id uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select organization_id from projects where id = target_project_id;
$$;

create or replace function is_project_member(target_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from project_members
    where project_id = target_project_id and user_id = auth.uid()
  ) or is_org_admin(project_org_id(target_project_id));
$$;

-- Project owners, org admins, and platform admins can manage a project
-- (update settings, manage members, delete tasks/issues, etc).
create or replace function is_project_admin(target_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from project_members
    where project_id = target_project_id
      and user_id = auth.uid()
      and role in ('project_owner', 'administrator')
  ) or is_org_admin(project_org_id(target_project_id));
$$;

create or replace function get_project_role(target_project_id uuid)
returns app_role
language sql
security definer
set search_path = public
stable
as $$
  select role from project_members
  where project_id = target_project_id and user_id = auth.uid();
$$;

-- Auto-add the project creator as project_owner.
create or replace function handle_new_project()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.project_members (project_id, user_id, role, invited_by)
  values (new.id, new.created_by, 'project_owner', new.created_by)
  on conflict (project_id, user_id) do nothing;
  return new;
end;
$$;

create trigger on_project_created
  after insert on projects
  for each row
  execute function handle_new_project();

alter table projects enable row level security;
alter table project_members enable row level security;
alter table project_invitations enable row level security;

-- A project is visible either to the whole organization, or to a user who
-- was added directly to that specific project without an org-wide role
-- (e.g. an external contributor invited to one project only).
create policy "Org members and project members can view projects"
  on projects for select
  to authenticated
  using (is_org_member(organization_id) or is_project_member(id));

create policy "Org admins can create projects"
  on projects for insert
  to authenticated
  with check (is_org_admin(organization_id) and created_by = auth.uid());

create policy "Project admins can update their project"
  on projects for update
  to authenticated
  using (is_project_admin(id))
  with check (is_project_admin(id));

create policy "Project admins can delete their project"
  on projects for delete
  to authenticated
  using (is_project_admin(id));

create policy "Project members can view membership"
  on project_members for select
  to authenticated
  using (is_project_member(project_id));

create policy "Project admins can add members"
  on project_members for insert
  to authenticated
  with check (is_project_admin(project_id));

create policy "Project admins can update member roles"
  on project_members for update
  to authenticated
  using (is_project_admin(project_id))
  with check (is_project_admin(project_id));

create policy "Project admins can remove members"
  on project_members for delete
  to authenticated
  using (is_project_admin(project_id));

create policy "Project admins can view invitations"
  on project_invitations for select
  to authenticated
  using (is_project_admin(project_id));

create policy "Project admins can create invitations"
  on project_invitations for insert
  to authenticated
  with check (is_project_admin(project_id) and invited_by = auth.uid());

create policy "Project admins can update invitations"
  on project_invitations for update
  to authenticated
  using (is_project_admin(project_id))
  with check (is_project_admin(project_id));

create policy "Project admins can delete invitations"
  on project_invitations for delete
  to authenticated
  using (is_project_admin(project_id));
