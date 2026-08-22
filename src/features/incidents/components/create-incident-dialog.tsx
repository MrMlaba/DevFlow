"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";

import { createIncidentAction } from "@/features/incidents/actions";
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
import { INCIDENT_SEVERITY_META } from "@/config/status";
import type { IncidentSeverity } from "@/types/database";

export function CreateIncidentDialog({
  projects,
}: {
  projects: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(async (prev: FormState, formData: FormData) => {
    const result = await createIncidentAction(prev, formData);
    if (result.status === "success") setOpen(false);
    return result;
  }, initialFormState);
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [severity, setSeverity] = useState<IncidentSeverity>("medium");

  if (projects.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus />
        Report incident
      </DialogTrigger>
      <DialogContent>
        <form action={formAction} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Report an incident</DialogTitle>
            <DialogDescription>
              Something&apos;s broken in production. Get it visible first - details can follow.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="incident-project">Project</Label>
            <Select value={projectId} onValueChange={(v) => v && setProjectId(v)}>
              <SelectTrigger id="incident-project" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" name="projectId" value={projectId} />
            <FieldError messages={state.fieldErrors?.projectId} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="incident-title">Title</Label>
            <Input
              id="incident-title"
              name="title"
              required
              placeholder="Error rate spike on production API"
            />
            <FieldError messages={state.fieldErrors?.title} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="incident-description">Description</Label>
            <Textarea id="incident-description" name="description" rows={3} />
            <FieldError messages={state.fieldErrors?.description} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="incident-severity">Severity</Label>
              <Select
                value={severity}
                onValueChange={(v) => v && setSeverity(v as IncidentSeverity)}
              >
                <SelectTrigger id="incident-severity" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
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
              <Label htmlFor="incident-service">Service</Label>
              <Input id="incident-service" name="service" placeholder="Optional" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="incident-deployment">Related deployment</Label>
            <Input
              id="incident-deployment"
              name="relatedDeployment"
              placeholder="Optional - a SHA, tag, or deployment URL"
            />
          </div>
          {state.status === "error" && (
            <p className="text-destructive text-sm">{state.message}</p>
          )}
          <DialogFooter>
            <SubmitButton pendingText="Reporting...">Report incident</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
