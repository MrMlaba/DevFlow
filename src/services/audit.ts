import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type AuditLogEntry = Tables<"audit_log"> & {
  actor: Pick<Tables<"profiles">, "id" | "full_name" | "email" | "avatar_url"> | null;
};

export interface LogAuditInput {
  actorId: string;
  organizationId?: string;
  projectId?: string;
  action: string;
  targetType: string;
  targetId?: string;
  description: string;
  metadata?: Record<string, unknown>;
}

/**
 * Writes one row to the security-sensitive audit log - distinct from the
 * general activity feed (src/services/activity.ts). Reserved for the
 * categories called out in the spec: login, permission/role changes,
 * project membership changes, and deletions. Never let this fail the
 * primary action it's attached to.
 */
export async function logAudit(input: LogAuditInput) {
  const supabase = await createClient();
  const { error } = await supabase.from("audit_log").insert({
    actor_id: input.actorId,
    organization_id: input.organizationId ?? null,
    project_id: input.projectId ?? null,
    action: input.action,
    target_type: input.targetType,
    target_id: input.targetId ?? null,
    description: input.description,
    metadata: input.metadata ?? {},
  });

  if (error) console.error("Failed to write audit log entry", input.action, error);
}

export interface AuditLogFilter {
  organizationId: string;
  actorId?: string;
  action?: string;
  from?: string;
  to?: string;
  limit?: number;
}

/** Org-admin-only: see docs/security.md. RLS enforces this independent of the filter. */
export async function listAuditLog(filter: AuditLogFilter) {
  const supabase = await createClient();
  let query = supabase
    .from("audit_log")
    .select("*, actor:profiles(id, full_name, email, avatar_url)")
    .eq("organization_id", filter.organizationId)
    .order("created_at", { ascending: false })
    .limit(filter.limit ?? 100);

  if (filter.actorId) query = query.eq("actor_id", filter.actorId);
  if (filter.action) query = query.eq("action", filter.action);
  if (filter.from) query = query.gte("created_at", filter.from);
  if (filter.to) query = query.lte("created_at", filter.to);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as AuditLogEntry[];
}
