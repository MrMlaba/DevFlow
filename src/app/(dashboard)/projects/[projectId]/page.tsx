import type { Metadata } from "next";
import { CheckCircle2, ListTodo, TicketX, Users2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ActivityFeed } from "@/features/activity/components/activity-feed";
import { getProjectById, getProjectStats } from "@/services/projects";
import { listActivity } from "@/services/activity";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: "Project overview" };

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const project = await getProjectById(projectId);
  if (!project) notFound();

  const [stats, activity] = await Promise.all([
    getProjectStats(projectId),
    listActivity({ projectId, limit: 10 }),
  ]);

  const progress =
    stats.tasksTotal === 0
      ? 0
      : Math.round((stats.tasksCompleted / stats.tasksTotal) * 100);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Project progress</CardTitle>
            <span className="text-2xl font-semibold">{progress}%</span>
          </CardHeader>
          <CardContent>
            <Progress value={progress} />
            <p className="text-muted-foreground mt-2 text-xs">
              {stats.tasksCompleted} of {stats.tasksTotal} task
              {stats.tasksTotal === 1 ? "" : "s"} completed
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard
            icon={CheckCircle2}
            label="Tasks completed"
            value={String(stats.tasksCompleted)}
            hint={`of ${stats.tasksTotal} total`}
          />
          <StatCard
            icon={ListTodo}
            label="Tasks remaining"
            value={String(Math.max(stats.tasksTotal - stats.tasksCompleted, 0))}
            hint="still in progress"
          />
          <StatCard
            icon={TicketX}
            label="Open issues"
            value={String(stats.issuesOpen)}
            hint="needing attention"
          />
          <StatCard
            icon={Users2}
            label="Team"
            value={String(stats.activeMembers)}
            hint="active members"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Technology stack</CardTitle>
          </CardHeader>
          <CardContent>
            {project.tech_stack.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No technologies listed yet - add some from Settings.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {project.tech_stack.map((tech) => (
                  <Badge key={tech} variant="secondary" className="font-normal">
                    {tech}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="font-medium">Recent activity</h2>
        <ActivityFeed events={activity} />
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof ListTodo;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-muted-foreground text-sm font-medium">
          {label}
        </CardTitle>
        <Icon className="text-muted-foreground size-4" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
        <p className="text-muted-foreground text-xs">{hint}</p>
      </CardContent>
    </Card>
  );
}
