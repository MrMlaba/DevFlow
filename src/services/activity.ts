import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type ActivityEvent = Tables<"activity_events"> & {
  actor: Pick<Tables<"profiles">, "id" | "full_name" | "email" | "avatar_url"> | null;
};

export interface LogActivityInput {
  projectId?: string;
  organizationId?: string;
  actorId: string;
  eventType: string;
  objectType: string;
  objectId?: string;
  description: string;
  metadata?: Record<string, unknown>;
}

/**
 * Writes one row to activity_events. Called by every mutating service
 * function (create project, invite member, create task, ...) so the
 * activity feed and, eventually, the audit log (Phase 3) stay complete
 * without every caller having to remember to log anything.
 */
export async function logActivity(input: LogActivityInput) {
  const supabase = await createClient();
  const { error } = await supabase.from("activity_events").insert({
    project_id: input.projectId ?? null,
    organization_id: input.organizationId ?? null,
    actor_id: input.actorId,
    event_type: input.eventType,
    object_type: input.objectType,
    object_id: input.objectId ?? null,
    description: input.description,
    metadata: input.metadata ?? {},
  });

  // Activity logging must never break the primary action it's attached to.
  if (error) console.error("Failed to log activity", input.eventType, error);
}

export interface ActivityFilter {
  projectId?: string;
  organizationId?: string;
  actorId?: string;
  eventType?: string;
  from?: string;
  to?: string;
  limit?: number;
}

export async function listActivity(filter: ActivityFilter) {
  const supabase = await createClient();
  let query = supabase
    .from("activity_events")
    .select("*, actor:profiles(id, full_name, email, avatar_url)")
    .order("created_at", { ascending: false })
    .limit(filter.limit ?? 50);

  if (filter.projectId) query = query.eq("project_id", filter.projectId);
  if (filter.organizationId)
    query = query.eq("organization_id", filter.organizationId);
  if (filter.actorId) query = query.eq("actor_id", filter.actorId);
  if (filter.eventType) query = query.eq("event_type", filter.eventType);
  if (filter.from) query = query.gte("created_at", filter.from);
  if (filter.to) query = query.lte("created_at", filter.to);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as ActivityEvent[];
}
