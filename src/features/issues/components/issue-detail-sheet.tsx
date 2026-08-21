"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CommentThread } from "@/features/comments/components/comment-thread";
import { IssueStatusSelect } from "@/features/issues/components/issue-status-select";
import { LinkedTaskSelect } from "@/features/issues/components/linked-task-select";
import { ISSUE_PRIORITY_META } from "@/config/status";
import { initials, formatRelativeTime } from "@/lib/utils";
import type { AssigneeOption } from "@/components/assignee-select";
import type { Issue } from "@/services/issues";

export function IssueDetailSheet({
  issue,
  projectId,
  tasks,
  open,
  onOpenChange,
}: {
  issue: Issue | null;
  projectId: string;
  tasks: AssigneeOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!issue) return null;
  const priority = ISSUE_PRIORITY_META[issue.priority];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{issue.title}</SheetTitle>
          <SheetDescription>
            Reported by {issue.reporter?.full_name ?? issue.reporter?.email} ·{" "}
            {formatRelativeTime(issue.created_at)}
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-6 px-4 pb-6">
          <div className="flex flex-wrap items-center gap-2">
            <IssueStatusSelect issueId={issue.id} status={issue.status} />
            <Badge variant="outline">{priority.label} priority</Badge>
          </div>

          {issue.description && (
            <p className="text-sm whitespace-pre-wrap">{issue.description}</p>
          )}

          <div>
            <p className="text-muted-foreground text-xs">Assignee</p>
            {issue.assignee ? (
              <div className="mt-1 flex items-center gap-2 text-sm">
                <Avatar className="size-6">
                  <AvatarImage src={issue.assignee.avatar_url ?? undefined} alt="" />
                  <AvatarFallback className="text-[10px]">
                    {initials(issue.assignee.full_name ?? issue.assignee.email)}
                  </AvatarFallback>
                </Avatar>
                <span>{issue.assignee.full_name ?? issue.assignee.email}</span>
              </div>
            ) : (
              <p className="mt-1 text-muted-foreground text-sm">Unassigned</p>
            )}
          </div>

          <div>
            <p className="text-muted-foreground mb-1 text-xs">Linked task</p>
            <LinkedTaskSelect
              issueId={issue.id}
              tasks={tasks}
              currentTaskId={issue.linked_task_id}
            />
          </div>

          <Separator />

          <CommentThread
            projectId={projectId}
            commentableType="issue"
            commentableId={issue.id}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
