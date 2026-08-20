import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Mail } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { InviteMemberDialog } from "@/features/projects/components/invite-member-dialog";
import { MemberRowActions } from "@/features/projects/components/member-row-actions";
import { requireUser } from "@/services/auth";
import { getMyRoleForProject, getProjectById, listProjectMembers } from "@/services/projects";
import { listPendingInvitations } from "@/services/members";
import { can } from "@/config/permissions";
import { ROLE_BADGE_VARIANT, ROLE_LABELS } from "@/config/roles";
import { initials, formatRelativeTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Members" };

export default async function ProjectMembersPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const user = await requireUser();
  const project = await getProjectById(projectId);
  if (!project) notFound();

  const [members, myRole] = await Promise.all([
    listProjectMembers(projectId),
    getMyRoleForProject(projectId, user.id),
  ]);
  const canManage = can(myRole, "project:manage_members");
  const invitations = canManage ? await listPendingInvitations(projectId) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {members.length} member{members.length === 1 ? "" : "s"}
        </p>
        {canManage && <InviteMemberDialog projectId={projectId} />}
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
              {canManage && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="size-7">
                      <AvatarImage src={member.profile.avatar_url ?? undefined} alt="" />
                      <AvatarFallback className="text-xs">
                        {initials(member.profile.full_name ?? member.profile.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">
                        {member.profile.full_name ?? "Unnamed"}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {member.profile.email}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={ROLE_BADGE_VARIANT[member.role]} className="font-normal">
                    {ROLE_LABELS[member.role]}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {formatRelativeTime(member.joined_at)}
                </TableCell>
                {canManage && (
                  <TableCell>
                    <MemberRowActions
                      projectId={projectId}
                      memberId={member.id}
                      memberUserId={member.profile.id}
                      memberName={member.profile.full_name ?? member.profile.email}
                      currentRole={member.role}
                      isCurrentUser={member.profile.id === user.id}
                    />
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {canManage && invitations.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-medium">Pending invitations</h2>
          <div className="space-y-2">
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between rounded-lg border bg-card px-4 py-3"
              >
                <div className="flex items-center gap-2">
                  <Mail className="text-muted-foreground size-4" />
                  <span className="text-sm">{invitation.email}</span>
                </div>
                <Badge variant={ROLE_BADGE_VARIANT[invitation.role]} className="font-normal">
                  {ROLE_LABELS[invitation.role]}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
