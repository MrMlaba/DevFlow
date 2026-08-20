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
import { TaskStatusSelect } from "@/features/tasks/components/task-status-select";
import { TASK_PRIORITY_META } from "@/config/status";
import { initials, formatRelativeTime } from "@/lib/utils";
import type { Task } from "@/services/tasks";

export function TaskDetailSheet({
  task,
  projectId,
  open,
  onOpenChange,
}: {
  task: Task | null;
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!task) return null;
  const priority = TASK_PRIORITY_META[task.priority];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{task.title}</SheetTitle>
          <SheetDescription>
            Reported by {task.reporter?.full_name ?? task.reporter?.email} ·{" "}
            {formatRelativeTime(task.created_at)}
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-6 px-4 pb-6">
          <div className="flex flex-wrap items-center gap-2">
            <TaskStatusSelect taskId={task.id} status={task.status} />
            <Badge className={priority.tone === "danger" ? "" : undefined} variant="outline">
              {priority.label} priority
            </Badge>
            {task.labels.map((label) => (
              <Badge key={label} variant="secondary" className="font-normal">
                {label}
              </Badge>
            ))}
          </div>

          {task.description && (
            <p className="text-sm whitespace-pre-wrap">{task.description}</p>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Assignee</p>
              {task.assignee ? (
                <div className="mt-1 flex items-center gap-2">
                  <Avatar className="size-6">
                    <AvatarImage src={task.assignee.avatar_url ?? undefined} alt="" />
                    <AvatarFallback className="text-[10px]">
                      {initials(task.assignee.full_name ?? task.assignee.email)}
                    </AvatarFallback>
                  </Avatar>
                  <span>{task.assignee.full_name ?? task.assignee.email}</span>
                </div>
              ) : (
                <p className="mt-1 text-muted-foreground">Unassigned</p>
              )}
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Due date</p>
              <p className="mt-1">
                {task.due_date
                  ? new Date(task.due_date).toLocaleDateString()
                  : "No due date"}
              </p>
            </div>
          </div>

          <Separator />

          <CommentThread
            projectId={projectId}
            commentableType="task"
            commentableId={task.id}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
