import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import { env } from "@/config/env";

/**
 * Service-role Supabase client. Bypasses row-level security entirely, so it
 * must only be used for trusted server-side operations that RLS can't
 * express - e.g. looking up a user by email to send a project invite, or
 * the database seed script. Never import this into anything that could end
 * up in a Client Component bundle (the `server-only` import throws a build
 * error if that happens).
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    env.supabaseUrl(),
    env.supabaseServiceRoleKey(),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
