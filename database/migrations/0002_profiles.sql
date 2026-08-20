-- DevFlow schema migration 0002
-- Profiles: one row per auth.users, holds public-facing user data.

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  bio text,
  is_platform_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table profiles is 'Public profile data mirrored from auth.users. is_platform_admin grants super-admin access across all organizations (distinct from the per-org "administrator" app_role).';

-- Shared trigger function: keep updated_at current on every row update.
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on profiles
  for each row
  execute function set_updated_at();

-- Auto-provision a profile row whenever a new auth user is created.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function handle_new_user();

alter table profiles enable row level security;

create policy "Profiles are viewable by any authenticated user"
  on profiles for select
  to authenticated
  using (true);

create policy "Users can update their own profile"
  on profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);
