-- DevFlow schema migration 0009 (Phase 3)
-- Security-sensitive audit log, distinct from the general activity feed
-- (activity_events). activity_events is a product feature ("what happened
-- on this project") visible to every project member; audit_log is a
-- security/compliance record ("who did what, security-wise") visible only
-- to organization administrators.

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles (id),
  organization_id uuid references organizations (id) on delete cascade,
  project_id uuid references projects (id) on delete cascade,
  action text not null,
  target_type text not null,
  target_id uuid,
  description text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index audit_log_org_idx on audit_log (organization_id, created_at desc);
create index audit_log_actor_idx on audit_log (actor_id);
create index audit_log_action_idx on audit_log (action);

alter table audit_log enable row level security;

-- Append-only, and readable only by (a) org admins, for org/project-scoped
-- entries (role changes, membership changes, deletions), or (b) the actor
-- themselves, for account-level entries with no organization_id (login,
-- password reset) - so everyone can see their own security history without
-- exposing other users' login activity to org admins who happen to share
-- an org with them.
create policy "Org admins and the acting user can view relevant audit entries"
  on audit_log for select
  to authenticated
  using (
    (organization_id is not null and is_org_admin(organization_id))
    or actor_id = auth.uid()
  );

-- Anyone can write an audit entry for their own action (matches
-- activity_events' insert model) - the security boundary is on read, not
-- write, since every insert already records who performed the action.
create policy "Authenticated users can log their own actions"
  on audit_log for insert
  to authenticated
  with check (actor_id = auth.uid());
