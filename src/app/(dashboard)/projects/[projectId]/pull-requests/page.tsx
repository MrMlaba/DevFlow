import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GitPullRequest } from "lucide-react";

import { PullRequestList } from "@/features/github/components/pull-request-list";
import { EmptyState } from "@/components/empty-state";
import { getProjectById } from "@/services/projects";
import { getProjectRepository, listRepoPullRequests } from "@/services/github";
import { listProjectTasks } from "@/services/tasks";

export const metadata: Metadata = { title: "Pull Requests" };

export default async function ProjectPullRequestsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const project = await getProjectById(projectId);
  if (!project) notFound();

  const repository = await getProjectRepository(projectId);
  if (!repository) {
    return (
      <EmptyState
        icon={GitPullRequest}
        title="No repository connected"
        description="Connect a GitHub repository from this project's Settings tab to see pull requests here."
      />
    );
  }

  const [pullRequests, tasks] = await Promise.all([
    listRepoPullRequests(projectId),
    listProjectTasks(projectId),
  ]);

  const taskOptions = tasks.map((t) => ({ id: t.id, name: t.title }));

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        {pullRequests.length} pull request{pullRequests.length === 1 ? "" : "s"} synced
        from {repository.full_name}
      </p>
      <PullRequestList
        pullRequests={pullRequests}
        tasks={{ [projectId]: taskOptions }}
        emptyDescription="Sync the repository from Settings, or wait for the next push."
      />
    </div>
  );
}
