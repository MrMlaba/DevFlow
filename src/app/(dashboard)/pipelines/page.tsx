import type { Metadata } from "next";
import { GitCommitHorizontal, Workflow } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { listUserProjects } from "@/services/projects";
import { listVisiblePipelineRuns } from "@/services/github";
import { PIPELINE_STATUS_META } from "@/config/status";
import { formatRelativeTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Pipelines" };

const STAGE_TONE = {
  success: "success",
  failed: "danger",
  running: "info",
  pending: "neutral",
} as const;

export default async function PipelinesPage() {
  const projects = await listUserProjects();
  const runs = await listVisiblePipelineRuns(projects.map((p) => p.project));

  return (
    <div>
      <PageHeader
        title="Pipelines"
        description="CI runs for every push and pull request, synced live from GitHub Actions."
      />
      {runs.length === 0 ? (
        <EmptyState
          icon={Workflow}
          title="No CI runs yet"
          description="Connect a GitHub repository to a project (Settings tab) with a .github/workflows/ci.yml, then push a commit."
        />
      ) : (
        <div className="space-y-3">
          {runs.map((run) => {
            const status = PIPELINE_STATUS_META[run.status];
            return (
              <Card key={run.id}>
                <CardContent className="space-y-3 pt-6">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <GitCommitHorizontal className="text-muted-foreground size-4" />
                        <span className="font-mono text-xs">{run.commitSha}</span>
                        <a
                          href={run.htmlUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium hover:underline"
                        >
                          {run.commitMessage}
                        </a>
                      </div>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {run.projectName} · {run.branch} · {run.author} · started{" "}
                        {formatRelativeTime(run.startedAt)}
                        {run.durationSeconds !== null && ` · ${run.durationSeconds}s`}
                      </p>
                    </div>
                    <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                  </div>
                  {run.stages.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {run.stages.map((stage) => (
                        <StatusBadge key={stage.name} tone={STAGE_TONE[stage.status]}>
                          {stage.name}
                        </StatusBadge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
