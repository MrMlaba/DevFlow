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
import { updateIncidentStatusAction } from "@/features/incidents/actions";
import { INCIDENT_STATUS_META } from "@/config/status";
import type { IncidentStatus } from "@/types/database";

const ORDER: IncidentStatus[] = ["investigating", "identified", "monitoring", "resolved"];

export function IncidentStatusSelect({
  incidentId,
  status,
}: {
  incidentId: string;
  status: IncidentStatus;
}) {
  // Local, optimistic state instead of a pure prop pass-through: the
  // server prop only catches up once revalidatePath's refresh lands, which
  // isn't instant. In the gap, a Select whose `value` is just `status`
  // snaps back to the stale prop and Base UI re-fires onValueChange for
  // that snap - producing a bogus "changed from X back to X" timeline
  // entry (found via Playwright testing against the real database).
  // "Adjusting state when a prop changes," React's own recommended pattern
  // for this (react.dev/learn/you-might-not-need-an-effect) - setState
  // directly in the render body rather than in an effect, which React
  // special-cases to avoid an extra render pass.
  const [prevStatus, setPrevStatus] = useState(status);
  const [value, setValue] = useState(status);
  if (status !== prevStatus) {
    setPrevStatus(status);
    setValue(status);
  }

  async function onChange(next: string | null) {
    if (!next || next === value) return;
    const previous = value;
    setValue(next as IncidentStatus);
    try {
      await updateIncidentStatusAction({ incidentId, status: next as IncidentStatus });
    } catch (error) {
      setValue(previous);
      toast.error(error instanceof Error ? error.message : "Couldn't update status.");
    }
  }

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger size="sm" className="w-36">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ORDER.map((s) => (
          <SelectItem key={s} value={s}>
            {INCIDENT_STATUS_META[s].label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
