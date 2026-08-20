-- DevFlow schema migration 0006
-- Comments, polymorphically attached to a task or an issue.

create table comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  commentable_type commentable_type not null,
  commentable_id uuid not null,
  author_id uuid not null references profiles (id),
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index comments_project_idx on comments (project_id);
create index comments_commentable_idx on comments (commentable_type, commentable_id);

create trigger comments_set_updated_at
  before update on comments
  for each row
  execute function set_updated_at();

alter table comments enable row level security;

create policy "Project members can view comments"
  on comments for select
  to authenticated
  using (is_project_member(project_id));

create policy "Project members can create comments"
  on comments for insert
  to authenticated
  with check (is_project_member(project_id) and author_id = auth.uid());

create policy "Authors can update their own comments"
  on comments for update
  to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

create policy "Authors and project admins can delete comments"
  on comments for delete
  to authenticated
  using (author_id = auth.uid() or is_project_admin(project_id));
