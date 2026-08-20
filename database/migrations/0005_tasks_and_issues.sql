-- DevFlow schema migration 0005
-- Tasks and issues. Full Kanban (labels table, attachments, PR linking)
-- lands in Phase 2 - this is the Phase 1 MVP shape.

create table tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  title text not null,
  description text,
  status task_status not null default 'backlog',
  priority task_priority not null default 'medium',
  labels text[] not null default '{}',
  assignee_id uuid references profiles (id),
  reporter_id uuid not null references profiles (id),
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tasks_project_idx on tasks (project_id);
create index tasks_assignee_idx on tasks (assignee_id);
create index tasks_status_idx on tasks (project_id, status);

create trigger tasks_set_updated_at
  before update on tasks
  for each row
  execute function set_updated_at();

create table issues (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  title text not null,
  description text,
  status issue_status not null default 'open',
  priority issue_priority not null default 'medium',
  reporter_id uuid not null references profiles (id),
  assignee_id uuid references profiles (id),
  linked_task_id uuid references tasks (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index issues_project_idx on issues (project_id);
create index issues_assignee_idx on issues (assignee_id);
create index issues_status_idx on issues (project_id, status);

create trigger issues_set_updated_at
  before update on issues
  for each row
  execute function set_updated_at();

alter table tasks enable row level security;
alter table issues enable row level security;

create policy "Project members can view tasks"
  on tasks for select
  to authenticated
  using (is_project_member(project_id));

create policy "Project members can create tasks"
  on tasks for insert
  to authenticated
  with check (is_project_member(project_id) and reporter_id = auth.uid());

create policy "Project members can update tasks"
  on tasks for update
  to authenticated
  using (is_project_member(project_id))
  with check (is_project_member(project_id));

create policy "Project admins can delete tasks"
  on tasks for delete
  to authenticated
  using (is_project_admin(project_id));

create policy "Project members can view issues"
  on issues for select
  to authenticated
  using (is_project_member(project_id));

create policy "Project members can create issues"
  on issues for insert
  to authenticated
  with check (is_project_member(project_id) and reporter_id = auth.uid());

create policy "Project members can update issues"
  on issues for update
  to authenticated
  using (is_project_member(project_id))
  with check (is_project_member(project_id));

create policy "Project admins can delete issues"
  on issues for delete
  to authenticated
  using (is_project_admin(project_id));
