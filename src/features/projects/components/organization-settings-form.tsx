"use client";

import { useActionState } from "react";

import { updateOrganizationAction } from "@/features/projects/actions";
import { initialFormState } from "@/lib/form-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/submit-button";
import { FieldError } from "@/components/field-error";
import type { Organization } from "@/services/organizations";

export function OrganizationSettingsForm({ organization }: { organization: Organization }) {
  const [state, formAction] = useActionState(updateOrganizationAction, initialFormState);

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      <input type="hidden" name="organizationId" value={organization.id} />
      <div className="space-y-2">
        <Label htmlFor="org-name">Name</Label>
        <Input id="org-name" name="name" defaultValue={organization.name} required />
        <FieldError messages={state.fieldErrors?.name} />
      </div>
      <div className="space-y-2">
        <Label>Slug</Label>
        <Input value={organization.slug} disabled />
        <p className="text-muted-foreground text-xs">Slugs can&apos;t be changed yet.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="org-description">Description</Label>
        <Textarea
          id="org-description"
          name="description"
          rows={3}
          defaultValue={organization.description ?? ""}
        />
        <FieldError messages={state.fieldErrors?.description} />
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
