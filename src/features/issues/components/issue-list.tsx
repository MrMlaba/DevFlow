"use client";

import { useState } from "react";
import { Ticket } from "lucide-react";

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
import { EmptyState } from "@/components/empty-state";
import { IssueDetailSheet } from "@/features/issues/components/issue-detail-sheet";
import { ISSUE_PRIORITY_META, ISSUE_STATUS_META } from "@/config/status";
import { StatusBadge } from "@/components/status-badge";
import { initials, formatRelativeTime } from "@/lib/utils";
import type { Issue } from "@/services/issues";

export function IssueList({ projectId, issues }: { projectId: string; issues: Issue[] }) {
  const [selected, setSelected] = useState<Issue | null>(null);
  const [open, setOpen] = useState(false);

  if (issues.length === 0) {
    return (
      <EmptyState
        icon={Ticket}
        title="No issues yet"
        description="Open an issue to track a bug or piece of follow-up work."
      />
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Assignee</TableHead>
              <TableHead>Opened</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {issues.map((issue) => {
              const status = ISSUE_STATUS_META[issue.status];
              const priority = ISSUE_PRIORITY_META[issue.priority];
              return (
                <TableRow
                  key={issue.id}
                  className="cursor-pointer"
                  onClick={() => {
                    setSelected(issue);
                    setOpen(true);
                  }}
                >
                  <TableCell className="max-w-xs truncate font-medium">
                    {issue.title}
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
                          <AvatarImage src={issue.assignee.avatar_url ?? undefined} alt="" />
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
                  <TableCell className="text-muted-foreground text-sm">
                    {formatRelativeTime(issue.created_at)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <IssueDetailSheet
        issue={selected}
        projectId={projectId}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
