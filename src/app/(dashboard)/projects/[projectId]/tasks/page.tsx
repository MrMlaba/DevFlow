import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TaskBoard } from "@/features/tasks/components/task-board";
import { CreateTaskDialog } from "@/features/tasks/components/create-task-dialog";
import { getProjectById, listProjectMembers } from "@/services/projects";
import { listProjectTasks } from "@/services/tasks";

export const metadata: Metadata = { title: "Tasks" };

export default async function ProjectTasksPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const project = await getProjectById(projectId);
  if (!project) notFound();

  const [tasks, members] = await Promise.all([
    listProjectTasks(projectId),
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
          {tasks.length} task{tasks.length === 1 ? "" : "s"}
        </p>
        <CreateTaskDialog projectId={projectId} members={assigneeOptions} />
      </div>
      <TaskBoard projectId={projectId} tasks={tasks} />
    </div>
  );
}
