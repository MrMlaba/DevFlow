import type { Metadata } from "next";
import { GitBranch, GitPullRequest } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { PreviewDataBanner } from "@/components/preview-data-banner";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MOCK_PULL_REQUESTS } from "@/lib/mock-data";
import { formatRelativeTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Pull Requests" };

const CI_TONE = { success: "success", failed: "danger", running: "info" } as const;
const SECURITY_TONE = { passed: "success", failed: "danger", warning: "warning" } as const;
const DEPLOY_TONE = {
  deployed: "success",
  pending: "warning",
  not_deployed: "neutral",
} as const;
const PR_STATUS_TONE = { open: "info", merged: "success", closed: "neutral" } as const;

export default function PullRequestsPage() {
  return (
    <div>
      <PageHeader
        title="Pull Requests"
        description="GitHub pull requests linked to DevFlow tasks."
      />
      <PreviewDataBanner phase="Phase 4 (GitHub Integration)" />
      <div className="space-y-3">
        {MOCK_PULL_REQUESTS.map((pr) => (
          <Card key={pr.id}>
            <CardContent className="space-y-3 pt-6">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <GitPullRequest className="text-muted-foreground size-4" />
                    <span className="font-medium">
                      #{pr.id} {pr.title}
                    </span>
                    <StatusBadge tone={PR_STATUS_TONE[pr.status]}>{pr.status}</StatusBadge>
                  </div>
                  <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs">
                    <GitBranch className="size-3" />
                    {pr.sourceBranch} → {pr.targetBranch} · by {pr.author} ·{" "}
                    {formatRelativeTime(pr.createdAt)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <StatusBadge tone={CI_TONE[pr.ciStatus]}>CI: {pr.ciStatus}</StatusBadge>
                  <StatusBadge tone={SECURITY_TONE[pr.securityStatus]}>
                    Security: {pr.securityStatus}
                  </StatusBadge>
                  <StatusBadge tone={DEPLOY_TONE[pr.deploymentStatus]}>
                    {pr.deploymentStatus.replace("_", " ")}
                  </StatusBadge>
                </div>
              </div>

              <div className="text-muted-foreground flex flex-wrap gap-4 text-xs">
                <span>{pr.filesChanged} files changed</span>
                <span className="text-emerald-600 dark:text-emerald-400">
                  +{pr.additions}
                </span>
                <span className="text-red-600 dark:text-red-400">-{pr.deletions}</span>
                <span>Reviewers: {pr.reviewers.join(", ") || "none"}</span>
              </div>

              {pr.linkedTask && (
                <Badge variant="outline" className="font-normal">
                  Linked to {pr.linkedTask}
                </Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
