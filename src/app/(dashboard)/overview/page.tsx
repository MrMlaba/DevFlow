import Link from "next/link";
import type { Metadata } from "next";
import { Boxes, History, Kanban, Ticket } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "@/features/projects/components/project-card";
import { CreateOrganizationDialog } from "@/features/projects/components/create-organization-dialog";
import { CreateProjectDialog } from "@/features/projects/components/create-project-dialog";
import { ActivityFeed } from "@/features/activity/components/activity-feed";
import { requireProfile } from "@/services/auth";
import { getActiveOrganization } from "@/services/organizations";
import { listUserProjects, listProjectMembers } from "@/services/projects";
import { listActivity } from "@/services/activity";

export const metadata: Metadata = { title: "Overview" };

export default async function OverviewPage() {
  const profile = await requireProfile();
  const [active, projects] = await Promise.all([
    getActiveOrganization(),
    listUserProjects(),
  ]);

  if (!active) {
    return (
      <div>
        <PageHeader
          title={`Welcome, ${profile.full_name?.split(" ")[0] ?? "there"}`}
          description="Create an organization to start tracking projects."
        />
        <EmptyState
          icon={Boxes}
          title="You're not part of an organization yet"
          description="Organizations hold your projects and team. Create one to get started."
          action={<CreateOrganizationDialog />}
        />
      </div>
    );
  }

  const memberCounts = await Promise.all(
    projects.map((p) => listProjectMembers(p.project.id)),
  );
  const activity = await listActivity({ organizationId: active.organization.id, limit: 8 });

  const activeCount = projects.filter((p) => p.project.status === "active").length;

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome, ${profile.full_name?.split(" ")[0] ?? "there"}`}
        description={active.organization.name}
        actions={<CreateProjectDialog organizationId={active.organization.id} />}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Projects
            </CardTitle>
            <Boxes className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{projects.length}</p>
            <p className="text-muted-foreground text-xs">{activeCount} active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Your role
            </CardTitle>
            <Kanban className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold capitalize">
              {active.role.replace("_", " ")}
            </p>
            <p className="text-muted-foreground text-xs">in {active.organization.name}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Recent activity
            </CardTitle>
            <Ticket className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{activity.length}</p>
            <p className="text-muted-foreground text-xs">events this week</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Your projects</h2>
            <Button
              variant="link"
              className="px-0"
              nativeButton={false}
              render={<Link href="/projects" />}
            >
              View all
            </Button>
          </div>
          {projects.length === 0 ? (
            <EmptyState
              icon={Boxes}
              title="No projects yet"
              description="Create your first project to start tracking tasks and issues."
              action={<CreateProjectDialog organizationId={active.organization.id} />}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {projects.slice(0, 4).map((p, i) => (
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
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Activity</h2>
            <Button
              variant="link"
              className="px-0"
              nativeButton={false}
              render={<Link href="/activity" />}
            >
              <History className="size-3.5" />
              View all
            </Button>
          </div>
          <ActivityFeed events={activity} />
        </div>
      </div>
    </div>
  );
}
