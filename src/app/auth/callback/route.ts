import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Handles Supabase's PKCE email links: signup confirmation, password
 * recovery, and (later) OAuth. Supabase redirects here with a `code` query
 * param; we exchange it for a session and continue to the destination.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/overview";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
