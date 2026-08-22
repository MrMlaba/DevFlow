-- DevFlow schema migration 0011
-- Phase 16: incident management. Enum types land here rather than in
-- migration 0001 - that migration is long since applied to the live
-- database, so a new feature's types go with the migration that
-- introduces them, same as production schema evolution actually works.

create type incident_severity as enum (
  'low',
  'medium',
  'high',
  'critical'
);

create type incident_status as enum (
  'investigating',
  'identified',
  'monitoring',
  'resolved'
);

create table incidents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  title text not null,
  description text,
  -- Free text, not a foreign key: DevFlow is one app, not a microservice
  -- fleet, so there's no "services" table to reference - this just labels
  -- which part of the system was affected ("GitHub sync", "Database").
  service text,
  severity incident_severity not null default 'medium',
  status incident_status not null default 'investigating',
  reporter_id uuid not null references profiles (id),
  assignee_id uuid references profiles (id),
  -- Free text, not a foreign key: deployments aren't a DevFlow-owned table
  -- (Phase 10 reads them live from Vercel/GitHub APIs) - a SHA, tag, or
  -- deployment URL typed in here is the closest thing to a link that
  -- doesn't require deployments to become rows in this database.
  related_deployment text,
  root_cause text,
  resolution text,
  detected_at timestamptz not null default now(),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index incidents_project_idx on incidents (project_id);
create index incidents_status_idx on incidents (project_id, status);
create index incidents_assignee_idx on incidents (assignee_id);

create trigger incidents_set_updated_at
  before update on incidents
  for each row
  execute function set_updated_at();

-- Structured timeline, not comments: a status/severity change and a
-- free-text note are different things worth telling apart when computing
-- MTTR or just reading back what happened, which a generic comment
-- thread (migration 0006) doesn't capture.
create table incident_updates (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references incidents (id) on delete cascade,
  -- Denormalized from incidents.project_id, same reasoning as
  -- comments.project_id (migration 0006) - keeps RLS a direct check
  -- instead of a join on every read.
  project_id uuid not null references projects (id) on delete cascade,
  author_id uuid not null references profiles (id),
  message text not null,
  previous_status incident_status,
  new_status incident_status,
  previous_severity incident_severity,
  new_severity incident_severity,
  created_at timestamptz not null default now()
);

create index incident_updates_incident_idx on incident_updates (incident_id, created_at);

alter table incidents enable row level security;
alter table incident_updates enable row level security;

create policy "Project members can view incidents"
  on incidents for select
  to authenticated
  using (is_project_member(project_id));

create policy "Project members can create incidents"
  on incidents for insert
  to authenticated
  with check (is_project_member(project_id) and reporter_id = auth.uid());

create policy "Project members can update incidents"
  on incidents for update
  to authenticated
  using (is_project_member(project_id))
  with check (is_project_member(project_id));

create policy "Project admins can delete incidents"
  on incidents for delete
  to authenticated
  using (is_project_admin(project_id));

-- Append-only, same reasoning as activity_events (migration 0007): no
-- update/delete policy, so the timeline can't be edited after the fact.
create policy "Project members can view incident updates"
  on incident_updates for select
  to authenticated
  using (is_project_member(project_id));

create policy "Project members can add incident updates"
  on incident_updates for insert
  to authenticated
  with check (is_project_member(project_id) and author_id = auth.uid());
