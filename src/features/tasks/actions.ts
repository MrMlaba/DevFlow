"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/services/auth";
import { createTaskSchema, updateTaskSchema, updateTaskStatusSchema } from "@/lib/validations/task";
import { fromZodError, type FormState } from "@/lib/form-state";
import { getMyRoleForProject, getProjectById } from "@/services/projects";
import {
  createTask as createTaskService,
  deleteTask as deleteTaskService,
  getTask,
  updateTask as updateTaskService,
  updateTaskStatus as updateTaskStatusService,
} from "@/services/tasks";
import { can } from "@/config/permissions";
import type { TaskStatus } from "@/types/database";

function parseLabels(raw: string | undefined) {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function createTaskAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = createTaskSchema.safeParse({
    projectId: formData.get("projectId"),
    title: formData.get("title"),
    description: formData.get("description"),
    status: formData.get("status") || undefined,
    priority: formData.get("priority") || undefined,
    labels: formData.get("labels"),
    assigneeId: formData.get("assigneeId"),
    dueDate: formData.get("dueDate"),
  });
  if (!parsed.success) return fromZodError(parsed.error);

  const role = await getMyRoleForProject(parsed.data.projectId, user.id);
  if (!can(role, "task:create")) {
    return { status: "error", message: "You don't have permission to create tasks here." };
  }

  const project = await getProjectById(parsed.data.projectId);
  if (!project) return { status: "error", message: "Project not found." };

  try {
    await createTaskService({
      project,
      title: parsed.data.title,
      description: parsed.data.description,
      status: parsed.data.status,
      priority: parsed.data.priority,
      labels: parseLabels(parsed.data.labels),
      assigneeId: parsed.data.assigneeId || undefined,
      dueDate: parsed.data.dueDate || undefined,
      reporterId: user.id,
    });
    revalidatePath(`/projects/${project.id}/tasks`);
    revalidatePath("/tasks");
    return { status: "success", message: "Task created." };
  } catch (error) {
    return { status: "error", message: errorMessage(error) };
  }
}

export async function updateTaskAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = updateTaskSchema.safeParse({
    taskId: formData.get("taskId"),
    title: formData.get("title"),
    description: formData.get("description"),
    status: formData.get("status"),
    priority: formData.get("priority"),
    labels: formData.get("labels"),
    assigneeId: formData.get("assigneeId"),
    dueDate: formData.get("dueDate"),
  });
  if (!parsed.success) return fromZodError(parsed.error);

  const existing = await getTask(parsed.data.taskId);
  if (!existing) return { status: "error", message: "Task not found." };

  const role = await getMyRoleForProject(existing.project_id, user.id);
  if (!can(role, "task:update")) {
    return { status: "error", message: "You don't have permission to edit this task." };
  }

  const project = await getProjectById(existing.project_id);
  if (!project) return { status: "error", message: "Project not found." };

  try {
    await updateTaskService({
      project,
      taskId: parsed.data.taskId,
      title: parsed.data.title,
      description: parsed.data.description,
      status: parsed.data.status,
      priority: parsed.data.priority,
      labels: parseLabels(parsed.data.labels),
      assigneeId: parsed.data.assigneeId || undefined,
      dueDate: parsed.data.dueDate || undefined,
      actorId: user.id,
      previousAssigneeId: existing.assignee_id,
      previousStatus: existing.status,
    });
    revalidatePath(`/projects/${project.id}/tasks`);
    revalidatePath("/tasks");
    return { status: "success", message: "Task updated." };
  } catch (error) {
    return { status: "error", message: errorMessage(error) };
  }
}

export async function updateTaskStatusAction(input: {
  taskId: string;
  status: TaskStatus;
}) {
  const user = await requireUser();
  const parsed = updateTaskStatusSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid status.");

  const existing = await getTask(parsed.data.taskId);
  if (!existing) throw new Error("Task not found.");

  const role = await getMyRoleForProject(existing.project_id, user.id);
  if (!can(role, "task:update")) {
    throw new Error("You don't have permission to move this task.");
  }

  const project = await getProjectById(existing.project_id);
  if (!project) throw new Error("Project not found.");

  await updateTaskStatusService({
    project,
    taskId: parsed.data.taskId,
    title: existing.title,
    status: parsed.data.status,
    actorId: user.id,
  });

  revalidatePath(`/projects/${project.id}/tasks`);
  revalidatePath("/tasks");
}

export async function deleteTaskAction(input: { taskId: string }) {
  const user = await requireUser();
  const existing = await getTask(input.taskId);
  if (!existing) throw new Error("Task not found.");

  const role = await getMyRoleForProject(existing.project_id, user.id);
  if (!can(role, "task:delete")) {
    throw new Error("You don't have permission to delete this task.");
  }

  const project = await getProjectById(existing.project_id);
  if (!project) throw new Error("Project not found.");

  await deleteTaskService({
    project,
    taskId: input.taskId,
    title: existing.title,
    actorId: user.id,
  });

  revalidatePath(`/projects/${project.id}/tasks`);
  revalidatePath("/tasks");
}

function errorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Something went wrong. Please try again.";
}
