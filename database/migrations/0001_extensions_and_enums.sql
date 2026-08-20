-- DevFlow schema migration 0001
-- Extensions and shared enum types.

create extension if not exists "pgcrypto";

-- Single role enum shared by organization_members and project_members.
-- "administrator" is an organization-wide role; the other four are typically
-- assigned per-project. See docs/database.md for the full RBAC model.
create type app_role as enum (
  'administrator',
  'project_owner',
  'developer',
  'reviewer',
  'lecturer'
);

create type project_status as enum (
  'planning',
  'active',
  'on_hold',
  'completed',
  'archived'
);

create type task_status as enum (
  'backlog',
  'todo',
  'in_progress',
  'code_review',
  'testing',
  'blocked',
  'done'
);

create type task_priority as enum (
  'low',
  'medium',
  'high',
  'urgent'
);

create type issue_status as enum (
  'open',
  'in_progress',
  'resolved',
  'closed',
  'wont_fix'
);

create type issue_priority as enum (
  'low',
  'medium',
  'high',
  'critical'
);

create type invitation_status as enum (
  'pending',
  'accepted',
  'revoked',
  'expired'
);

create type commentable_type as enum (
  'task',
  'issue'
);
