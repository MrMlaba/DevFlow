"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { env } from "@/config/env";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from "@/lib/validations/auth";
import { fromZodError, type FormState } from "@/lib/form-state";
import { redeemInvitationsForEmail } from "@/services/members";

export async function signUp(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = registerSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${env.siteUrl()}/auth/callback`,
    },
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  if (data.user) {
    await redeemInvitationsForEmail(data.user.id, parsed.data.email);
  }

  if (data.session) {
    redirect("/overview");
  }

  return {
    status: "success",
    message:
      "Check your email to confirm your account before signing in.",
  };
}

export async function signIn(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { status: "error", message: "Incorrect email or password." };
  }

  const redirectTo = formData.get("redirect");
  redirect(typeof redirectTo === "string" && redirectTo ? redirectTo : "/overview");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordReset(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${env.siteUrl()}/auth/callback?next=/reset-password`,
  });

  // Always return the same message, whether or not the email exists, so
  // this endpoint can't be used to enumerate registered accounts.
  return {
    status: "success",
    message:
      "If an account exists for that email, a password reset link is on its way.",
  };
}

export async function updatePassword(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) return { status: "error", message: error.message };

  redirect("/overview");
}

export async function updateProfile(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = updateProfileSchema.safeParse({
    fullName: formData.get("fullName"),
    bio: formData.get("bio"),
  });
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      bio: parsed.data.bio || null,
    })
    .eq("id", user.id);

  if (error) return { status: "error", message: error.message };

  revalidatePath("/settings");
  return { status: "success", message: "Profile updated." };
}
