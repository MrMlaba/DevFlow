import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { PullRequestList } from "@/features/github/components/pull-request-list";
import { listVisiblePullRequests } from "@/services/github";
import { listUserProjects } from "@/services/projects";
import { listProjectTasks } from "@/services/tasks";

export const metadata: Metadata = { title: "Pull Requests" };

export default async function PullRequestsPage() {
  const [pullRequests, projects] = await Promise.all([
    listVisiblePullRequests(),
    listUserProjects(),
  ]);

  const taskLists = await Promise.all(
    projects.map((p) => listProjectTasks(p.project.id)),
  );
  const tasks = Object.fromEntries(
    projects.map((p, i) => [
      p.project.id,
      (taskLists[i] ?? []).map((t) => ({ id: t.id, name: t.title })),
    ]),
  );

  return (
    <div>
      <PageHeader
        title="Pull Requests"
        description="Synced from every repository connected to your projects."
      />
      <PullRequestList
        pullRequests={pullRequests}
        tasks={tasks}
        projects
        emptyDescription="Connect a GitHub repository to a project (Settings tab) to see pull requests here."
      />
    </div>
  );
}
