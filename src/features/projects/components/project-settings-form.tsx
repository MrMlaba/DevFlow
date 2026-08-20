"use client";

import { useActionState, useState } from "react";

import { updateProjectAction } from "@/features/projects/actions";
import { initialFormState } from "@/lib/form-state";
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
import type { Project } from "@/services/projects";

const STATUS_OPTIONS: { value: Project["status"]; label: string }[] = [
  { value: "planning", label: "Planning" },
  { value: "active", label: "Active" },
  { value: "on_hold", label: "On Hold" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

export function ProjectSettingsForm({ project }: { project: Project }) {
  const [state, formAction] = useActionState(updateProjectAction, initialFormState);
  const [status, setStatus] = useState(project.status);

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      <input type="hidden" name="projectId" value={project.id} />
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={project.name} required />
        <FieldError messages={state.fieldErrors?.name} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={project.description ?? ""}
        />
        <FieldError messages={state.fieldErrors?.description} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="repositoryUrl">Repository URL</Label>
        <Input
          id="repositoryUrl"
          name="repositoryUrl"
          defaultValue={project.repository_url ?? ""}
          placeholder="https://github.com/org/repo"
        />
        <FieldError messages={state.fieldErrors?.repositoryUrl} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="techStack">Technology stack</Label>
        <Input
          id="techStack"
          name="techStack"
          defaultValue={project.tech_stack.join(", ")}
        />
        <p className="text-muted-foreground text-xs">Comma-separated</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select
          value={status}
          onValueChange={(v) => v && setStatus(v as Project["status"])}
        >
          <SelectTrigger id="status" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input type="hidden" name="status" value={status} />
      </div>
      {state.status === "error" && (
        <p className="text-destructive text-sm">{state.message}</p>
      )}
      {state.status === "success" && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          {state.message}
        </p>
      )}
      <SubmitButton pendingText="Saving...">Save changes</SubmitButton>
    </form>
  );
}
