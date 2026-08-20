import type { Metadata } from "next";
import Link from "next/link";
import { Ticket } from "lucide-react";

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
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { listVisibleIssues } from "@/services/issues";
import { ISSUE_PRIORITY_META, ISSUE_STATUS_META } from "@/config/status";
import { initials } from "@/lib/utils";

export const metadata: Metadata = { title: "Issues" };

export default async function AllIssuesPage() {
  const issues = await listVisibleIssues();

  return (
    <div>
      <PageHeader
        title="Issues"
        description="Every issue across the projects you're a member of."
      />
      {issues.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title="No issues yet"
          description="Open a project and file your first issue."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Assignee</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {issues.map((issue) => {
                const status = ISSUE_STATUS_META[issue.status];
                const priority = ISSUE_PRIORITY_META[issue.priority];
                return (
                  <TableRow key={issue.id}>
                    <TableCell className="max-w-xs">
                      <Link
                        href={`/projects/${issue.project.id}/issues`}
                        className="line-clamp-1 font-medium hover:underline"
                      >
                        {issue.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/projects/${issue.project.id}`}
                        className="text-muted-foreground text-sm hover:underline"
                      >
                        {issue.project.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {priority.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {issue.assignee ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="size-6">
                            <AvatarImage
                              src={issue.assignee.avatar_url ?? undefined}
                              alt=""
                            />
                            <AvatarFallback className="text-[10px]">
                              {initials(issue.assignee.full_name ?? issue.assignee.email)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">
                            {issue.assignee.full_name ?? issue.assignee.email}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Unassigned</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
