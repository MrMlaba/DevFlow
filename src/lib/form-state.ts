import type { z } from "zod";

/**
 * Shared shape for useActionState-driven server actions across the app.
 * `fieldErrors` mirrors zod's flattened field error format so forms can
 * show per-field messages without each action reinventing the shape.
 */
export interface FormState {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string[]>;
}

export const initialFormState: FormState = { status: "idle" };

export function fromZodError(error: z.ZodError): FormState {
  return {
    status: "error",
    message: "Please fix the highlighted fields.",
    fieldErrors: error.flatten().fieldErrors as Record<string, string[]>,
  };
}
