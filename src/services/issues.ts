import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";
import { logActivity } from "@/services/activity";
import type { Project } from "@/services/projects";

export type Issue = Tables<"issues"> & {
  assignee: Pick<Tables<"profiles">, "id" | "full_name" | "email" | "avatar_url"> | null;
  reporter: Pick<Tables<"profiles">, "id" | "full_name" | "email" | "avatar_url"> | null;
};

const ISSUE_SELECT =
  "*, assignee:profiles!issues_assignee_id_fkey(id, full_name, email, avatar_url), reporter:profiles!issues_reporter_id_fkey(id, full_name, email, avatar_url)";

export async function listProjectIssues(projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("issues")
    .select(ISSUE_SELECT)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as Issue[];
}

/**
 * Every issue across every project the current user belongs to. Relies on
 * RLS ("Project members can view issues") to scope the rows.
 */
export async function listVisibleIssues() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("issues")
    .select(`${ISSUE_SELECT}, project:projects(id, name, slug, organization_id)`)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as (Issue & {
    project: Pick<Project, "id" | "name" | "slug" | "organization_id">;
  })[];
}

export async function getIssue(issueId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("issues")
    .select(ISSUE_SELECT)
    .eq("id", issueId)
    .single();

  if (error) return null;
  return data as unknown as Issue;
}

export async function createIssue(input: {
  project: Project;
  title: string;
  description?: string;
  priority: Tables<"issues">["priority"];
  assigneeId?: string;
  reporterId: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("issues")
    .insert({
      project_id: input.project.id,
      title: input.title,
      description: input.description || null,
      priority: input.priority,
      assignee_id: input.assigneeId || null,
      reporter_id: input.reporterId,
    })
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    projectId: input.project.id,
    organizationId: input.project.organization_id,
    actorId: input.reporterId,
    eventType: "issue.created",
    objectType: "issue",
    objectId: data.id,
    description: `opened issue "${data.title}"`,
  });

  return data as Tables<"issues">;
}

export async function updateIssue(input: {
  project: Project;
  issueId: string;
  title: string;
  description?: string;
  status: Tables<"issues">["status"];
  priority: Tables<"issues">["priority"];
  assigneeId?: string;
  actorId: string;
  previousStatus?: Tables<"issues">["status"];
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("issues")
    .update({
      title: input.title,
      description: input.description || null,
      status: input.status,
      priority: input.priority,
      assignee_id: input.assigneeId || null,
    })
    .eq("id", input.issueId)
    .select()
    .single();

  if (error) throw error;

  const closed = input.status === "closed" || input.status === "resolved";
  const wasClosed =
    input.previousStatus === "closed" || input.previousStatus === "resolved";

  await logActivity({
    projectId: input.project.id,
    organizationId: input.project.organization_id,
    actorId: input.actorId,
    eventType:
      closed && !wasClosed
        ? "issue.closed"
        : input.previousStatus && input.previousStatus !== input.status
          ? "issue.status_changed"
          : "issue.updated",
    objectType: "issue",
    objectId: data.id,
    description:
      closed && !wasClosed
        ? `closed issue "${data.title}"`
        : `updated issue "${data.title}"`,
  });

  return data as Tables<"issues">;
}

export async function updateIssueStatus(input: {
  project: Project;
  issueId: string;
  title: string;
  status: Tables<"issues">["status"];
  previousStatus: Tables<"issues">["status"];
  actorId: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("issues")
    .update({ status: input.status })
    .eq("id", input.issueId);
  if (error) throw error;

  const closed = input.status === "closed" || input.status === "resolved";
  const wasClosed =
    input.previousStatus === "closed" || input.previousStatus === "resolved";

  await logActivity({
    projectId: input.project.id,
    organizationId: input.project.organization_id,
    actorId: input.actorId,
    eventType:
      closed && !wasClosed
        ? "issue.closed"
        : "issue.status_changed",
    objectType: "issue",
    objectId: input.issueId,
    description:
      closed && !wasClosed
        ? `closed issue "${input.title}"`
        : `moved issue "${input.title}" to ${input.status.replace("_", " ")}`,
  });
}

export async function deleteIssue(input: {
  project: Project;
  issueId: string;
  title: string;
  actorId: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("issues").delete().eq("id", input.issueId);
  if (error) throw error;

  await logActivity({
    projectId: input.project.id,
    organizationId: input.project.organization_id,
    actorId: input.actorId,
    eventType: "issue.deleted",
    objectType: "issue",
    objectId: input.issueId,
    description: `deleted issue "${input.title}"`,
  });
}
