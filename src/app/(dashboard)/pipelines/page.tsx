import type { Metadata } from "next";
import { Check, Circle, Container, GitCommitHorizontal, Loader2, Workflow, X } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listUserProjects } from "@/services/projects";
import {
  listVisibleContainerImages,
  listVisiblePipelineRuns,
  type PipelineRun,
} from "@/services/github";
import { PIPELINE_STATUS_META } from "@/config/status";
import { cn, formatDuration, formatRelativeTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Pipelines" };

export default async function PipelinesPage() {
  const projects = await listUserProjects();
  const projectRefs = projects.map((p) => p.project);
  const [runs, images] = await Promise.all([
    listVisiblePipelineRuns(projectRefs),
    listVisibleContainerImages(projectRefs),
  ]);

  return (
    <div className="space-y-8">
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
            {runs.map((run) => (
              <PipelineRunCard key={run.id} run={run} />
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-medium">
          <Container className="size-4" />
          Container images
        </h2>
        {images.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No images published yet - pushes to main build and publish one via{" "}
            <code className="text-xs">.github/workflows/docker.yml</code>. If images exist on
            GitHub already but nothing shows here, reconnect GitHub (Settings) to pick up the
            read:packages permission added in Phase 9.
          </p>
        ) : (
          <div className="space-y-2">
            {images.map((image) => (
              <a
                key={image.id}
                href={image.htmlUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card px-4 py-3 hover:border-primary/40"
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  {image.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="font-mono text-xs font-normal">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <span className="text-muted-foreground text-xs">
                  {image.projectName} · pushed {formatRelativeTime(image.pushedAt)}
                </span>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PipelineRunCard({ run }: { run: PipelineRun }) {
  const status = PIPELINE_STATUS_META[run.status];

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm">
            <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
            <span className="font-medium">
              #{run.runNumber} · {run.branch}
            </span>
            <span className="text-muted-foreground">· {run.projectName}</span>
          </div>
          <div className="text-muted-foreground flex items-center gap-2 font-mono text-xs">
            {run.durationSeconds !== null && <span>{formatDuration(run.durationSeconds)}</span>}
            <span>{run.commitSha}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <a
            href={run.htmlUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm hover:underline"
          >
            <GitCommitHorizontal className="text-muted-foreground size-4 shrink-0" />
            {run.commitMessage}
          </a>
          <span className="text-muted-foreground text-xs">Triggered by {run.author}</span>
        </div>

        {run.stages.length > 0 && <PipelineStageFlow stages={run.stages} />}

        <p className="text-muted-foreground text-xs">
          started {formatRelativeTime(run.startedAt)}
        </p>
      </CardContent>
    </Card>
  );
}

const STAGE_NODE_STYLES = {
  success: "border-emerald-500 bg-emerald-500 text-white",
  failed: "border-red-500 bg-red-500 text-white",
  running: "border-primary bg-primary text-primary-foreground",
  pending: "border-muted-foreground/30 bg-muted text-muted-foreground",
} as const;

const STAGE_LINE_STYLES = {
  success: "bg-emerald-500",
  failed: "bg-red-500",
  running: "bg-primary",
  pending: "bg-border",
} as const;

function PipelineStageFlow({ stages }: { stages: PipelineRun["stages"] }) {
  return (
    <div className="flex items-start">
      {stages.map((stage, i) => (
        <div key={stage.name} className="flex flex-1 items-start last:flex-none">
          <div className="flex flex-col items-center gap-1.5">
            <div
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-full border-2",
                STAGE_NODE_STYLES[stage.status],
              )}
            >
              {stage.status === "success" && <Check className="size-4" />}
              {stage.status === "failed" && <X className="size-4" />}
              {stage.status === "running" && <Loader2 className="size-4 animate-spin" />}
              {stage.status === "pending" && <Circle className="size-2 fill-current" />}
            </div>
            <div className="text-center">
              <p className="text-xs font-medium whitespace-nowrap">{stage.name}</p>
              <p className="text-muted-foreground text-[10px] whitespace-nowrap">
                {stage.durationSeconds !== null ? formatDuration(stage.durationSeconds) : "—"}
              </p>
            </div>
          </div>
          {i < stages.length - 1 && (
            <div
              className={cn("mt-4.5 h-0.5 flex-1", STAGE_LINE_STYLES[stage.status])}
              aria-hidden
            />
          )}
        </div>
      ))}
    </div>
  );
}
