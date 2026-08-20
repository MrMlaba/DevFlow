"use client";

import { useActionState } from "react";

import { updateProfile } from "@/features/auth/actions";
import { initialFormState } from "@/lib/form-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/submit-button";
import { FieldError } from "@/components/field-error";
import type { Profile } from "@/services/auth";

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, formAction] = useActionState(updateProfile, initialFormState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={profile.email} disabled />
        <p className="text-muted-foreground text-xs">
          Email changes aren&apos;t supported yet.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="fullName">Full name</Label>
        <Input
          id="fullName"
          name="fullName"
          defaultValue={profile.full_name ?? ""}
          required
        />
        <FieldError messages={state.fieldErrors?.fullName} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          name="bio"
          rows={3}
          defaultValue={profile.bio ?? ""}
          placeholder="What are you working on?"
        />
        <FieldError messages={state.fieldErrors?.bio} />
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
