import type { Metadata } from "next";
import { GitCommitHorizontal } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { PreviewDataBanner } from "@/components/preview-data-banner";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { MOCK_PIPELINES } from "@/lib/mock-data";
import { PIPELINE_STATUS_META } from "@/config/status";
import { formatRelativeTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Pipelines" };

const STAGE_TONE = {
  success: "success",
  failed: "danger",
  running: "info",
  pending: "neutral",
} as const;

export default function PipelinesPage() {
  return (
    <div>
      <PageHeader
        title="Pipelines"
        description="CI runs for every push and pull request."
      />
      <PreviewDataBanner phase="Phase 7 (CI with GitHub Actions)" />
      <div className="space-y-3">
        {MOCK_PIPELINES.map((run) => {
          const status = PIPELINE_STATUS_META[run.status];
          return (
            <Card key={run.id}>
              <CardContent className="space-y-3 pt-6">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <GitCommitHorizontal className="text-muted-foreground size-4" />
                      <span className="font-mono text-xs">{run.commitSha}</span>
                      <span className="font-medium">{run.commitMessage}</span>
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {run.branch} · {run.author} · started {formatRelativeTime(run.startedAt)}{" "}
                      · {run.durationSeconds}s
                    </p>
                  </div>
                  <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {run.stages.map((stage) => (
                    <StatusBadge key={stage.name} tone={STAGE_TONE[stage.status]}>
                      {stage.name}
                    </StatusBadge>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
