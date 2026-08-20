"use client";

import { useActionState, useState } from "react";

import { createTaskAction } from "@/features/tasks/actions";
import { initialFormState, type FormState } from "@/lib/form-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubmitButton } from "@/components/submit-button";
import { FieldError } from "@/components/field-error";
import { AssigneeSelect, type AssigneeOption } from "@/components/assignee-select";
import { TASK_PRIORITY_META } from "@/config/status";
import { Plus } from "lucide-react";
import type { TaskPriority } from "@/types/database";

export function CreateTaskDialog({
  projectId,
  members,
}: {
  projectId: string;
  members: AssigneeOption[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(async (prev: FormState, formData: FormData) => {
    const result = await createTaskAction(prev, formData);
    if (result.status === "success") setOpen(false);
    return result;
  }, initialFormState);
  const [priority, setPriority] = useState<TaskPriority>("medium");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus />
        New task
      </DialogTrigger>
      <DialogContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="status" value="backlog" />
          <DialogHeader>
            <DialogTitle>Create a task</DialogTitle>
            <DialogDescription>New tasks start in Backlog.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="task-title">Title</Label>
            <Input id="task-title" name="title" required placeholder="Implement authentication" />
            <FieldError messages={state.fieldErrors?.title} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-description">Description</Label>
            <Textarea id="task-description" name="description" rows={3} />
            <FieldError messages={state.fieldErrors?.description} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="task-priority">Priority</Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as TaskPriority)}
              >
                <SelectTrigger id="task-priority" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TASK_PRIORITY_META).map(([value, meta]) => (
                    <SelectItem key={value} value={value}>
                      {meta.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="priority" value={priority} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-assignee">Assignee</Label>
              <AssigneeSelect name="assigneeId" options={members} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-due">Due date</Label>
            <Input id="task-due" name="dueDate" type="date" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-labels">Labels</Label>
            <Input id="task-labels" name="labels" placeholder="frontend, bug" />
            <p className="text-muted-foreground text-xs">Comma-separated</p>
          </div>
          {state.status === "error" && (
            <p className="text-destructive text-sm">{state.message}</p>
          )}
          <DialogFooter>
            <SubmitButton pendingText="Creating...">Create task</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
