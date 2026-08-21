-- DevFlow schema migration 0008 (Phase 2)
-- Task attachments: metadata table + a private Supabase Storage bucket.
--
-- Storage objects are stored at "<project_id>/<task_id>/<uuid>-<filename>"
-- so bucket-level RLS can check project membership straight from the
-- object's path via storage.foldername(), without a second lookup.

insert into storage.buckets (id, name, public)
values ('task-attachments', 'task-attachments', false)
on conflict (id) do nothing;

create table task_attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks (id) on delete cascade,
  project_id uuid not null references projects (id) on delete cascade,
  file_name text not null,
  storage_path text not null unique,
  content_type text,
  size_bytes bigint,
  uploaded_by uuid not null references profiles (id),
  created_at timestamptz not null default now()
);

create index task_attachments_task_idx on task_attachments (task_id);
create index task_attachments_project_idx on task_attachments (project_id);

alter table task_attachments enable row level security;

create policy "Project members can view task attachments"
  on task_attachments for select
  to authenticated
  using (is_project_member(project_id));

create policy "Project members can attach files to tasks"
  on task_attachments for insert
  to authenticated
  with check (is_project_member(project_id) and uploaded_by = auth.uid());

-- Same permission shape as tasks themselves (any project member can edit a
-- task, so any project member can manage its attachments too) rather than
-- restricting delete to the uploader or a project admin.
create policy "Project members can remove task attachments"
  on task_attachments for delete
  to authenticated
  using (is_project_member(project_id));

-- ---------------------------------------------------------------------------
-- Storage bucket RLS. Mirrors the table policies above, checked straight
-- from the object path's first two folder segments (project_id/task_id).
-- ---------------------------------------------------------------------------

create policy "Project members can view attachment files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'task-attachments'
    and is_project_member((storage.foldername(name))[1]::uuid)
  );

create policy "Project members can upload attachment files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'task-attachments'
    and is_project_member((storage.foldername(name))[1]::uuid)
  );

create policy "Project members can delete attachment files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'task-attachments'
    and is_project_member((storage.foldername(name))[1]::uuid)
  );
