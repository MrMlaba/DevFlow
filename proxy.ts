import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

// Next.js 16 renamed middleware.ts -> proxy.ts (Node runtime only, no more
// edge runtime option). This is the single choke point where every request
// gets its Supabase session refreshed and protected routes get enforced.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
