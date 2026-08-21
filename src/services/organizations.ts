import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { AppRole, Tables } from "@/types/database";
import { logActivity } from "@/services/activity";
import { getCurrentUser } from "@/services/auth";

export type Organization = Tables<"organizations">;
export type OrganizationMember = Tables<"organization_members"> & {
  profile: Pick<Tables<"profiles">, "id" | "full_name" | "email" | "avatar_url">;
};

export async function listUserOrganizations() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return [];

  // Filter by user_id explicitly rather than relying on RLS to scope this
  // to "my membership rows": is_org_member(organization_id) only checks
  // whether the current user belongs to that organization, not whether a
  // given row is theirs - so an unfiltered select returns every member's
  // row for every org you're in, not just your own.
  const { data, error } = await supabase
    .from("organization_members")
    .select("role, organization:organizations(*)")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => ({
    role: row.role as AppRole,
    organization: row.organization as unknown as Organization,
  }));
}

/**
 * DevFlow doesn't have an org-switcher in Phase 1 - most student/small-team
 * users belong to exactly one organization. Pages that need "the current
 * org" (Team, project creation) use the earliest one the user joined. If
 * they belong to several, they can still reach every project they're a
 * member of via /projects.
 */
export async function getActiveOrganization() {
  const orgs = await listUserOrganizations();
  return orgs[0] ?? null;
}

export async function getOrganizationBySlug(slug: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) return null;
  return data as Organization;
}

export async function getMyRoleForOrganization(
  organizationId: string,
  userId: string,
): Promise<AppRole | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();

  return (data?.role as AppRole) ?? null;
}

export async function getOrganizationById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return data as Organization;
}

export async function listOrganizationMembers(organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_members")
    .select(
      "*, profile:profiles!organization_members_user_id_fkey(id, full_name, email, avatar_url)",
    )
    .eq("organization_id", organizationId)
    .order("joined_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as OrganizationMember[];
}

export async function createOrganization(input: {
  name: string;
  slug: string;
  description?: string;
  userId: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .insert({
      name: input.name,
      slug: input.slug,
      description: input.description || null,
      created_by: input.userId,
    })
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    organizationId: data.id,
    actorId: input.userId,
    eventType: "organization.created",
    objectType: "organization",
    objectId: data.id,
    description: `created the organization "${data.name}"`,
  });

  return data as Organization;
}

export async function updateOrganization(input: {
  organizationId: string;
  actorId: string;
  name: string;
  description?: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .update({ name: input.name, description: input.description || null })
    .eq("id", input.organizationId)
    .select()
    .single();

  if (error) throw error;

  await logActivity({
    organizationId: data.id,
    actorId: input.actorId,
    eventType: "organization.updated",
    objectType: "organization",
    objectId: data.id,
    description: `updated the organization "${data.name}"`,
  });

  return data as Organization;
}
