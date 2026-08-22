import { NextResponse } from "next/server";
import crypto from "node:crypto";

import { requireUser } from "@/services/auth";
import { env } from "@/config/env";
import { buildAuthorizeUrl } from "@/lib/github";
import { withMetrics } from "@/lib/metrics";

/**
 * Kicks off the GitHub OAuth flow for connecting the signed-in user's
 * GitHub account (not a specific repo - see /projects/[id]/settings for
 * that). `next` controls where the callback sends them back to.
 */
export const GET = withMetrics("/api/github/oauth/start", async (request) => {
  await requireUser();

  const { searchParams } = new URL(request.url);
  const requestedNext = searchParams.get("next");
  // Only allow same-site relative paths - a "next" starting with "//" or
  // containing a scheme would otherwise be an open-redirect vector once
  // the callback route appends it to the app's origin.
  const next =
    requestedNext && requestedNext.startsWith("/") && !requestedNext.startsWith("//")
      ? requestedNext
      : "/settings";

  const state = crypto.randomBytes(16).toString("hex");
  const redirectUri = `${env.siteUrl()}/api/github/oauth/callback`;

  const authorizeUrl = buildAuthorizeUrl({
    clientId: env.githubClientId(),
    redirectUri,
    state,
  });

  const response = NextResponse.redirect(authorizeUrl);
  // Short-lived, httpOnly cookie to verify the callback's state param
  // (CSRF protection for the OAuth flow) and to remember where to send
  // the user back to.
  response.cookies.set("gh_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  response.cookies.set("gh_oauth_next", next, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return response;
});
