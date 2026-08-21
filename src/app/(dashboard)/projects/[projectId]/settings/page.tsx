import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProjectSettingsForm } from "@/features/projects/components/project-settings-form";
import { RepositoryConnectionCard } from "@/features/github/components/repository-connection-card";
import { requireUser } from "@/services/auth";
import { getMyRoleForProject, getProjectById } from "@/services/projects";
import { getGitHubAccount, getProjectRepository } from "@/services/github";
import { can } from "@/config/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShieldAlert } from "lucide-react";

export const metadata: Metadata = { title: "Project settings" };

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const user = await requireUser();
  const project = await getProjectById(projectId);
  if (!project) notFound();

  const role = await getMyRoleForProject(projectId, user.id);
  if (!can(role, "project:update")) {
    return (
      <Alert variant="destructive">
        <ShieldAlert className="size-4" />
        <AlertDescription>
          Only project owners and administrators can edit project settings.
        </AlertDescription>
      </Alert>
    );
  }

  const [repository, githubAccount] = await Promise.all([
    getProjectRepository(projectId),
    getGitHubAccount(user.id),
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <ProjectSettingsForm project={project} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">GitHub repository</CardTitle>
        </CardHeader>
        <CardContent>
          <RepositoryConnectionCard
            projectId={projectId}
            repository={repository}
            hasGitHubAccount={Boolean(githubAccount)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
