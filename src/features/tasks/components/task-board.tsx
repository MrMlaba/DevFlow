"use client";

import { useState } from "react";
import { CalendarDays, LayoutList } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { TaskDetailSheet } from "@/features/tasks/components/task-detail-sheet";
import { TASK_PRIORITY_META, TASK_STATUS_META, TASK_STATUS_ORDER } from "@/config/status";
import { initials } from "@/lib/utils";
import type { Task } from "@/services/tasks";

export function TaskBoard({ projectId, tasks }: { projectId: string; tasks: Task[] }) {
  const [selected, setSelected] = useState<Task | null>(null);
  const [open, setOpen] = useState(false);

  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={LayoutList}
        title="No tasks yet"
        description="Create the first task to start planning this project's work."
      />
    );
  }

  const columns = TASK_STATUS_ORDER.map((status) => ({
    status,
    tasks: tasks.filter((t) => t.status === status),
  }));

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((column) => (
          <div key={column.status} className="w-72 shrink-0">
            <div className="mb-2 flex items-center justify-between px-1">
              <h3 className="text-sm font-medium">
                {TASK_STATUS_META[column.status].label}
              </h3>
              <span className="text-muted-foreground text-xs">
                {column.tasks.length}
              </span>
            </div>
            <div className="space-y-2">
              {column.tasks.map((task) => {
                const priority = TASK_PRIORITY_META[task.priority];
                return (
                  <Card
                    key={task.id}
                    className="cursor-pointer gap-2 p-3 transition-colors hover:border-primary/40"
                    onClick={() => {
                      setSelected(task);
                      setOpen(true);
                    }}
                  >
                    <p className="text-sm leading-snug font-medium">{task.title}</p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px] font-normal">
                        {priority.label}
                      </Badge>
                      {task.labels.slice(0, 2).map((label) => (
                        <Badge
                          key={label}
                          variant="secondary"
                          className="text-[10px] font-normal"
                        >
                          {label}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      {task.due_date ? (
                        <span className="text-muted-foreground flex items-center gap-1 text-xs">
                          <CalendarDays className="size-3" />
                          {new Date(task.due_date).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      ) : (
                        <span />
                      )}
                      {task.assignee && (
                        <Avatar className="size-6">
                          <AvatarImage src={task.assignee.avatar_url ?? undefined} alt="" />
                          <AvatarFallback className="text-[10px]">
                            {initials(task.assignee.full_name ?? task.assignee.email)}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <TaskDetailSheet
        task={selected}
        projectId={projectId}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
