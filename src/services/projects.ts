import "server-only";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { AppRole, Tables } from "@/types/database";
import { logActivity } from "@/services/activity";
import { getCurrentUser } from "@/services/auth";

export type Project = Tables<"projects">;
export type ProjectMember = Tables<"project_members"> & {
  profile: Pick<Tables<"profiles">, "id" | "full_name" | "email" | "avatar_url">;
};

export interface ProjectWithRole {
  project: Project;
  role: AppRole;
}

export async function listUserProjects(): Promise<ProjectWithRole[]> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return [];

  // Filter by user_id explicitly rather than relying on RLS to scope this
  // to "my membership rows": is_project_member(project_id) only checks
  // whether the current user belongs to that project, not whether a given
  // row is theirs - so an unfiltered select returns every member's row
  // for every project you're on, not just your own.
  const { data, error } = await supabase
    .from("project_members")
    .select("role, project:projects(*)")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false });

  if (error) throw error;
  return (data ?? [])
    .filter((row) => row.project)
    .map((row) => ({
      role: row.role as AppRole,
      project: row.project as unknown as Project,
    }));
}

export async function getProjectBySlug(organizationId: string, slug: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("slug", slug)
    .single();

  if (error) return null;
  return data as Project;
}

export const getProjectById = cache(async (id: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return data as Project;
});

export const getMyRoleForProject = cache(
  async (projectId: string, userId: string): Promise<AppRole | null> => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("project_members")
      .select("role")
      .eq("project_id", projectId)
      .eq("user_id", userId)
      .maybeSingle();

    return (data?.role as AppRole) ?? null;
  },
);

export async function listProjectMembers(projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_members")
    .select(
      "*, profile:profiles!project_members_user_id_fkey(id, full_name, email, avatar_url)",
    )
    .eq("project_id", projectId)
    .order("joined_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as ProjectMember[];
}

export async function createProject(input: {
  organizationId: string;
  name: string;
  slug: string;
  description?: string;
  repositoryUrl?: string;
  techStack: string[];
  userId: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .insert({
      organization_id: input.organizationId,
      name: input.name,
      slug: input.slug,
      description: input.description || null,
      repository_url: input.repositoryUrl || null,
      tech_stack: input.techStack,
      created_by: input.userId,
    })
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    projectId: data.id,
    organizationId: input.organizationId,
    actorId: input.userId,
    eventType: "project.created",
    objectType: "project",
    objectId: data.id,
    description: `created the project "${data.name}"`,
  });

  return data as Project;
}

export async function updateProject(input: {
  projectId: string;
  actorId: string;
  name: string;
  description?: string;
  repositoryUrl?: string;
  techStack: string[];
  status: Project["status"];
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .update({
      name: input.name,
      description: input.description || null,
      repository_url: input.repositoryUrl || null,
      tech_stack: input.techStack,
      status: input.status,
    })
    .eq("id", input.projectId)
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    projectId: data.id,
    organizationId: data.organization_id,
    actorId: input.actorId,
    eventType: "project.updated",
    objectType: "project",
    objectId: data.id,
    description: `updated the project "${data.name}"`,
  });

  return data as Project;
}

export interface ProjectStats {
  tasksTotal: number;
  tasksCompleted: number;
  issuesOpen: number;
  activeMembers: number;
}

export async function getProjectStats(projectId: string): Promise<ProjectStats> {
  const supabase = await createClient();

  const [tasksTotal, tasksCompleted, issuesOpen, activeMembers] =
    await Promise.all([
      supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("project_id", projectId),
      supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("project_id", projectId)
        .eq("status", "done"),
      supabase
        .from("issues")
        .select("id", { count: "exact", head: true })
        .eq("project_id", projectId)
        .in("status", ["open", "in_progress"]),
      supabase
        .from("project_members")
        .select("id", { count: "exact", head: true })
        .eq("project_id", projectId),
    ]);

  return {
    tasksTotal: tasksTotal.count ?? 0,
    tasksCompleted: tasksCompleted.count ?? 0,
    issuesOpen: issuesOpen.count ?? 0,
    activeMembers: activeMembers.count ?? 0,
  };
}
