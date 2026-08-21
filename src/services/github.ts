import "server-only";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/config/env";
import { logActivity } from "@/services/activity";
import type { Project } from "@/services/projects";
import type { Tables } from "@/types/database";
import * as gh from "@/lib/github";

export type GitHubAccount = Tables<"github_accounts">;
export type ProjectRepository = Tables<"project_repositories">;
export type GitHubCommitRow = Tables<"github_commits">;
export type GitHubPullRequestRow = Tables<"github_pull_requests"> & {
  linkedTask: Pick<Tables<"tasks">, "id" | "title"> | null;
};

// ---------------------------------------------------------------------------
// GitHub account connection (per-user OAuth)
// ---------------------------------------------------------------------------

export const getGitHubAccount = cache(async (userId: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("github_accounts")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as GitHubAccount | null;
});

export async function upsertGitHubAccount(input: {
  userId: string;
  githubUserId: number;
  githubUsername: string;
  avatarUrl: string;
  accessToken: string;
  scope: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("github_accounts").upsert(
    {
      user_id: input.userId,
      github_user_id: input.githubUserId,
      github_username: input.githubUsername,
      avatar_url: input.avatarUrl,
      access_token: input.accessToken,
      scope: input.scope,
      connected_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
}

export async function disconnectGitHubAccount(userId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("github_accounts")
    .delete()
    .eq("user_id", userId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Project <-> repository connection
// ---------------------------------------------------------------------------

export const getProjectRepository = cache(async (projectId: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_repositories")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();
  if (error) throw error;
  return data as ProjectRepository | null;
});

export async function connectRepository(input: {
  project: Project;
  ownerRepo: string;
  actorId: string;
  githubToken: string;
}) {
  const [owner, repoName] = input.ownerRepo.trim().split("/");
  if (!owner || !repoName) {
    throw new Error('Enter a repository as "owner/name", e.g. "octocat/hello-world".');
  }

  const repo = await gh.getRepo(input.githubToken, owner, repoName);
  const webhookSecret = gh.generateWebhookSecret();
  const webhookUrl = `${env.siteUrl()}/api/webhooks/github`;

  let webhookId: number | null = null;
  try {
    webhookId = await gh.createWebhook({
      token: input.githubToken,
      owner: repo.owner.login,
      repo: repo.name,
      url: webhookUrl,
      secret: webhookSecret,
    });
  } catch (error) {
    // Webhook registration can fail (e.g. no admin rights on the repo,
    // or - expected in local dev - GitHub can't reach a localhost URL).
    // Still connect the repo; manual "Sync now" works without a webhook.
    console.error("Failed to register GitHub webhook", error);
  }

  // project_repositories has no INSERT/UPDATE/DELETE policy for regular
  // sessions (see database/migrations/0010) - the action layer already
  // checked project:update permission above this call, so the write
  // itself goes through the admin client.
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("project_repositories")
    .insert({
      project_id: input.project.id,
      repo_id: repo.id,
      owner: repo.owner.login,
      name: repo.name,
      full_name: repo.full_name,
      default_branch: repo.default_branch,
      private: repo.private,
      html_url: repo.html_url,
      webhook_id: webhookId,
      webhook_secret: webhookSecret,
      connected_by: input.actorId,
    })
    .select()
    .single();
  if (error) throw error;

  await logActivity({
    projectId: input.project.id,
    organizationId: input.project.organization_id,
    actorId: input.actorId,
    eventType: "repository.connected",
    objectType: "project_repository",
    objectId: data.id,
    description: `connected GitHub repository "${repo.full_name}"`,
  });

  await syncRepository({ project: input.project, githubToken: input.githubToken });

  return data as ProjectRepository;
}

export async function disconnectRepository(input: {
  project: Project;
  repository: ProjectRepository;
  actorId: string;
  githubToken?: string;
}) {
  if (input.githubToken && input.repository.webhook_id) {
    try {
      await gh.deleteWebhook({
        token: input.githubToken,
        owner: input.repository.owner,
        repo: input.repository.name,
        webhookId: input.repository.webhook_id,
      });
    } catch (error) {
      console.error("Failed to remove GitHub webhook", error);
    }
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("project_repositories")
    .delete()
    .eq("id", input.repository.id);
  if (error) throw error;

  await logActivity({
    projectId: input.project.id,
    organizationId: input.project.organization_id,
    actorId: input.actorId,
    eventType: "repository.disconnected",
    objectType: "project_repository",
    objectId: input.repository.id,
    description: `disconnected GitHub repository "${input.repository.full_name}"`,
  });
}

// ---------------------------------------------------------------------------
// Manual sync (also called after connecting, and from the webhook handler
// isn't needed - webhooks upsert individual events themselves)
// ---------------------------------------------------------------------------

export async function syncRepository(input: { project: Project; githubToken: string }) {
  const repository = await getProjectRepository(input.project.id);
  if (!repository) throw new Error("No repository connected.");

  const admin = createAdminClient();
  const { owner, name } = repository;

  const [commits, pulls] = await Promise.all([
    gh.listCommits(input.githubToken, owner, name).catch(() => []),
    gh.listPullRequests(input.githubToken, owner, name).catch(() => []),
  ]);

  if (commits.length > 0) {
    const { error } = await admin.from("github_commits").upsert(
      commits.map((c) => ({
        project_id: input.project.id,
        sha: c.sha,
        message: c.commit.message.split("\n")[0]!.slice(0, 500),
        author_name: c.commit.author?.name ?? c.author?.login ?? "Unknown",
        author_login: c.author?.login ?? null,
        author_avatar_url: c.author?.avatar_url ?? null,
        html_url: c.html_url,
        committed_at: c.commit.author?.date ?? new Date().toISOString(),
      })),
      { onConflict: "project_id,sha" },
    );
    if (error) console.error("Failed to upsert commits", error);
  }

  if (pulls.length > 0) {
    const { error } = await admin.from("github_pull_requests").upsert(
      pulls.map((p) => ({
        project_id: input.project.id,
        number: p.number,
        title: p.title,
        state: p.state,
        is_merged: Boolean(p.merged_at),
        author_login: p.user.login,
        author_avatar_url: p.user.avatar_url,
        source_branch: p.head.ref,
        target_branch: p.base.ref,
        additions: p.additions ?? 0,
        deletions: p.deletions ?? 0,
        changed_files: p.changed_files ?? 0,
        html_url: p.html_url,
        github_created_at: p.created_at,
        github_updated_at: p.updated_at,
        merged_at: p.merged_at,
        closed_at: p.closed_at,
      })),
      { onConflict: "project_id,number", ignoreDuplicates: false },
    );
    if (error) console.error("Failed to upsert pull requests", error);
  }

  await logActivity(
    {
      projectId: input.project.id,
      organizationId: input.project.organization_id,
      actorId: null,
      eventType: "repository.synced",
      objectType: "project_repository",
      objectId: repository.id,
      description: `synced ${commits.length} commit(s) and ${pulls.length} pull request(s) from "${repository.full_name}"`,
    },
    admin,
  );

  return { commits: commits.length, pullRequests: pulls.length };
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function listRepoCommits(projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("github_commits")
    .select("*")
    .eq("project_id", projectId)
    .order("committed_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as GitHubCommitRow[];
}

const PR_SELECT = "*, linkedTask:tasks(id, title)";

export async function listRepoPullRequests(projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("github_pull_requests")
    .select(PR_SELECT)
    .eq("project_id", projectId)
    .order("github_updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as GitHubPullRequestRow[];
}

/** Every open/recent PR across every project the user belongs to (for the top-level Pull Requests page). */
export async function listVisiblePullRequests() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("github_pull_requests")
    .select(`${PR_SELECT}, project:projects(id, name, slug)`)
    .order("github_updated_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as unknown as (GitHubPullRequestRow & {
    project: Pick<Project, "id" | "name" | "slug">;
  })[];
}

export async function listPullRequestsLinkedToTask(taskId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("github_pull_requests")
    .select("*")
    .eq("linked_task_id", taskId)
    .order("github_updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as GitHubPullRequestRow[];
}

export async function updatePullRequestLinkedTask(input: {
  pullRequestId: string;
  linkedTaskId: string | null;
}) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("github_pull_requests")
    .update({ linked_task_id: input.linkedTaskId })
    .eq("id", input.pullRequestId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Live (unpersisted) repo metadata - branches/contributors/releases/issues
// ---------------------------------------------------------------------------

export async function getRepositorySnapshot(
  repository: ProjectRepository,
  token: string,
) {
  const [branches, contributors, releases, issues] = await Promise.all([
    gh.listBranches(token, repository.owner, repository.name).catch(() => []),
    gh.listContributors(token, repository.owner, repository.name).catch(() => []),
    gh.listReleases(token, repository.owner, repository.name).catch(() => []),
    gh.listIssues(token, repository.owner, repository.name).catch(() => []),
  ]);
  return { branches, contributors, releases, issues };
}
