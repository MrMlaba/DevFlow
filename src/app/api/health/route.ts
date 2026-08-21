import { NextResponse } from "next/server";

/**
 * Liveness check: "is the Next.js server process up and responding,"
 * not "can it reach Supabase" - deliberately cheap so Docker's
 * HEALTHCHECK (and later Kubernetes probes, Phase 13/14) can poll it
 * often without adding load or flagging the container unhealthy during a
 * transient Supabase blip that isn't this process's fault.
 */
export async function GET() {
  return NextResponse.json({ status: "ok" });
}
