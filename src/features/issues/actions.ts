"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/services/auth";
import {
  createIssueSchema,
  updateIssueLinkedTaskSchema,
  updateIssueSchema,
  updateIssueStatusSchema,
} from "@/lib/validations/issue";
import { fromZodError, type FormState } from "@/lib/form-state";
import { getMyRoleForProject, getProjectById } from "@/services/projects";
import {
  createIssue as createIssueService,
  deleteIssue as deleteIssueService,
  getIssue,
  listIssuesLinkedToTask,
  updateIssue as updateIssueService,
  updateIssueLinkedTask as updateIssueLinkedTaskService,
  updateIssueStatus as updateIssueStatusService,
} from "@/services/issues";
import { can } from "@/config/permissions";
import type { IssueStatus } from "@/types/database";

export async function createIssueAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = createIssueSchema.safeParse({
    projectId: formData.get("projectId"),
    title: formData.get("title"),
    description: formData.get("description"),
    priority: formData.get("priority") || undefined,
    assigneeId: formData.get("assigneeId"),
    linkedTaskId: formData.get("linkedTaskId"),
  });
  if (!parsed.success) return fromZodError(parsed.error);

  const role = await getMyRoleForProject(parsed.data.projectId, user.id);
  if (!can(role, "issue:create")) {
    return { status: "error", message: "You don't have permission to open issues here." };
  }

  const project = await getProjectById(parsed.data.projectId);
  if (!project) return { status: "error", message: "Project not found." };

  try {
    await createIssueService({
      project,
      title: parsed.data.title,
      description: parsed.data.description,
      priority: parsed.data.priority,
      assigneeId: parsed.data.assigneeId || undefined,
      linkedTaskId: parsed.data.linkedTaskId || undefined,
      reporterId: user.id,
    });
    revalidatePath(`/projects/${project.id}/issues`);
    revalidatePath("/issues");
    return { status: "success", message: "Issue opened." };
  } catch (error) {
    return { status: "error", message: errorMessage(error) };
  }
}

export async function updateIssueAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = updateIssueSchema.safeParse({
    issueId: formData.get("issueId"),
    title: formData.get("title"),
    description: formData.get("description"),
    status: formData.get("status"),
    priority: formData.get("priority"),
    assigneeId: formData.get("assigneeId"),
  });
  if (!parsed.success) return fromZodError(parsed.error);

  const existing = await getIssue(parsed.data.issueId);
  if (!existing) return { status: "error", message: "Issue not found." };

  const role = await getMyRoleForProject(existing.project_id, user.id);
  if (!can(role, "issue:update")) {
    return { status: "error", message: "You don't have permission to edit this issue." };
  }

  const project = await getProjectById(existing.project_id);
  if (!project) return { status: "error", message: "Project not found." };

  try {
    await updateIssueService({
      project,
      issueId: parsed.data.issueId,
      title: parsed.data.title,
      description: parsed.data.description,
      status: parsed.data.status,
      priority: parsed.data.priority,
      assigneeId: parsed.data.assigneeId || undefined,
      actorId: user.id,
      previousStatus: existing.status,
    });
    revalidatePath(`/projects/${project.id}/issues`);
    revalidatePath("/issues");
    return { status: "success", message: "Issue updated." };
  } catch (error) {
    return { status: "error", message: errorMessage(error) };
  }
}

export async function listIssuesLinkedToTaskAction(taskId: string) {
  await requireUser();
  return listIssuesLinkedToTask(taskId);
}

export async function updateIssueStatusAction(input: {
  issueId: string;
  status: IssueStatus;
}) {
  const user = await requireUser();
  const parsed = updateIssueStatusSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid status.");

  const existing = await getIssue(parsed.data.issueId);
  if (!existing) throw new Error("Issue not found.");

  const role = await getMyRoleForProject(existing.project_id, user.id);
  if (!can(role, "issue:update")) {
    throw new Error("You don't have permission to update this issue.");
  }

  const project = await getProjectById(existing.project_id);
  if (!project) throw new Error("Project not found.");

  await updateIssueStatusService({
    project,
    issueId: parsed.data.issueId,
    title: existing.title,
    status: parsed.data.status,
    previousStatus: existing.status,
    actorId: user.id,
  });

  revalidatePath(`/projects/${project.id}/issues`);
  revalidatePath("/issues");
}

export async function updateIssueLinkedTaskAction(input: {
  issueId: string;
  linkedTaskId: string | null;
}) {
  const user = await requireUser();
  const parsed = updateIssueLinkedTaskSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid task link.");

  const existing = await getIssue(parsed.data.issueId);
  if (!existing) throw new Error("Issue not found.");

  const role = await getMyRoleForProject(existing.project_id, user.id);
  if (!can(role, "issue:update")) {
    throw new Error("You don't have permission to update this issue.");
  }

  const project = await getProjectById(existing.project_id);
  if (!project) throw new Error("Project not found.");

  await updateIssueLinkedTaskService({
    project,
    issueId: parsed.data.issueId,
    title: existing.title,
    linkedTaskId: parsed.data.linkedTaskId,
    actorId: user.id,
  });

  revalidatePath(`/projects/${project.id}/issues`);
  revalidatePath(`/projects/${project.id}/tasks`);
}

export async function deleteIssueAction(input: { issueId: string }) {
  const user = await requireUser();
  const existing = await getIssue(input.issueId);
  if (!existing) throw new Error("Issue not found.");

  const role = await getMyRoleForProject(existing.project_id, user.id);
  if (!can(role, "issue:delete")) {
    throw new Error("You don't have permission to delete this issue.");
  }

  const project = await getProjectById(existing.project_id);
  if (!project) throw new Error("Project not found.");

  await deleteIssueService({
    project,
    issueId: input.issueId,
    title: existing.title,
    actorId: user.id,
  });

  revalidatePath(`/projects/${project.id}/issues`);
  revalidatePath("/issues");
}

function errorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Something went wrong. Please try again.";
}
