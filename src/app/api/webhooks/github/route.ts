import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { verifyWebhookSignature } from "@/lib/github";
import { logActivity } from "@/services/activity";
import type { ProjectRepository } from "@/services/github";
import { withMetrics } from "@/lib/metrics";

/**
 * Receives GitHub webhook deliveries. No DevFlow user session exists here
 * (GitHub doesn't send our auth cookie) - the request is authenticated by
 * verifying the HMAC-SHA256 signature against the per-repository secret
 * generated when the repo was connected (src/services/github.ts,
 * connectRepository). All writes use the admin client accordingly.
 *
 * Note for local development: GitHub can't deliver webhooks to
 * http://localhost - either use a tunnel (ngrok, Cloudflare Tunnel) during
 * this phase, or rely on the manual "Sync now" button, which doesn't need
 * a public URL. Real-time delivery works automatically once deployed.
 */
export const POST = withMetrics("/api/webhooks/github", async (request) => {
  const rawBody = await request.text();
  const event = request.headers.get("x-github-event");
  const signature = request.headers.get("x-hub-signature-256");

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const repoFullName = (payload.repository as { full_name?: string } | undefined)
    ?.full_name;
  if (!repoFullName) {
    return NextResponse.json({ error: "No repository in payload" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: repository } = await admin
    .from("project_repositories")
    .select("*")
    .eq("full_name", repoFullName)
    .maybeSingle();

  if (!repository) {
    // Not an error - could be a stale webhook from a repo that was
    // disconnected without GitHub-side cleanup succeeding.
    return NextResponse.json({ ok: true, ignored: "unknown repository" });
  }

  if (!verifyWebhookSignature(rawBody, signature, repository.webhook_secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  if (event === "ping") {
    return NextResponse.json({ ok: true });
  }

  try {
    switch (event) {
      case "push":
        await handlePush(admin, repository, payload);
        break;
      case "pull_request":
        await handlePullRequest(admin, repository, payload);
        break;
      case "issues":
        await handleIssues(admin, repository, payload);
        break;
      case "release":
        await handleRelease(admin, repository, payload);
        break;
      default:
        break;
    }
  } catch (error) {
    console.error(`Failed processing GitHub webhook event "${event}"`, error);
    // Still 200 - GitHub retries on non-2xx, and a processing bug shouldn't
    // cause redelivery storms.
  }

  return NextResponse.json({ ok: true });
});

type AdminClient = ReturnType<typeof createAdminClient>;

interface PushPayload {
  ref: string;
  commits: {
    id: string;
    message: string;
    url: string;
    timestamp: string;
    author: { name: string; username?: string };
  }[];
  pusher: { name: string };
}

async function handlePush(
  admin: AdminClient,
  repository: ProjectRepository,
  payload: Record<string, unknown>,
) {
  const push = payload as unknown as PushPayload;
  const commits = push.commits ?? [];
  if (commits.length === 0) return;

  await admin.from("github_commits").upsert(
    commits.map((c) => ({
      project_id: repository.project_id,
      sha: c.id,
      message: c.message.split("\n")[0]!.slice(0, 500),
      author_name: c.author.name,
      author_login: c.author.username ?? null,
      author_avatar_url: null,
      html_url: c.url,
      committed_at: c.timestamp,
    })),
    { onConflict: "project_id,sha" },
  );

  const branch = push.ref.replace("refs/heads/", "");
  await logActivity(
    {
      projectId: repository.project_id,
      eventType: "repository.push",
      objectType: "commit",
      description: `${push.pusher.name} pushed ${commits.length} commit${commits.length === 1 ? "" : "s"} to ${branch}`,
    },
    admin,
  );
}

interface PullRequestPayload {
  action: string;
  number: number;
  pull_request: {
    title: string;
    state: string;
    merged_at: string | null;
    closed_at: string | null;
    created_at: string;
    updated_at: string;
    html_url: string;
    user: { login: string; avatar_url: string };
    head: { ref: string };
    base: { ref: string };
    additions: number;
    deletions: number;
    changed_files: number;
  };
}

async function handlePullRequest(
  admin: AdminClient,
  repository: ProjectRepository,
  payload: Record<string, unknown>,
) {
  const body = payload as unknown as PullRequestPayload;
  const pr = body.pull_request;

  await admin.from("github_pull_requests").upsert(
    {
      project_id: repository.project_id,
      number: body.number,
      title: pr.title,
      state: pr.state,
      is_merged: Boolean(pr.merged_at),
      author_login: pr.user.login,
      author_avatar_url: pr.user.avatar_url,
      source_branch: pr.head.ref,
      target_branch: pr.base.ref,
      additions: pr.additions,
      deletions: pr.deletions,
      changed_files: pr.changed_files,
      html_url: pr.html_url,
      github_created_at: pr.created_at,
      github_updated_at: pr.updated_at,
      merged_at: pr.merged_at,
      closed_at: pr.closed_at,
    },
    { onConflict: "project_id,number" },
  );

  if (!["opened", "closed", "reopened"].includes(body.action)) return;

  const description =
    body.action === "closed" && pr.merged_at
      ? `merged pull request #${body.number} "${pr.title}"`
      : `${body.action} pull request #${body.number} "${pr.title}"`;

  await logActivity(
    {
      projectId: repository.project_id,
      eventType:
        body.action === "closed" && pr.merged_at
          ? "pull_request.merged"
          : `pull_request.${body.action}`,
      objectType: "pull_request",
      description: `${pr.user.login} ${description}`,
    },
    admin,
  );
}

interface IssuesPayload {
  action: string;
  issue: {
    number: number;
    title: string;
    html_url: string;
    user: { login: string };
  };
}

async function handleIssues(
  admin: AdminClient,
  repository: ProjectRepository,
  payload: Record<string, unknown>,
) {
  const body = payload as unknown as IssuesPayload;
  if (!["opened", "closed", "reopened"].includes(body.action)) return;

  await logActivity(
    {
      projectId: repository.project_id,
      eventType: `github_issue.${body.action}`,
      objectType: "github_issue",
      description: `${body.issue.user.login} ${body.action} GitHub issue #${body.issue.number} "${body.issue.title}"`,
    },
    admin,
  );
}

interface ReleasePayload {
  action: string;
  release: {
    tag_name: string;
    name: string | null;
    html_url: string;
    author: { login: string };
  };
}

async function handleRelease(
  admin: AdminClient,
  repository: ProjectRepository,
  payload: Record<string, unknown>,
) {
  const body = payload as unknown as ReleasePayload;
  if (body.action !== "published") return;

  await logActivity(
    {
      projectId: repository.project_id,
      eventType: "release.published",
      objectType: "release",
      description: `${body.release.author.login} published release ${body.release.name ?? body.release.tag_name}`,
    },
    admin,
  );
}
