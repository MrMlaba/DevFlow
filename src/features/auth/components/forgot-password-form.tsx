"use client";

import { useActionState } from "react";

import { requestPasswordReset } from "@/features/auth/actions";
import { initialFormState } from "@/lib/form-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import { FieldError } from "@/components/field-error";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2 } from "lucide-react";

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(
    requestPasswordReset,
    initialFormState,
  );

  if (state.status === "success") {
    return (
      <Alert>
        <CheckCircle2 className="size-4" />
        <AlertDescription>{state.message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@university.edu"
          required
        />
        <FieldError messages={state.fieldErrors?.email} />
      </div>
      {state.status === "error" && (
        <p className="text-destructive text-sm">{state.message}</p>
      )}
      <SubmitButton className="w-full" pendingText="Sending link...">
        Send reset link
      </SubmitButton>
    </form>
  );
}
