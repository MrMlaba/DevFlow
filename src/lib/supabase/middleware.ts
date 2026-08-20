import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/config/env";

// Paths that don't require a signed-in session. Everything else redirects
// to /login. Keep this in sync with the routes under src/app/(auth)/ and
// any other public marketing/utility pages.
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
  "/auth/auth-code-error",
];

function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/api/")) return true;
  if (/\.(?:svg|png|jpg|jpeg|gif|webp|ico)$/.test(pathname)) return true;
  return false;
}

/**
 * Refreshes the Supabase session cookie on every request and redirects
 * unauthenticated users away from protected pages. Called from proxy.ts
 * (Next.js 16's replacement for middleware.ts).
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(env.supabaseUrl(), env.supabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        supabaseResponse = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          supabaseResponse.cookies.set(name, value, options);
        }
      },
    },
  });

  // IMPORTANT: avoid writing logic between createServerClient and getUser().
  // Any code there can inadvertently sever the token refresh.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  if (!user && !isPublicPath(pathname)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  if (user && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/overview", request.url));
  }

  return supabaseResponse;
}
