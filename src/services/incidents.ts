import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";
import { logActivity } from "@/services/activity";
import { logAudit } from "@/services/audit";
import type { Project } from "@/services/projects";

export type Incident = Tables<"incidents"> & {
  assignee: Pick<Tables<"profiles">, "id" | "full_name" | "email" | "avatar_url"> | null;
  reporter: Pick<Tables<"profiles">, "id" | "full_name" | "email" | "avatar_url"> | null;
};

export type IncidentUpdate = Tables<"incident_updates"> & {
  author: Pick<Tables<"profiles">, "id" | "full_name" | "email" | "avatar_url"> | null;
};

const INCIDENT_SELECT =
  "*, assignee:profiles!incidents_assignee_id_fkey(id, full_name, email, avatar_url), reporter:profiles!incidents_reporter_id_fkey(id, full_name, email, avatar_url)";

/** Every incident across every project the current user belongs to. Relies on RLS to scope the rows. */
export async function listVisibleIncidents() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("incidents")
    .select(`${INCIDENT_SELECT}, project:projects(id, name, slug, organization_id)`)
    .order("detected_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as (Incident & {
    project: Pick<Project, "id" | "name" | "slug" | "organization_id">;
  })[];
}

export async function getIncident(incidentId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("incidents")
    .select(INCIDENT_SELECT)
    .eq("id", incidentId)
    .single();

  if (error) return null;
  return data as unknown as Incident;
}

export async function listIncidentUpdates(incidentId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("incident_updates")
    .select("*, author:profiles!incident_updates_author_id_fkey(id, full_name, email, avatar_url)")
    .eq("incident_id", incidentId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as IncidentUpdate[];
}

export async function createIncident(input: {
  project: Project;
  title: string;
  description?: string;
  service?: string;
  severity: Tables<"incidents">["severity"];
  relatedDeployment?: string;
  reporterId: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("incidents")
    .insert({
      project_id: input.project.id,
      title: input.title,
      description: input.description || null,
      service: input.service || null,
      severity: input.severity,
      related_deployment: input.relatedDeployment || null,
      reporter_id: input.reporterId,
    })
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    projectId: input.project.id,
    organizationId: input.project.organization_id,
    actorId: input.reporterId,
    eventType: "incident.created",
    objectType: "incident",
    objectId: data.id,
    description: `reported incident "${data.title}"`,
  });

  return data as Tables<"incidents">;
}

export async function updateIncidentStatus(input: {
  project: Project;
  incidentId: string;
  title: string;
  status: Tables<"incidents">["status"];
  previousStatus: Tables<"incidents">["status"];
  actorId: string;
}) {
  const supabase = await createClient();
  const resolved = input.status === "resolved";

  const { error } = await supabase
    .from("incidents")
    .update({
      status: input.status,
      resolved_at: resolved ? new Date().toISOString() : null,
    })
    .eq("id", input.incidentId);
  if (error) throw error;

  await supabase.from("incident_updates").insert({
    incident_id: input.incidentId,
    project_id: input.project.id,
    author_id: input.actorId,
    message: `Status changed from ${input.previousStatus} to ${input.status}.`,
    previous_status: input.previousStatus,
    new_status: input.status,
  });

  await logActivity({
    projectId: input.project.id,
    organizationId: input.project.organization_id,
    actorId: input.actorId,
    eventType: resolved ? "incident.resolved" : "incident.status_changed",
    objectType: "incident",
    objectId: input.incidentId,
    description: resolved
      ? `resolved incident "${input.title}"`
      : `moved incident "${input.title}" to ${input.status}`,
  });
}

export async function updateIncidentAssignee(input: {
  project: Project;
  incidentId: string;
  title: string;
  assigneeId: string | null;
  actorId: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("incidents")
    .update({ assignee_id: input.assigneeId })
    .eq("id", input.incidentId);
  if (error) throw error;

  await logActivity({
    projectId: input.project.id,
    organizationId: input.project.organization_id,
    actorId: input.actorId,
    eventType: "incident.updated",
    objectType: "incident",
    objectId: input.incidentId,
    description: input.assigneeId
      ? `assigned incident "${input.title}"`
      : `unassigned incident "${input.title}"`,
  });
}

export async function addIncidentUpdate(input: {
  project: Project;
  incidentId: string;
  title: string;
  message: string;
  previousSeverity?: Tables<"incidents">["severity"];
  newSeverity?: Tables<"incidents">["severity"];
  rootCause?: string;
  resolution?: string;
  actorId: string;
}) {
  const supabase = await createClient();

  const patch: Partial<Tables<"incidents">> = {};
  if (input.newSeverity) patch.severity = input.newSeverity;
  if (input.rootCause) patch.root_cause = input.rootCause;
  if (input.resolution) patch.resolution = input.resolution;

  if (Object.keys(patch).length > 0) {
    const { error } = await supabase.from("incidents").update(patch).eq("id", input.incidentId);
    if (error) throw error;
  }

  const { error: updateError } = await supabase.from("incident_updates").insert({
    incident_id: input.incidentId,
    project_id: input.project.id,
    author_id: input.actorId,
    message: input.message,
    previous_severity: input.previousSeverity ?? null,
    new_severity: input.newSeverity ?? null,
  });
  if (updateError) throw updateError;

  await logActivity({
    projectId: input.project.id,
    organizationId: input.project.organization_id,
    actorId: input.actorId,
    eventType: "incident.updated",
    objectType: "incident",
    objectId: input.incidentId,
    description: `posted an update on incident "${input.title}"`,
  });
}

export async function deleteIncident(input: {
  project: Project;
  incidentId: string;
  title: string;
  actorId: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("incidents").delete().eq("id", input.incidentId);
  if (error) throw error;

  await logActivity({
    projectId: input.project.id,
    organizationId: input.project.organization_id,
    actorId: input.actorId,
    eventType: "incident.deleted",
    objectType: "incident",
    objectId: input.incidentId,
    description: `deleted incident "${input.title}"`,
  });

  await logAudit({
    actorId: input.actorId,
    organizationId: input.project.organization_id,
    projectId: input.project.id,
    action: "incident.deleted",
    targetType: "incident",
    targetId: input.incidentId,
    description: `Deleted incident "${input.title}"`,
  });
}
