"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateTaskStatusAction } from "@/features/tasks/actions";
import { TASK_STATUS_META, TASK_STATUS_ORDER } from "@/config/status";
import type { TaskStatus } from "@/types/database";

export function TaskStatusSelect({
  taskId,
  status,
  disabled,
}: {
  taskId: string;
  status: TaskStatus;
  disabled?: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function onChange(next: string | null) {
    if (!next) return;
    startTransition(async () => {
      try {
        await updateTaskStatusAction({ taskId, status: next as TaskStatus });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Couldn't update status.");
      }
    });
  }

  return (
    <Select value={status} onValueChange={onChange} disabled={disabled || isPending}>
      <SelectTrigger size="sm" className="w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {TASK_STATUS_ORDER.map((s) => (
          <SelectItem key={s} value={s}>
            {TASK_STATUS_META[s].label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
