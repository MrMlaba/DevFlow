import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AppRole } from "@/types/database";
import { logActivity } from "@/services/activity";
import type { Project } from "@/services/projects";

export interface InviteMemberResult {
  status: "added" | "invited";
}

/**
 * Adds an existing DevFlow user to a project by email, or - if no account
 * exists yet for that email - creates a pending project_invitations row
 * that is redeemed automatically the next time that email registers (see
 * src/features/auth/actions.ts signUp).
 */
export async function inviteProjectMember(input: {
  project: Project;
  email: string;
  role: AppRole;
  invitedBy: string;
}): Promise<InviteMemberResult> {
  const supabase = await createClient();

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .ilike("email", input.email)
    .maybeSingle();

  if (existingProfile) {
    const { error } = await supabase.from("project_members").insert({
      project_id: input.project.id,
      user_id: existingProfile.id,
      role: input.role,
      invited_by: input.invitedBy,
    });
    if (error) throw error;

    await logActivity({
      projectId: input.project.id,
      organizationId: input.project.organization_id,
      actorId: input.invitedBy,
      eventType: "project.member_joined",
      objectType: "project_member",
      objectId: existingProfile.id,
      description: `added ${existingProfile.full_name ?? existingProfile.email} to "${input.project.name}" as ${input.role.replace("_", " ")}`,
    });

    return { status: "added" };
  }

  const { error } = await supabase.from("project_invitations").insert({
    project_id: input.project.id,
    email: input.email.toLowerCase(),
    role: input.role,
    invited_by: input.invitedBy,
  });
  if (error) throw error;

  await logActivity({
    projectId: input.project.id,
    organizationId: input.project.organization_id,
    actorId: input.invitedBy,
    eventType: "project.member_invited",
    objectType: "project_invitation",
    description: `invited ${input.email} to "${input.project.name}" as ${input.role.replace("_", " ")}`,
  });

  return { status: "invited" };
}

export async function listPendingInvitations(projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_invitations")
    .select("*")
    .eq("project_id", projectId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function revokeInvitation(invitationId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("project_invitations")
    .update({ status: "revoked" })
    .eq("id", invitationId);
  if (error) throw error;
}

export async function updateMemberRole(input: {
  project: Project;
  memberId: string;
  memberUserId: string;
  memberName: string;
  role: AppRole;
  actorId: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("project_members")
    .update({ role: input.role })
    .eq("id", input.memberId);
  if (error) throw error;

  await logActivity({
    projectId: input.project.id,
    organizationId: input.project.organization_id,
    actorId: input.actorId,
    eventType: "project.member_role_changed",
    objectType: "project_member",
    objectId: input.memberUserId,
    description: `changed ${input.memberName}'s role on "${input.project.name}" to ${input.role.replace("_", " ")}`,
    metadata: { role: input.role },
  });
}

export async function removeMember(input: {
  project: Project;
  memberId: string;
  memberUserId: string;
  memberName: string;
  actorId: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("project_members")
    .delete()
    .eq("id", input.memberId);
  if (error) throw error;

  await logActivity({
    projectId: input.project.id,
    organizationId: input.project.organization_id,
    actorId: input.actorId,
    eventType: "project.member_removed",
    objectType: "project_member",
    objectId: input.memberUserId,
    description: `removed ${input.memberName} from "${input.project.name}"`,
  });
}

/**
 * Redeems any pending invitations for a freshly registered email. Uses the
 * service-role client because the new user isn't a project admin (the
 * only role allowed to read/write project_invitations and project_members
 * under RLS) - this is a system-level step that runs once, right after
 * signUp, not an arbitrary user-initiated action.
 */
export async function redeemInvitationsForEmail(userId: string, email: string) {
  const supabase = createAdminClient();
  const { data: invitations } = await supabase
    .from("project_invitations")
    .select("*")
    .ilike("email", email)
    .eq("status", "pending");

  if (!invitations || invitations.length === 0) return;

  for (const invitation of invitations) {
    await supabase.from("project_members").insert({
      project_id: invitation.project_id,
      user_id: userId,
      role: invitation.role,
      invited_by: invitation.invited_by,
    });
    await supabase
      .from("project_invitations")
      .update({ status: "accepted" })
      .eq("id", invitation.id);
  }
}
