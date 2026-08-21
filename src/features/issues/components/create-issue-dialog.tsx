"use client";

import { useActionState, useState } from "react";

import { createIssueAction } from "@/features/issues/actions";
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
import { ISSUE_PRIORITY_META } from "@/config/status";
import { Plus } from "lucide-react";
import type { IssuePriority } from "@/types/database";

export function CreateIssueDialog({
  projectId,
  members,
  tasks,
}: {
  projectId: string;
  members: AssigneeOption[];
  tasks: AssigneeOption[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(async (prev: FormState, formData: FormData) => {
    const result = await createIssueAction(prev, formData);
    if (result.status === "success") setOpen(false);
    return result;
  }, initialFormState);
  const [priority, setPriority] = useState<IssuePriority>("medium");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus />
        New issue
      </DialogTrigger>
      <DialogContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="projectId" value={projectId} />
          <DialogHeader>
            <DialogTitle>Open an issue</DialogTitle>
            <DialogDescription>
              Track a bug, defect, or piece of follow-up work.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="issue-title">Title</Label>
            <Input
              id="issue-title"
              name="title"
              required
              placeholder="Password reset email lands in spam"
            />
            <FieldError messages={state.fieldErrors?.title} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="issue-description">Description</Label>
            <Textarea id="issue-description" name="description" rows={3} />
            <FieldError messages={state.fieldErrors?.description} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="issue-priority">Priority</Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as IssuePriority)}
              >
                <SelectTrigger id="issue-priority" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ISSUE_PRIORITY_META).map(([value, meta]) => (
                    <SelectItem key={value} value={value}>
                      {meta.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="priority" value={priority} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="issue-assignee">Assignee</Label>
              <AssigneeSelect name="assigneeId" options={members} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="issue-task">Link to task</Label>
            <AssigneeSelect
              name="linkedTaskId"
              options={tasks}
              label="No linked task"
            />
          </div>
          {state.status === "error" && (
            <p className="text-destructive text-sm">{state.message}</p>
          )}
          <DialogFooter>
            <SubmitButton pendingText="Opening...">Open issue</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
