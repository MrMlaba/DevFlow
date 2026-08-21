import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GitCommitHorizontal } from "lucide-react";

import { CommitList } from "@/features/github/components/commit-list";
import { EmptyState } from "@/components/empty-state";
import { getProjectById } from "@/services/projects";
import { getProjectRepository, listRepoCommits } from "@/services/github";

export const metadata: Metadata = { title: "Commits" };

export default async function ProjectCommitsPage({
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
        icon={GitCommitHorizontal}
        title="No repository connected"
        description="Connect a GitHub repository from this project's Settings tab to see commits here."
      />
    );
  }

  const commits = await listRepoCommits(projectId);

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        {commits.length} commit{commits.length === 1 ? "" : "s"} synced from{" "}
        {repository.full_name}
      </p>
      <CommitList commits={commits} />
    </div>
  );
}
