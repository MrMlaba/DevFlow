import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";
import { logActivity } from "@/services/activity";
import type { Project } from "@/services/projects";

export type TaskAttachment = Tables<"task_attachments"> & {
  uploader: Pick<Tables<"profiles">, "id" | "full_name" | "email"> | null;
};

const BUCKET = "task-attachments";
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10MB

export async function listTaskAttachments(taskId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("task_attachments")
    .select(
      "*, uploader:profiles!task_attachments_uploaded_by_fkey(id, full_name, email)",
    )
    .eq("task_id", taskId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as TaskAttachment[];
}

export async function uploadTaskAttachment(input: {
  project: Project;
  taskId: string;
  taskTitle: string;
  file: File;
  uploadedBy: string;
}) {
  const supabase = await createClient();
  const storagePath = `${input.project.id}/${input.taskId}/${crypto.randomUUID()}-${input.file.name}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, input.file, {
      contentType: input.file.type || undefined,
    });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from("task_attachments")
    .insert({
      task_id: input.taskId,
      project_id: input.project.id,
      file_name: input.file.name,
      storage_path: storagePath,
      content_type: input.file.type || null,
      size_bytes: input.file.size,
      uploaded_by: input.uploadedBy,
    })
    .select()
    .single();

  if (error) {
    // Metadata insert failed - don't leave an orphaned file in storage.
    await supabase.storage.from(BUCKET).remove([storagePath]);
    throw error;
  }

  await logActivity({
    projectId: input.project.id,
    organizationId: input.project.organization_id,
    actorId: input.uploadedBy,
    eventType: "task.attachment_added",
    objectType: "task",
    objectId: input.taskId,
    description: `attached "${input.file.name}" to task "${input.taskTitle}"`,
  });

  return data as Tables<"task_attachments">;
}

export async function deleteTaskAttachment(input: {
  project: Project;
  attachment: Tables<"task_attachments">;
  taskTitle: string;
  actorId: string;
}) {
  const supabase = await createClient();
  const { error: deleteRowError } = await supabase
    .from("task_attachments")
    .delete()
    .eq("id", input.attachment.id);
  if (deleteRowError) throw deleteRowError;

  await supabase.storage.from(BUCKET).remove([input.attachment.storage_path]);

  await logActivity({
    projectId: input.project.id,
    organizationId: input.project.organization_id,
    actorId: input.actorId,
    eventType: "task.attachment_removed",
    objectType: "task",
    objectId: input.attachment.task_id,
    description: `removed attachment "${input.attachment.file_name}" from task "${input.taskTitle}"`,
  });
}

/** Bucket is private, so every download needs a freshly signed, short-lived URL. */
export async function getAttachmentDownloadUrl(storagePath: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 60);
  if (error) throw error;
  return data.signedUrl;
}
