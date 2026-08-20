"use client";

import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types/database";
import { env } from "@/config/env";

/**
 * Supabase client for use in Client Components. Uses the anon key, so it is
 * safe to expose to the browser - all data access is still enforced by
 * Postgres row-level security policies (see database/migrations/).
 */
export function createClient() {
  return createBrowserClient<Database>(
    env.supabaseUrl(),
    env.supabaseAnonKey(),
  );
}
