import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type Profile = Tables<"profiles">;

/**
 * Returns the signed-in user, or null. Safe to call from any server
 * context. Wrapped in React's `cache()` so calling it from a layout and
 * every page underneath it in the same request only hits Supabase once.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/** Returns the signed-in user's profile row, or null. */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return data;
});

/**
 * Use at the top of any page/layout/action that requires a signed-in user.
 * proxy.ts already redirects unauthenticated visitors away from protected
 * routes, so hitting this redirect in practice means the session expired
 * mid-request - this is the last line of defense, not the primary guard.
 */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireProfile(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  return profile;
}
