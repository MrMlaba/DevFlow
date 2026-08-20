import type { Metadata } from "next";
import { Users2 } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
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
import { getActiveOrganization, listOrganizationMembers } from "@/services/organizations";
import { ROLE_BADGE_VARIANT, ROLE_LABELS } from "@/config/roles";
import { initials, formatRelativeTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Team" };

export default async function TeamPage() {
  const active = await getActiveOrganization();

  if (!active) {
    return (
      <div>
        <PageHeader title="Team" />
        <EmptyState
          icon={Users2}
          title="No organization yet"
          description="Create an organization to start building your team."
        />
      </div>
    );
  }

  const members = await listOrganizationMembers(active.organization.id);

  return (
    <div>
      <PageHeader
        title="Team"
        description={`Everyone in ${active.organization.name}.`}
      />
      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Organization role</TableHead>
              <TableHead>Joined</TableHead>
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
