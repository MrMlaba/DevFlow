import Link from "next/link";
import { GitPullRequest } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { PullRequestTaskSelect } from "@/features/github/components/pull-request-task-select";
import { pullRequestStatusMeta } from "@/config/status";
import { initials, formatRelativeTime } from "@/lib/utils";
import type { AssigneeOption } from "@/components/assignee-select";
import type { GitHubPullRequestRow } from "@/services/github";
import type { Project } from "@/services/projects";

export function PullRequestList({
  pullRequests,
  tasks,
  emptyDescription,
  projects,
}: {
  pullRequests: (GitHubPullRequestRow & { project?: Pick<Project, "id" | "name"> })[];
  /** Task options per project id - project-scoped pages pass one key. */
  tasks: Record<string, AssigneeOption[]>;
  emptyDescription: string;
  /** Show a Project column - only for the cross-project page. */
  projects?: boolean;
}) {
  if (pullRequests.length === 0) {
    return (
      <EmptyState icon={GitPullRequest} title="No pull requests yet" description={emptyDescription} />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Pull request</TableHead>
            {projects && <TableHead>Project</TableHead>}
            <TableHead>Author</TableHead>
            <TableHead>Branches</TableHead>
            <TableHead>Changes</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Linked task</TableHead>
            <TableHead>Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pullRequests.map((pr) => {
            const status = pullRequestStatusMeta(pr.state, pr.is_merged);
            const projectId = pr.project?.id ?? Object.keys(tasks)[0] ?? "";
            return (
              <TableRow key={pr.id}>
                <TableCell className="max-w-xs">
                  <a
                    href={pr.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="line-clamp-1 font-medium hover:underline"
                  >
                    #{pr.number} {pr.title}
                  </a>
                </TableCell>
                {projects && (
                  <TableCell>
                    {pr.project && (
                      <Link
                        href={`/projects/${pr.project.id}`}
                        className="text-muted-foreground text-sm hover:underline"
                      >
                        {pr.project.name}
                      </Link>
                    )}
                  </TableCell>
                )}
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="size-6">
                      <AvatarImage src={pr.author_avatar_url ?? undefined} alt="" />
                      <AvatarFallback className="text-[10px]">
                        {initials(pr.author_login)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{pr.author_login}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground font-mono text-xs">
                  {pr.source_branch} → {pr.target_branch}
                </TableCell>
                <TableCell className="text-xs">
                  <span className="text-emerald-600 dark:text-emerald-400">
                    +{pr.additions}
                  </span>{" "}
                  <span className="text-red-600 dark:text-red-400">-{pr.deletions}</span>
                </TableCell>
                <TableCell>
                  <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                </TableCell>
                <TableCell>
                  <PullRequestTaskSelect
                    pullRequestId={pr.id}
                    tasks={tasks[projectId] ?? []}
                    currentTaskId={pr.linked_task_id}
                  />
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {formatRelativeTime(pr.github_updated_at)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <p className="text-muted-foreground border-t px-4 py-2 text-xs">
        CI, security, and deployment status per pull request will appear here once
        Phases 7/8/10 are built.
      </p>
    </div>
  );
}
