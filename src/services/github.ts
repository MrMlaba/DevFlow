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

// ---------------------------------------------------------------------------
// CI pipeline runs (Phase 7) - also live/unpersisted, same reasoning as the
// repo snapshot above: this is GitHub's own data, fetched fresh rather than
// synced into a table nothing else needs it to be in.
// ---------------------------------------------------------------------------

export type PipelineStageStatus = "success" | "failed" | "running" | "pending";
export type PipelineRunStatus = "queued" | "running" | "success" | "failed" | "cancelled";

export interface PipelineRun {
  id: number;
  projectId: string;
  projectName: string;
  runNumber: number;
  branch: string;
  commitSha: string;
  commitMessage: string;
  author: string;
  status: PipelineRunStatus;
  htmlUrl: string;
  startedAt: string;
  durationSeconds: number | null;
  stages: { name: string; status: PipelineStageStatus; durationSeconds: number | null }[];
}

function jobDurationSeconds(job: gh.GitHubWorkflowJob): number | null {
  if (!job.started_at || !job.completed_at) return null;
  return Math.max(
    0,
    Math.round((new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()) / 1000),
  );
}

export function runStatus(run: gh.GitHubWorkflowRun): PipelineRunStatus {
  if (run.status === "queued" || run.status === "waiting") return "queued";
  if (run.status === "in_progress") return "running";
  switch (run.conclusion) {
    case "success":
      return "success";
    case "cancelled":
      return "cancelled";
    // "skipped"/"neutral" completed without really running either way -
    // the run-level badge only has 5 states, so group them with cancelled
    // rather than call an unstarted job a "failure".
    case "skipped":
    case "neutral":
      return "cancelled";
    default:
      return "failed";
  }
}

export function jobStatus(job: gh.GitHubWorkflowJob): PipelineStageStatus {
  if (job.status !== "completed") return job.status === "in_progress" ? "running" : "pending";
  return job.conclusion === "success" ? "success" : "failed";
}

/** Most recent CI runs for one connected repository, with their per-job breakdown. */
async function getPipelineRuns(
  project: Pick<Project, "id" | "name">,
  repository: ProjectRepository,
  token: string,
  runsLimit = 10,
): Promise<PipelineRun[]> {
  const runs = await gh
    .listWorkflowRuns(token, repository.owner, repository.name, runsLimit)
    .catch(() => []);

  return Promise.all(
    runs.map(async (run) => {
      const jobs = await gh
        .listWorkflowRunJobs(token, repository.owner, repository.name, run.id)
        .catch(() => []);

      const startedAt = run.run_started_at ?? run.updated_at;
      const durationSeconds =
        run.status === "completed"
          ? Math.max(
              0,
              Math.round(
                (new Date(run.updated_at).getTime() - new Date(startedAt).getTime()) / 1000,
              ),
            )
          : null;

      return {
        id: run.id,
        projectId: project.id,
        projectName: project.name,
        runNumber: run.run_number,
        branch: run.head_branch,
        commitSha: run.head_sha.slice(0, 7),
        commitMessage: run.head_commit?.message.split("\n")[0] ?? run.display_title,
        author: run.actor?.login ?? "Unknown",
        status: runStatus(run),
        htmlUrl: run.html_url,
        startedAt,
        durationSeconds,
        stages: jobs.map((job) => ({
          name: job.name,
          status: jobStatus(job),
          durationSeconds: jobDurationSeconds(job),
        })),
      } satisfies PipelineRun;
    }),
  );
}

/**
 * CI runs across every project the user belongs to that has a connected
 * repository - the cross-project Pipelines page's data source. Projects
 * without a connected repo, or whose connector's GitHub account can't be
 * loaded, are silently skipped rather than erroring the whole page.
 */
export async function listVisiblePipelineRuns(
  projects: Pick<Project, "id" | "name">[],
): Promise<PipelineRun[]> {
  const runsByProject = await Promise.all(
    projects.map(async (project) => {
      const repository = await getProjectRepository(project.id);
      if (!repository) return [];

      const account = await getGitHubAccount(repository.connected_by).catch(() => null);
      if (!account) return [];

      return getPipelineRuns(project, repository, account.access_token);
    }),
  );

  return runsByProject
    .flat()
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
}

// ---------------------------------------------------------------------------
// Security findings (Phase 8) - also live/unpersisted (same reasoning as
// pipeline runs above). Merges GitHub's two separate alert systems -
// code scanning (Semgrep/Gitleaks/Trivy SARIF uploads, security.yml) and
// Dependabot alerts (a distinct GitHub feature, not from our workflow) -
// into one shape the Security page renders without caring which produced
// a given finding.
// ---------------------------------------------------------------------------

export type SecurityFindingSeverity = "critical" | "high" | "medium" | "low";
export type SecurityFindingStatus = "open" | "dismissed" | "fixed";

export interface SecurityFinding {
  id: string;
  projectId: string;
  projectName: string;
  source: string;
  title: string;
  severity: SecurityFindingSeverity;
  status: SecurityFindingStatus;
  location: string;
  detectedAt: string;
  recommendation: string;
  htmlUrl: string;
}

const RULE_SEVERITY_FALLBACK: Record<string, SecurityFindingSeverity> = {
  error: "high",
  warning: "medium",
  note: "low",
  none: "low",
};

export function codeScanningSeverity(
  alert: Pick<gh.GitHubCodeScanningAlert["rule"], "security_severity_level" | "severity">,
): SecurityFindingSeverity {
  if (alert.security_severity_level) return alert.security_severity_level;
  return RULE_SEVERITY_FALLBACK[alert.severity ?? "none"] ?? "low";
}

export function dependabotStatus(state: gh.GitHubDependabotAlert["state"]): SecurityFindingStatus {
  return state === "auto_dismissed" ? "dismissed" : state;
}

async function getSecurityFindings(
  project: Pick<Project, "id" | "name">,
  repository: ProjectRepository,
  token: string,
): Promise<SecurityFinding[]> {
  const [codeAlerts, dependabotAlerts] = await Promise.all([
    gh.listCodeScanningAlerts(token, repository.owner, repository.name).catch(() => []),
    gh.listDependabotAlerts(token, repository.owner, repository.name).catch(() => []),
  ]);

  const fromCodeScanning: SecurityFinding[] = codeAlerts.map((alert) => ({
    id: `code-${alert.number}`,
    projectId: project.id,
    projectName: project.name,
    source: alert.tool.name,
    title: alert.rule.description,
    severity: codeScanningSeverity(alert.rule),
    status: alert.state,
    location: alert.most_recent_instance.location?.path ?? "—",
    detectedAt: alert.created_at,
    recommendation: alert.rule.description,
    htmlUrl: alert.html_url,
  }));

  const fromDependabot: SecurityFinding[] = dependabotAlerts.map((alert) => ({
    id: `dependabot-${alert.number}`,
    projectId: project.id,
    projectName: project.name,
    source: "Dependabot",
    title: alert.security_advisory.summary,
    severity: alert.security_advisory.severity,
    status: dependabotStatus(alert.state),
    location: alert.dependency.package.name,
    detectedAt: alert.created_at,
    recommendation: alert.security_vulnerability.first_patched_version
      ? `Upgrade ${alert.dependency.package.name} to ${alert.security_vulnerability.first_patched_version.identifier}`
      : "No patched version available yet.",
    htmlUrl: alert.html_url,
  }));

  return [...fromCodeScanning, ...fromDependabot];
}

/**
 * Security findings across every project the user belongs to that has a
 * connected repository - the Security page's data source. Same
 * skip-rather-than-error handling as listVisiblePipelineRuns: a project
 * without a connected repo, or a repo where code scanning/Dependabot
 * alerts aren't enabled, just contributes nothing rather than failing
 * the whole page.
 */
export async function listVisibleSecurityFindings(
  projects: Pick<Project, "id" | "name">[],
): Promise<SecurityFinding[]> {
  const findingsByProject = await Promise.all(
    projects.map(async (project) => {
      const repository = await getProjectRepository(project.id);
      if (!repository) return [];

      const account = await getGitHubAccount(repository.connected_by).catch(() => null);
      if (!account) return [];

      return getSecurityFindings(project, repository, account.access_token);
    }),
  );

  const severityRank: Record<SecurityFindingSeverity, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  return findingsByProject
    .flat()
    .sort(
      (a, b) =>
        severityRank[a.severity] - severityRank[b.severity] ||
        new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime(),
    );
}

// ---------------------------------------------------------------------------
// Container images (Phase 9) - also live/unpersisted, same reasoning as
// pipeline runs and security findings above.
// ---------------------------------------------------------------------------

export interface ContainerImage {
  id: number;
  projectId: string;
  projectName: string;
  tags: string[];
  htmlUrl: string;
  pushedAt: string;
}

async function getContainerImages(
  project: Pick<Project, "id" | "name">,
  repository: ProjectRepository,
  token: string,
  limit = 5,
): Promise<ContainerImage[]> {
  // docker.yml pushes to ghcr.io/${{ github.repository }}, which
  // docker/metadata-action lowercases - GHCR package names are always
  // lowercase even though the repo name (and repository.name here) isn't.
  const versions = await gh
    .listContainerVersions(token, repository.owner, repository.name.toLowerCase())
    .catch(() => []);

  return versions.slice(0, limit).map((version) => ({
    id: version.id,
    projectId: project.id,
    projectName: project.name,
    tags: version.metadata.container.tags,
    htmlUrl: version.html_url,
    pushedAt: version.created_at,
  }));
}

/**
 * Pushed container image versions across every project the user belongs
 * to that has a connected repository. Same skip-rather-than-error
 * handling as the pipeline runs/security findings above - most commonly
 * skipped because the connected account doesn't have the read:packages
 * scope yet (added in Phase 9, after the original Phase 4 connection) -
 * see buildAuthorizeUrl in lib/github.ts.
 */
export async function listVisibleContainerImages(
  projects: Pick<Project, "id" | "name">[],
): Promise<ContainerImage[]> {
  const imagesByProject = await Promise.all(
    projects.map(async (project) => {
      const repository = await getProjectRepository(project.id);
      if (!repository) return [];

      const account = await getGitHubAccount(repository.connected_by).catch(() => null);
      if (!account) return [];

      return getContainerImages(project, repository, account.access_token);
    }),
  );

  return imagesByProject
    .flat()
    .sort((a, b) => new Date(b.pushedAt).getTime() - new Date(a.pushedAt).getTime());
}

// ---------------------------------------------------------------------------
// Deployments (Phase 10) - also live/unpersisted. deploy.yml's `environment:`
// job key is what creates these on GitHub's side; DevFlow only ever reads
// them, same as it only ever reads the CI runs a workflow produces.
// ---------------------------------------------------------------------------

export type DeploymentStatusSummary = "success" | "failed" | "pending" | "superseded";

export interface DeploymentRecord {
  id: number;
  projectId: string;
  projectName: string;
  environment: string;
  commitSha: string;
  status: DeploymentStatusSummary;
  environmentUrl: string | null;
  deployedBy: string;
  createdAt: string;
}

export function deploymentStatusSummary(
  state: gh.GitHubDeploymentStatus["state"],
): DeploymentStatusSummary {
  switch (state) {
    case "success":
      return "success";
    case "error":
    case "failure":
      return "failed";
    case "inactive":
      return "superseded";
    default:
      return "pending";
  }
}

async function getDeployments(
  project: Pick<Project, "id" | "name">,
  repository: ProjectRepository,
  token: string,
  limit = 10,
): Promise<DeploymentRecord[]> {
  const deployments = await gh
    .listDeployments(token, repository.owner, repository.name, limit)
    .catch(() => []);

  return Promise.all(
    deployments.map(async (deployment) => {
      const statuses = await gh
        .listDeploymentStatuses(token, repository.owner, repository.name, deployment.id)
        .catch(() => []);
      const latest = [...statuses].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )[0];

      return {
        id: deployment.id,
        projectId: project.id,
        projectName: project.name,
        environment: deployment.environment,
        commitSha: deployment.sha.slice(0, 7),
        status: deploymentStatusSummary(latest?.state ?? "pending"),
        environmentUrl: latest?.environment_url ?? null,
        deployedBy: deployment.creator?.login ?? "Unknown",
        createdAt: deployment.created_at,
      } satisfies DeploymentRecord;
    }),
  );
}

/**
 * Deployment history across every project the user belongs to that has a
 * connected repository. Same skip-rather-than-error handling as pipeline
 * runs/security findings/container images above.
 */
export async function listVisibleDeployments(
  projects: Pick<Project, "id" | "name">[],
): Promise<DeploymentRecord[]> {
  const deploymentsByProject = await Promise.all(
    projects.map(async (project) => {
      const repository = await getProjectRepository(project.id);
      if (!repository) return [];

      const account = await getGitHubAccount(repository.connected_by).catch(() => null);
      if (!account) return [];

      return getDeployments(project, repository, account.access_token);
    }),
  );

  return deploymentsByProject
    .flat()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
