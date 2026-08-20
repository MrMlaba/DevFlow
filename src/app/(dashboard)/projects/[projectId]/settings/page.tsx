import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProjectSettingsForm } from "@/features/projects/components/project-settings-form";
import { requireUser } from "@/services/auth";
import { getMyRoleForProject, getProjectById } from "@/services/projects";
import { can } from "@/config/permissions";
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

  return <ProjectSettingsForm project={project} />;
}
