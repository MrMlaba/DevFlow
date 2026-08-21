"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/services/auth";
import { createCommentSchema } from "@/lib/validations/comment";
import { fromZodError, type FormState } from "@/lib/form-state";
import { getProjectById } from "@/services/projects";
import {
  createComment as createCommentService,
  deleteComment as deleteCommentService,
  listComments,
} from "@/services/comments";
import { getTask } from "@/services/tasks";
import { getIssue } from "@/services/issues";
import type { CommentableType } from "@/types/database";

export async function getCommentsAction(
  commentableType: CommentableType,
  commentableId: string,
) {
  await requireUser();
  return listComments(commentableType, commentableId);
}

export async function createCommentAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = createCommentSchema.safeParse({
    projectId: formData.get("projectId"),
    commentableType: formData.get("commentableType"),
    commentableId: formData.get("commentableId"),
    body: formData.get("body"),
  });
  if (!parsed.success) return fromZodError(parsed.error);

  const project = await getProjectById(parsed.data.projectId);
  if (!project) return { status: "error", message: "Project not found." };

  const object =
    parsed.data.commentableType === "task"
      ? await getTask(parsed.data.commentableId)
      : await getIssue(parsed.data.commentableId);
  if (!object) return { status: "error", message: "Not found." };

  try {
    await createCommentService({
      project,
      commentableType: parsed.data.commentableType,
      commentableId: parsed.data.commentableId,
      objectTitle: object.title,
      body: parsed.data.body,
      authorId: user.id,
    });

    const basePath =
      parsed.data.commentableType === "task"
        ? `/projects/${project.id}/tasks`
        : `/projects/${project.id}/issues`;
    revalidatePath(basePath);
    return { status: "success" };
  } catch (error) {
    if (error && typeof error === "object" && "message" in error) {
      return { status: "error", message: String((error as { message: unknown }).message) };
    }
    return { status: "error", message: "Couldn't post comment." };
  }
}

export async function deleteCommentAction(input: {
  commentId: string;
  projectId: string;
  commentableType: "task" | "issue";
}) {
  const user = await requireUser();
  const project = await getProjectById(input.projectId);
  if (!project) throw new Error("Project not found.");

  await deleteCommentService({
    commentId: input.commentId,
    project,
    actorId: user.id,
  });

  const basePath =
    input.commentableType === "task"
      ? `/projects/${input.projectId}/tasks`
      : `/projects/${input.projectId}/issues`;
  revalidatePath(basePath);
}
