"use client";

import { useActionState, useState } from "react";
import { MessageSquarePlus } from "lucide-react";

import { addIncidentUpdateAction } from "@/features/incidents/actions";
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
import { INCIDENT_SEVERITY_META } from "@/config/status";
import type { IncidentSeverity } from "@/types/database";

export function AddIncidentUpdateDialog({
  incidentId,
  currentSeverity,
}: {
  incidentId: string;
  currentSeverity: IncidentSeverity;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(async (prev: FormState, formData: FormData) => {
    const result = await addIncidentUpdateAction(prev, formData);
    if (result.status === "success") setOpen(false);
    return result;
  }, initialFormState);
  const [severity, setSeverity] = useState<IncidentSeverity | "">("");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <MessageSquarePlus />
        Add update
      </DialogTrigger>
      <DialogContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="incidentId" value={incidentId} />
          <DialogHeader>
            <DialogTitle>Post an update</DialogTitle>
            <DialogDescription>
              Added to this incident&apos;s timeline. Root cause and resolution, if filled in,
              replace what&apos;s shown on the incident.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="update-message">Update</Label>
            <Textarea
              id="update-message"
              name="message"
              rows={3}
              required
              placeholder="What's changed since the last update?"
            />
            <FieldError messages={state.fieldErrors?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="update-severity">Re-triage severity</Label>
            <Select
              value={severity || "unchanged"}
              onValueChange={(v) => setSeverity(v === "unchanged" ? "" : (v as IncidentSeverity))}
            >
              <SelectTrigger id="update-severity" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unchanged">
                  No change ({INCIDENT_SEVERITY_META[currentSeverity].label})
                </SelectItem>
                {Object.entries(INCIDENT_SEVERITY_META).map(([value, meta]) => (
                  <SelectItem key={value} value={value}>
                    {meta.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" name="severity" value={severity} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="update-root-cause">Root cause</Label>
            <Textarea id="update-root-cause" name="rootCause" rows={2} placeholder="Optional" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="update-resolution">Resolution</Label>
            <Textarea id="update-resolution" name="resolution" rows={2} placeholder="Optional" />
          </div>
          {state.status === "error" && (
            <p className="text-destructive text-sm">{state.message}</p>
          )}
          <DialogFooter>
            <SubmitButton pendingText="Posting...">Post update</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
