import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";
import { logActivity } from "@/services/activity";
import type { Project } from "@/services/projects";

export type Task = Tables<"tasks"> & {
  assignee: Pick<Tables<"profiles">, "id" | "full_name" | "email" | "avatar_url"> | null;
  reporter: Pick<Tables<"profiles">, "id" | "full_name" | "email" | "avatar_url"> | null;
};

const TASK_SELECT =
  "*, assignee:profiles!tasks_assignee_id_fkey(id, full_name, email, avatar_url), reporter:profiles!tasks_reporter_id_fkey(id, full_name, email, avatar_url)";

export async function listProjectTasks(projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_SELECT)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as Task[];
}

/**
 * Every task across every project the current user belongs to. Relies on
 * RLS ("Project members can view tasks") to scope the rows - no manual
 * project filter needed.
 */
export async function listVisibleTasks() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(`${TASK_SELECT}, project:projects(id, name, slug, organization_id)`)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as (Task & {
    project: Pick<Project, "id" | "name" | "slug" | "organization_id">;
  })[];
}

/** Tasks assigned to the current user, across every project they're on. */
export async function listMyTasks(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(`${TASK_SELECT}, project:projects(id, name, slug, organization_id)`)
    .eq("assignee_id", userId)
    .order("due_date", { ascending: true, nullsFirst: false });

  if (error) throw error;
  return (data ?? []) as unknown as (Task & {
    project: Pick<Project, "id" | "name" | "slug" | "organization_id">;
  })[];
}

export async function getTask(taskId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_SELECT)
    .eq("id", taskId)
    .single();

  if (error) return null;
  return data as unknown as Task;
}

export async function createTask(input: {
  project: Project;
  title: string;
  description?: string;
  status: Tables<"tasks">["status"];
  priority: Tables<"tasks">["priority"];
  labels: string[];
  assigneeId?: string;
  dueDate?: string;
  reporterId: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      project_id: input.project.id,
      title: input.title,
      description: input.description || null,
      status: input.status,
      priority: input.priority,
      labels: input.labels,
      assignee_id: input.assigneeId || null,
      due_date: input.dueDate || null,
      reporter_id: input.reporterId,
    })
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    projectId: input.project.id,
    organizationId: input.project.organization_id,
    actorId: input.reporterId,
    eventType: "task.created",
    objectType: "task",
    objectId: data.id,
    description: `created task "${data.title}"`,
  });

  return data as Tables<"tasks">;
}

export async function updateTask(input: {
  project: Project;
  taskId: string;
  title: string;
  description?: string;
  status: Tables<"tasks">["status"];
  priority: Tables<"tasks">["priority"];
  labels: string[];
  assigneeId?: string;
  dueDate?: string;
  actorId: string;
  previousAssigneeId?: string | null;
  previousStatus?: Tables<"tasks">["status"];
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .update({
      title: input.title,
      description: input.description || null,
      status: input.status,
      priority: input.priority,
      labels: input.labels,
      assignee_id: input.assigneeId || null,
      due_date: input.dueDate || null,
    })
    .eq("id", input.taskId)
    .select()
    .single();

  if (error) throw error;

  if (input.previousStatus && input.previousStatus !== input.status) {
    await logActivity({
      projectId: input.project.id,
      organizationId: input.project.organization_id,
      actorId: input.actorId,
      eventType:
        input.status === "done" ? "task.completed" : "task.status_changed",
      objectType: "task",
      objectId: data.id,
      description: `moved task "${data.title}" to ${input.status.replace("_", " ")}`,
    });
  } else {
    await logActivity({
      projectId: input.project.id,
      organizationId: input.project.organization_id,
      actorId: input.actorId,
      eventType: "task.updated",
      objectType: "task",
      objectId: data.id,
      description: `updated task "${data.title}"`,
    });
  }

  if (input.assigneeId && input.assigneeId !== input.previousAssigneeId) {
    await logActivity({
      projectId: input.project.id,
      organizationId: input.project.organization_id,
      actorId: input.actorId,
      eventType: "task.assigned",
      objectType: "task",
      objectId: data.id,
      description: `assigned task "${data.title}"`,
    });
  }

  return data as Tables<"tasks">;
}

export async function updateTaskStatus(input: {
  project: Project;
  taskId: string;
  title: string;
  status: Tables<"tasks">["status"];
  actorId: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ status: input.status })
    .eq("id", input.taskId);
  if (error) throw error;

  await logActivity({
    projectId: input.project.id,
    organizationId: input.project.organization_id,
    actorId: input.actorId,
    eventType: input.status === "done" ? "task.completed" : "task.status_changed",
    objectType: "task",
    objectId: input.taskId,
    description: `moved task "${input.title}" to ${input.status.replace("_", " ")}`,
  });
}

export async function deleteTask(input: {
  project: Project;
  taskId: string;
  title: string;
  actorId: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", input.taskId);
  if (error) throw error;

  await logActivity({
    projectId: input.project.id,
    organizationId: input.project.organization_id,
    actorId: input.actorId,
    eventType: "task.deleted",
    objectType: "task",
    objectId: input.taskId,
    description: `deleted task "${input.title}"`,
  });
}
