-- DevFlow schema migration 0010 (Phase 4)
-- GitHub integration: a user's connected GitHub account (OAuth), the repo
-- connected to a project, and local caches of commits/pull requests kept
-- in sync by webhooks + a manual "sync now" action.
--
-- Branches, contributors, releases, and GitHub issues are NOT persisted
-- here - they're fetched live from the GitHub API when a project's
-- Overview tab renders (see src/lib/github.ts). Only commits and pull
-- requests get dedicated pages and local tables, per the spec, and pull
-- requests need a stable local row to attach linked_task_id to anyway.

create table github_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references profiles (id) on delete cascade,
  github_user_id bigint not null,
  github_username text not null,
  avatar_url text,
  access_token text not null,
  scope text,
  connected_at timestamptz not null default now()
);

comment on column github_accounts.access_token is 'OAuth access token, stored as-is (no at-rest encryption yet - see docs/security.md). Never sent to the client.';

alter table github_accounts enable row level security;

create policy "Users can view their own GitHub connection"
  on github_accounts for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can manage their own GitHub connection"
  on github_accounts for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create table project_repositories (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references projects (id) on delete cascade,
  repo_id bigint not null,
  owner text not null,
  name text not null,
  full_name text not null unique,
  default_branch text not null default 'main',
  private boolean not null default false,
  html_url text not null,
  webhook_id bigint,
  webhook_secret text not null,
  connected_by uuid not null references profiles (id),
  created_at timestamptz not null default now()
);

create index project_repositories_project_idx on project_repositories (project_id);

alter table project_repositories enable row level security;

create policy "Project members can view the connected repository"
  on project_repositories for select
  to authenticated
  using (is_project_member(project_id));

-- Insert/update/delete happen through Server Actions using the admin
-- client (see src/services/github.ts) - connecting a repo requires
-- calling the GitHub API to register a webhook, which the action layer
-- does before writing this row, so there's no meaningful RLS-expressible
-- "write" boundary here beyond project:update, already checked in the
-- action.

create table github_commits (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  sha text not null,
  message text not null,
  author_name text not null,
  author_login text,
  author_avatar_url text,
  html_url text not null,
  committed_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (project_id, sha)
);

create index github_commits_project_idx on github_commits (project_id, committed_at desc);

alter table github_commits enable row level security;

create policy "Project members can view commits"
  on github_commits for select
  to authenticated
  using (is_project_member(project_id));

create table github_pull_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  number integer not null,
  title text not null,
  state text not null default 'open',
  is_merged boolean not null default false,
  author_login text not null,
  author_avatar_url text,
  source_branch text not null,
  target_branch text not null,
  additions integer not null default 0,
  deletions integer not null default 0,
  changed_files integer not null default 0,
  html_url text not null,
  linked_task_id uuid references tasks (id) on delete set null,
  github_created_at timestamptz not null,
  github_updated_at timestamptz not null,
  merged_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (project_id, number)
);

create index github_pull_requests_project_idx on github_pull_requests (project_id, github_updated_at desc);

alter table github_pull_requests enable row level security;

create policy "Project members can view pull requests"
  on github_pull_requests for select
  to authenticated
  using (is_project_member(project_id));

-- Linking a PR to a task is the one user-editable field on this table -
-- everything else is system-synced. Any project member can (un)link,
-- matching how task editing itself works.
create policy "Project members can link pull requests to tasks"
  on github_pull_requests for update
  to authenticated
  using (is_project_member(project_id))
  with check (is_project_member(project_id));
