import Link from "next/link";
import { notFound } from "next/navigation";

import { requireUser } from "@/services/auth";
import { getMyRoleForProject, getProjectById } from "@/services/projects";
import { ROLE_BADGE_VARIANT, ROLE_LABELS } from "@/config/roles";
import { Badge } from "@/components/ui/badge";
import { ProjectTabs } from "@/features/projects/components/project-tabs";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const user = await requireUser();

  const [project, role] = await Promise.all([
    getProjectById(projectId),
    getMyRoleForProject(projectId, user.id),
  ]);
  if (!project || !role) notFound();

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/projects/${project.id}`}
            className="text-2xl font-semibold tracking-tight hover:underline"
          >
            {project.name}
          </Link>
          <Badge variant={ROLE_BADGE_VARIANT[role]}>{ROLE_LABELS[role]}</Badge>
        </div>
        {project.description && (
          <p className="text-muted-foreground mt-1 text-sm">{project.description}</p>
        )}
      </div>
      <ProjectTabs projectId={project.id} />
      {children}
    </div>
  );
}
