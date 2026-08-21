"use client";

import { useState } from "react";
import { toast } from "sonner";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateIssueLinkedTaskAction } from "@/features/issues/actions";
import type { AssigneeOption } from "@/components/assignee-select";

export function LinkedTaskSelect({
  issueId,
  tasks,
  currentTaskId,
}: {
  issueId: string;
  tasks: AssigneeOption[];
  currentTaskId: string | null;
}) {
  const [value, setValue] = useState(currentTaskId ?? "none");

  async function onChange(next: string | null) {
    if (!next) return;
    setValue(next);
    try {
      await updateIssueLinkedTaskAction({
        issueId,
        linkedTaskId: next === "none" ? null : next,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't update linked task.");
    }
  }

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger size="sm" className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">No linked task</SelectItem>
        {tasks.map((task) => (
          <SelectItem key={task.id} value={task.id}>
            {task.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
