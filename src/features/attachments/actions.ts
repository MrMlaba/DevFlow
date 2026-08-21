"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/services/auth";
import { getMyRoleForProject, getProjectById } from "@/services/projects";
import { getTask } from "@/services/tasks";
import {
  deleteTaskAttachment as deleteTaskAttachmentService,
  getAttachmentDownloadUrl,
  listTaskAttachments,
  MAX_ATTACHMENT_BYTES,
  uploadTaskAttachment as uploadTaskAttachmentService,
} from "@/services/attachments";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/config/permissions";
import { fromZodError, type FormState } from "@/lib/form-state";
import { z } from "zod";

const uploadSchema = z.object({
  taskId: z.string().uuid(),
});

export async function listTaskAttachmentsAction(taskId: string) {
  await requireUser();
  return listTaskAttachments(taskId);
}

export async function uploadTaskAttachmentAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = uploadSchema.safeParse({ taskId: formData.get("taskId") });
  if (!parsed.success) return fromZodError(parsed.error);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Choose a file to upload." };
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return { status: "error", message: "Files must be 10MB or smaller." };
  }

  const task = await getTask(parsed.data.taskId);
  if (!task) return { status: "error", message: "Task not found." };

  const role = await getMyRoleForProject(task.project_id, user.id);
  if (!can(role, "task:update")) {
    return { status: "error", message: "You don't have permission to attach files here." };
  }

  const project = await getProjectById(task.project_id);
  if (!project) return { status: "error", message: "Project not found." };

  try {
    await uploadTaskAttachmentService({
      project,
      taskId: task.id,
      taskTitle: task.title,
      file,
      uploadedBy: user.id,
    });
    revalidatePath(`/projects/${project.id}/tasks`);
    return { status: "success" };
  } catch (error) {
    if (error && typeof error === "object" && "message" in error) {
      return { status: "error", message: String((error as { message: unknown }).message) };
    }
    return { status: "error", message: "Upload failed. Please try again." };
  }
}

export async function deleteTaskAttachmentAction(input: { attachmentId: string }) {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: attachment, error } = await supabase
    .from("task_attachments")
    .select("*")
    .eq("id", input.attachmentId)
    .single();
  if (error || !attachment) throw new Error("Attachment not found.");

  const role = await getMyRoleForProject(attachment.project_id, user.id);
  if (!can(role, "task:update")) {
    throw new Error("You don't have permission to remove this attachment.");
  }

  const project = await getProjectById(attachment.project_id);
  if (!project) throw new Error("Project not found.");

  const task = await getTask(attachment.task_id);

  await deleteTaskAttachmentService({
    project,
    attachment,
    taskTitle: task?.title ?? "task",
    actorId: user.id,
  });

  revalidatePath(`/projects/${project.id}/tasks`);
}

export async function getAttachmentDownloadUrlAction(storagePath: string) {
  await requireUser();
  return getAttachmentDownloadUrl(storagePath);
}
