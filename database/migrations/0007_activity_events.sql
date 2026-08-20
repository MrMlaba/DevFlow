-- DevFlow schema migration 0007
-- Centralized activity feed. Every significant action in DevFlow writes a
-- row here (see src/services/activity.ts). Rows are append-only: no update
-- or delete policies are defined, so the feed can't be edited after the
-- fact. The dedicated security audit log (login events, permission/role
-- changes, deletions) is introduced in Phase 3.

create table activity_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects (id) on delete cascade,
  organization_id uuid references organizations (id) on delete cascade,
  actor_id uuid references profiles (id),
  event_type text not null,
  object_type text not null,
  object_id uuid,
  description text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index activity_events_project_idx on activity_events (project_id, created_at desc);
create index activity_events_org_idx on activity_events (organization_id, created_at desc);
create index activity_events_actor_idx on activity_events (actor_id);
create index activity_events_event_type_idx on activity_events (event_type);

alter table activity_events enable row level security;

create policy "Project members can view project activity"
  on activity_events for select
  to authenticated
  using (
    (project_id is not null and is_project_member(project_id))
    or (project_id is null and organization_id is not null and is_org_member(organization_id))
  );

create policy "Project members can log activity"
  on activity_events for insert
  to authenticated
  with check (
    actor_id = auth.uid()
    and (
      (project_id is not null and is_project_member(project_id))
      or (project_id is null and organization_id is not null and is_org_member(organization_id))
    )
  );
