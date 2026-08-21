"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CalendarDays, LayoutList } from "lucide-react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { TaskDetailSheet } from "@/features/tasks/components/task-detail-sheet";
import { updateTaskStatusAction } from "@/features/tasks/actions";
import { TASK_PRIORITY_META, TASK_STATUS_META, TASK_STATUS_ORDER } from "@/config/status";
import { cn, initials } from "@/lib/utils";
import type { Task } from "@/services/tasks";
import type { TaskStatus } from "@/types/database";

export function TaskBoard({ projectId, tasks }: { projectId: string; tasks: Task[] }) {
  const [taskList, setTaskList] = useState(tasks);
  // Resync with the server-provided list whenever the prop identity
  // changes (new task created, revalidation after this component's own
  // status updates, etc). Adjusting state during render - rather than in
  // an effect - avoids an extra render pass; see
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes.
  // Optimistic moves already reflect the same end state by then, so this
  // doesn't cause a visible jump.
  const [tasksSnapshot, setTasksSnapshot] = useState(tasks);
  if (tasks !== tasksSnapshot) {
    setTasksSnapshot(tasks);
    setTaskList(tasks);
  }

  const [selected, setSelected] = useState<Task | null>(null);
  const [open, setOpen] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={LayoutList}
        title="No tasks yet"
        description="Create the first task to start planning this project's work."
      />
    );
  }

  const columns = TASK_STATUS_ORDER.map((status) => ({
    status,
    tasks: taskList.filter((t) => t.status === status),
  }));

  function handleDragStart(event: DragStartEvent) {
    setActiveTask(taskList.find((t) => t.id === event.active.id) ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const newStatus = over.id as TaskStatus;
    const task = taskList.find((t) => t.id === active.id);
    if (!task || task.status === newStatus) return;

    const previousStatus = task.status;
    setTaskList((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t)),
    );

    updateTaskStatusAction({ taskId: task.id, status: newStatus }).catch((error) => {
      toast.error(error instanceof Error ? error.message : "Couldn't move task.");
      setTaskList((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: previousStatus } : t)),
      );
    });
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map((column) => (
            <div key={column.status} className="w-72 shrink-0">
              <div className="mb-2 flex items-center justify-between px-1">
                <h3 className="text-sm font-medium">
                  {TASK_STATUS_META[column.status].label}
                </h3>
                <span className="text-muted-foreground text-xs">
                  {column.tasks.length}
                </span>
              </div>
              <DroppableColumn status={column.status}>
                {column.tasks.map((task) => (
                  <DraggableTaskCard
                    key={task.id}
                    task={task}
                    onOpen={() => {
                      setSelected(task);
                      setOpen(true);
                    }}
                  />
                ))}
              </DroppableColumn>
            </div>
          ))}
        </div>
        <DragOverlay>
          {activeTask ? <TaskCardBody task={activeTask} dragging /> : null}
        </DragOverlay>
      </DndContext>
      <TaskDetailSheet
        task={selected}
        projectId={projectId}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}

function DroppableColumn({
  status,
  children,
}: {
  status: TaskStatus;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-24 space-y-2 rounded-lg p-1 transition-colors",
        isOver && "bg-primary/5 ring-1 ring-primary/20",
      )}
    >
      {children}
    </div>
  );
}

function DraggableTaskCard({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
  });

  return (
    <div ref={setNodeRef} {...listeners} {...attributes}>
      <TaskCardBody task={task} onClick={onOpen} dragging={isDragging} />
    </div>
  );
}

function TaskCardBody({
  task,
  onClick,
  dragging,
}: {
  task: Task;
  onClick?: () => void;
  dragging?: boolean;
}) {
  const priority = TASK_PRIORITY_META[task.priority];

  return (
    <Card
      onClick={onClick}
      className={cn(
        "touch-none gap-2 p-3 transition-colors hover:border-primary/40 active:cursor-grabbing",
        onClick && "cursor-grab",
        dragging && "opacity-50 shadow-lg",
      )}
    >
      <p className="text-sm leading-snug font-medium">{task.title}</p>
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="outline" className="text-[10px] font-normal">
          {priority.label}
        </Badge>
        {task.labels.slice(0, 2).map((label) => (
          <Badge key={label} variant="secondary" className="text-[10px] font-normal">
            {label}
          </Badge>
        ))}
      </div>
      <div className="flex items-center justify-between pt-1">
        {task.due_date ? (
          <span className="text-muted-foreground flex items-center gap-1 text-xs">
            <CalendarDays className="size-3" />
            {new Date(task.due_date).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </span>
        ) : (
          <span />
        )}
        {task.assignee && (
          <Avatar className="size-6">
            <AvatarImage src={task.assignee.avatar_url ?? undefined} alt="" />
            <AvatarFallback className="text-[10px]">
              {initials(task.assignee.full_name ?? task.assignee.email)}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </Card>
  );
}
