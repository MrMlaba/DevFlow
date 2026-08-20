"use client";

import { useActionState } from "react";

import { updatePassword } from "@/features/auth/actions";
import { initialFormState } from "@/lib/form-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import { FieldError } from "@/components/field-error";

export function ResetPasswordForm() {
  const [state, formAction] = useActionState(updatePassword, initialFormState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
        />
        <FieldError messages={state.fieldErrors?.password} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
        />
        <FieldError messages={state.fieldErrors?.confirmPassword} />
      </div>
      {state.status === "error" && (
        <p className="text-destructive text-sm">{state.message}</p>
      )}
      <SubmitButton className="w-full" pendingText="Updating...">
        Update password
      </SubmitButton>
    </form>
  );
}
