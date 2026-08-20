import type { Metadata } from "next";
import Link from "next/link";
import { LayoutList } from "lucide-react";

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
import { listVisibleTasks } from "@/services/tasks";
import { TASK_PRIORITY_META, TASK_STATUS_META } from "@/config/status";
import { initials } from "@/lib/utils";

export const metadata: Metadata = { title: "Tasks" };

export default async function AllTasksPage() {
  const tasks = await listVisibleTasks();

  return (
    <div>
      <PageHeader
        title="Tasks"
        description="Every task across the projects you're a member of."
      />
      {tasks.length === 0 ? (
        <EmptyState
          icon={LayoutList}
          title="No tasks yet"
          description="Open a project and create your first task."
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
              {tasks.map((task) => {
                const status = TASK_STATUS_META[task.status];
                const priority = TASK_PRIORITY_META[task.priority];
                return (
                  <TableRow key={task.id}>
                    <TableCell className="max-w-xs">
                      <Link
                        href={`/projects/${task.project.id}/tasks`}
                        className="line-clamp-1 font-medium hover:underline"
                      >
                        {task.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/projects/${task.project.id}`}
                        className="text-muted-foreground text-sm hover:underline"
                      >
                        {task.project.name}
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
                      {task.assignee ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="size-6">
                            <AvatarImage
                              src={task.assignee.avatar_url ?? undefined}
                              alt=""
                            />
                            <AvatarFallback className="text-[10px]">
                              {initials(task.assignee.full_name ?? task.assignee.email)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">
                            {task.assignee.full_name ?? task.assignee.email}
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
