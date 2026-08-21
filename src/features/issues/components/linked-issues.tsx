"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Ticket } from "lucide-react";

import { listIssuesLinkedToTaskAction } from "@/features/issues/actions";
import { StatusBadge } from "@/components/status-badge";
import { ISSUE_STATUS_META } from "@/config/status";
import type { Issue } from "@/services/issues";

export function LinkedIssues({ taskId, projectId }: { taskId: string; projectId: string }) {
  const [issues, setIssues] = useState<Issue[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    listIssuesLinkedToTaskAction(taskId).then((data) => {
      if (!cancelled) setIssues(data);
    });
    return () => {
      cancelled = true;
    };
  }, [taskId]);

  if (issues === null || issues.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Linked issues ({issues.length})</h3>
      <div className="space-y-1.5">
        {issues.map((issue) => {
          const status = ISSUE_STATUS_META[issue.status];
          return (
            <Link
              key={issue.id}
              href={`/projects/${projectId}/issues`}
              className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm transition-colors hover:border-primary/40"
            >
              <Ticket className="text-muted-foreground size-3.5 shrink-0" />
              <span className="min-w-0 flex-1 truncate">{issue.title}</span>
              <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
