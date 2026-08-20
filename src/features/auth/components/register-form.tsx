"use client";

import { useActionState } from "react";

import { signUp } from "@/features/auth/actions";
import { initialFormState } from "@/lib/form-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import { FieldError } from "@/components/field-error";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2 } from "lucide-react";

export function RegisterForm() {
  const [state, formAction] = useActionState(signUp, initialFormState);

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
        <Label htmlFor="fullName">Full name</Label>
        <Input
          id="fullName"
          name="fullName"
          autoComplete="name"
          placeholder="Ada Lovelace"
          required
        />
        <FieldError messages={state.fieldErrors?.fullName} />
      </div>
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
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
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
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
        />
        <FieldError messages={state.fieldErrors?.confirmPassword} />
      </div>
      {state.status === "error" && !state.fieldErrors && (
        <p className="text-destructive text-sm">{state.message}</p>
      )}
      <SubmitButton className="w-full" pendingText="Creating account...">
        Create account
      </SubmitButton>
    </form>
  );
}
