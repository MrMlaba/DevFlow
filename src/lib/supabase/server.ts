import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/types/database";
import { env } from "@/config/env";

/**
 * Supabase client for use in Server Components, Server Actions, and Route
 * Handlers. Reads/writes the session via Next's cookie store, so it always
 * reflects the currently signed-in user and is subject to RLS.
 *
 * `cookies()` is async in Next.js 16, so this factory is async too.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(env.supabaseUrl(), env.supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component render, where cookies can't be
          // written. Safe to ignore because proxy.ts refreshes the session
          // on every request.
        }
      },
    },
  });
}
