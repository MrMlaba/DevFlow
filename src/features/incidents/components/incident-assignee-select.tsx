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
import { updateIncidentAssigneeAction } from "@/features/incidents/actions";

export function IncidentAssigneeSelect({
  incidentId,
  assigneeId,
  members,
}: {
  incidentId: string;
  assigneeId: string | null;
  members: { id: string; name: string }[];
}) {
  // Local, optimistic state - see IncidentStatusSelect for why a pure
  // prop-controlled Select isn't safe here, and for why this resets on a
  // prop change directly in the render body rather than in an effect.
  const normalized = assigneeId ?? "unassigned";
  const [prevAssignee, setPrevAssignee] = useState(normalized);
  const [value, setValue] = useState(normalized);
  if (normalized !== prevAssignee) {
    setPrevAssignee(normalized);
    setValue(normalized);
  }

  async function onChange(next: string | null) {
    if (!next || next === value) return;
    const previous = value;
    setValue(next);
    try {
      await updateIncidentAssigneeAction({
        incidentId,
        assigneeId: next === "unassigned" ? null : next,
      });
    } catch (error) {
      setValue(previous);
      toast.error(error instanceof Error ? error.message : "Couldn't update assignee.");
    }
  }

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger size="sm" className="w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="unassigned">Unassigned</SelectItem>
        {members.map((member) => (
          <SelectItem key={member.id} value={member.id}>
            {member.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
