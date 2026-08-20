import type { Metadata } from "next";
import { Boxes } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ProjectCard } from "@/features/projects/components/project-card";
import { CreateOrganizationDialog } from "@/features/projects/components/create-organization-dialog";
import { CreateProjectDialog } from "@/features/projects/components/create-project-dialog";
import { getActiveOrganization } from "@/services/organizations";
import { listProjectMembers, listUserProjects } from "@/services/projects";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const [active, projects] = await Promise.all([
    getActiveOrganization(),
    listUserProjects(),
  ]);

  const memberCounts = await Promise.all(
    projects.map((p) => listProjectMembers(p.project.id)),
  );

  return (
    <div>
      <PageHeader
        title="Projects"
        description="Every project you're a member of."
        actions={
          active ? (
            <CreateProjectDialog organizationId={active.organization.id} />
          ) : (
            <CreateOrganizationDialog />
          )
        }
      />
      {projects.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title={active ? "No projects yet" : "Create an organization first"}
          description={
            active
              ? "Create your first project to start tracking tasks and issues."
              : "Organizations hold your projects and team members."
          }
          action={
            active ? (
              <CreateProjectDialog organizationId={active.organization.id} />
            ) : (
              <CreateOrganizationDialog />
            )
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p, i) => (
            <ProjectCard
              key={p.project.id}
              project={p.project}
              role={p.role}
              memberCount={memberCounts[i]?.length ?? 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
