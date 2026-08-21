"use client";

import { useEffect, useState } from "react";
import { GitPullRequest } from "lucide-react";

import { listPullRequestsLinkedToTaskAction } from "@/features/github/actions";
import { StatusBadge } from "@/components/status-badge";
import { pullRequestStatusMeta } from "@/config/status";
import type { GitHubPullRequestRow } from "@/services/github";

export function LinkedPullRequests({ taskId }: { taskId: string }) {
  const [pullRequests, setPullRequests] = useState<GitHubPullRequestRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    listPullRequestsLinkedToTaskAction(taskId).then((data) => {
      if (!cancelled) setPullRequests(data);
    });
    return () => {
      cancelled = true;
    };
  }, [taskId]);

  if (pullRequests === null) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Pull requests</h3>
      {pullRequests.length === 0 ? (
        <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
          <GitPullRequest className="size-3.5" />
          None linked yet - link one from the project&apos;s Pull Requests tab.
        </p>
      ) : (
        <div className="space-y-1.5">
          {pullRequests.map((pr) => {
            const status = pullRequestStatusMeta(pr.state, pr.is_merged);
            return (
              <a
                key={pr.id}
                href={pr.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm transition-colors hover:border-primary/40"
              >
                <GitPullRequest className="text-muted-foreground size-3.5 shrink-0" />
                <span className="min-w-0 flex-1 truncate">
                  #{pr.number} {pr.title}
                </span>
                <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
