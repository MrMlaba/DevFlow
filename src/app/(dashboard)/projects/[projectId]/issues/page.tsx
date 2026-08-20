import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { IssueList } from "@/features/issues/components/issue-list";
import { CreateIssueDialog } from "@/features/issues/components/create-issue-dialog";
import { getProjectById, listProjectMembers } from "@/services/projects";
import { listProjectIssues } from "@/services/issues";

export const metadata: Metadata = { title: "Issues" };

export default async function ProjectIssuesPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const project = await getProjectById(projectId);
  if (!project) notFound();

  const [issues, members] = await Promise.all([
    listProjectIssues(projectId),
    listProjectMembers(projectId),
  ]);

  const assigneeOptions = members.map((m) => ({
    id: m.profile.id,
    name: m.profile.full_name ?? m.profile.email,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {issues.length} issue{issues.length === 1 ? "" : "s"}
        </p>
        <CreateIssueDialog projectId={projectId} members={assigneeOptions} />
      </div>
      <IssueList projectId={projectId} issues={issues} />
    </div>
  );
}
