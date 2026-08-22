import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

// Next.js 16 renamed middleware.ts -> proxy.ts (Node runtime only, no more
// edge runtime option). This is the single choke point where every request
// gets its Supabase session refreshed and protected routes get enforced.
//
// Deliberately does NOT record metrics here (Phase 15 considered it, since
// this is the one place that sees every request): proxy.ts runs in an
// isolated context even when self-hosted, confirmed by testing - an
// in-memory counter incremented here is invisible to /api/metrics, which
// reads a registry in the main server process. Whole-app request
// rate/latency/error-rate instead comes from Traefik's own Prometheus
// metrics (kubernetes/monitoring/), which sit in front of every request
// for a real, non-isolated reason: it's a genuinely separate process. See
// docs/devops-roadmap.md Phase 15.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
