import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { requireUser } from "@/services/auth";
import { env } from "@/config/env";
import { exchangeCodeForToken, getAuthenticatedUser } from "@/lib/github";
import { upsertGitHubAccount } from "@/services/github";
import { withMetrics } from "@/lib/metrics";

export const GET = withMetrics("/api/github/oauth/callback", async (request) => {
  const user = await requireUser();
  const { searchParams, origin } = new URL(request.url);
  const cookieStore = await cookies();

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const cookieState = cookieStore.get("gh_oauth_state")?.value;
  const next = cookieStore.get("gh_oauth_next")?.value ?? "/settings";

  cookieStore.delete("gh_oauth_state");
  cookieStore.delete("gh_oauth_next");

  if (!code || !state || !cookieState || state !== cookieState) {
    return NextResponse.redirect(`${origin}${next}?github_error=invalid_state`);
  }

  try {
    const { accessToken, scope } = await exchangeCodeForToken({
      clientId: env.githubClientId(),
      clientSecret: env.githubClientSecret(),
      code,
      redirectUri: `${env.siteUrl()}/api/github/oauth/callback`,
    });

    const githubUser = await getAuthenticatedUser(accessToken);

    await upsertGitHubAccount({
      userId: user.id,
      githubUserId: githubUser.id,
      githubUsername: githubUser.login,
      avatarUrl: githubUser.avatar_url,
      accessToken,
      scope,
    });
  } catch (error) {
    console.error("GitHub OAuth callback failed", error);
    return NextResponse.redirect(`${origin}${next}?github_error=connection_failed`);
  }

  return NextResponse.redirect(`${origin}${next}?github_connected=1`);
});
