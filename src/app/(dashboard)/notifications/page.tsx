import type { Metadata } from "next";
import Link from "next/link";
import { Bell } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/services/auth";
import { listMyTasks } from "@/services/tasks";
import { TASK_STATUS_META, TASK_PRIORITY_META } from "@/config/status";
import { formatRelativeTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const user = await requireUser();
  const myTasks = await listMyTasks(user.id);
  const openTasks = myTasks.filter((t) => t.status !== "done");

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="DevFlow doesn't send push or email notifications yet - this is what's assigned to you, at a glance."
      />
      {openTasks.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="You're all caught up"
          description="Nothing is assigned to you right now."
        />
      ) : (
        <div className="max-w-2xl space-y-2">
          {openTasks.map((task) => {
            const status = TASK_STATUS_META[task.status];
            const priority = TASK_PRIORITY_META[task.priority];
            return (
              <Link
                key={task.id}
                href={`/projects/${task.project.id}/tasks`}
                className="flex items-center justify-between rounded-lg border bg-card px-4 py-3 transition-colors hover:border-primary/40"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{task.title}</p>
                  <p className="text-muted-foreground text-xs">
                    {task.project.name} · updated {formatRelativeTime(task.updated_at)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="outline" className="font-normal">
                    {priority.label}
                  </Badge>
                  <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
