import "server-only";
import crypto from "node:crypto";

const API_BASE = "https://api.github.com";

export class GitHubApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "GitHubApiError";
  }
}

async function githubFetch<T>(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new GitHubApiError(
      `GitHub API ${path} returned ${res.status}: ${body.slice(0, 300)}`,
      res.status,
    );
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// OAuth
// ---------------------------------------------------------------------------

export function buildAuthorizeUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
}) {
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  // read:packages (Phase 9): lists pushed container image versions for the
  // Pipelines page. Added after repo/read:user (Phase 4) - accounts
  // connected before this change won't have it until they reconnect
  // (Settings -> GitHub -> Disconnect, then Connect again); code handling
  // the packages list treats a 403 the same as "nothing to show" rather
  // than erroring, so an old connection just shows no image data instead
  // of breaking the page.
  url.searchParams.set("scope", "repo read:user read:packages");
  url.searchParams.set("state", input.state);
  return url.toString();
}

export async function exchangeCodeForToken(input: {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
}) {
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: input.clientId,
      client_secret: input.clientSecret,
      code: input.code,
      redirect_uri: input.redirectUri,
    }),
  });

  const data = (await res.json()) as {
    access_token?: string;
    scope?: string;
    error?: string;
    error_description?: string;
  };

  if (!data.access_token) {
    throw new Error(data.error_description ?? data.error ?? "GitHub OAuth exchange failed");
  }

  return { accessToken: data.access_token, scope: data.scope ?? "" };
}

export interface GitHubUser {
  id: number;
  login: string;
  avatar_url: string;
}

export function getAuthenticatedUser(token: string) {
  return githubFetch<GitHubUser>("/user", token);
}

// ---------------------------------------------------------------------------
// Repositories
// ---------------------------------------------------------------------------

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  owner: { login: string };
  private: boolean;
  default_branch: string;
  html_url: string;
}

export function getRepo(token: string, owner: string, repo: string) {
  return githubFetch<GitHubRepo>(`/repos/${owner}/${repo}`, token);
}

export interface GitHubBranch {
  name: string;
  commit: { sha: string };
  protected: boolean;
}

export function listBranches(token: string, owner: string, repo: string) {
  return githubFetch<GitHubBranch[]>(
    `/repos/${owner}/${repo}/branches?per_page=20`,
    token,
  );
}

export interface GitHubContributor {
  login: string;
  avatar_url: string;
  contributions: number;
  html_url: string;
}

export function listContributors(token: string, owner: string, repo: string) {
  return githubFetch<GitHubContributor[]>(
    `/repos/${owner}/${repo}/contributors?per_page=15`,
    token,
  );
}

export interface GitHubRelease {
  id: number;
  tag_name: string;
  name: string | null;
  html_url: string;
  published_at: string | null;
  author: { login: string; avatar_url: string };
}

export function listReleases(token: string, owner: string, repo: string) {
  return githubFetch<GitHubRelease[]>(
    `/repos/${owner}/${repo}/releases?per_page=10`,
    token,
  );
}

export interface GitHubIssue {
  number: number;
  title: string;
  state: string;
  html_url: string;
  user: { login: string; avatar_url: string };
  created_at: string;
  closed_at: string | null;
  pull_request?: unknown;
}

export async function listIssues(token: string, owner: string, repo: string) {
  const issues = await githubFetch<GitHubIssue[]>(
    `/repos/${owner}/${repo}/issues?state=all&per_page=15`,
    token,
  );
  // GitHub's issues endpoint also returns pull requests - filter them out.
  return issues.filter((issue) => !issue.pull_request);
}

export interface GitHubCommit {
  sha: string;
  html_url: string;
  commit: {
    message: string;
    author: { name: string; date: string } | null;
  };
  author: { login: string; avatar_url: string } | null;
}

export function listCommits(
  token: string,
  owner: string,
  repo: string,
  perPage = 30,
) {
  return githubFetch<GitHubCommit[]>(
    `/repos/${owner}/${repo}/commits?per_page=${perPage}`,
    token,
  );
}

export interface GitHubPullRequest {
  number: number;
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
  additions?: number;
  deletions?: number;
  changed_files?: number;
}

export function listPullRequests(
  token: string,
  owner: string,
  repo: string,
  perPage = 30,
) {
  return githubFetch<GitHubPullRequest[]>(
    `/repos/${owner}/${repo}/pulls?state=all&per_page=${perPage}&sort=updated&direction=desc`,
    token,
  );
}

/** The list endpoint omits additions/deletions/changed_files - fetch per-PR when needed. */
export function getPullRequest(
  token: string,
  owner: string,
  repo: string,
  number: number,
) {
  return githubFetch<GitHubPullRequest>(
    `/repos/${owner}/${repo}/pulls/${number}`,
    token,
  );
}

// ---------------------------------------------------------------------------
// Actions (CI runs) - Phase 7
// ---------------------------------------------------------------------------

export interface GitHubWorkflowRun {
  id: number;
  name: string | null;
  display_title: string;
  head_branch: string;
  head_sha: string;
  run_number: number;
  event: string;
  status: "queued" | "in_progress" | "completed" | "waiting" | string;
  conclusion:
    | "success"
    | "failure"
    | "cancelled"
    | "skipped"
    | "timed_out"
    | "action_required"
    | "startup_failure"
    | "neutral"
    | null;
  html_url: string;
  run_started_at: string | null;
  updated_at: string;
  actor: { login: string; avatar_url: string } | null;
  head_commit: { message: string } | null;
}

export async function listWorkflowRuns(
  token: string,
  owner: string,
  repo: string,
  perPage = 15,
) {
  const res = await githubFetch<{ workflow_runs: GitHubWorkflowRun[] }>(
    `/repos/${owner}/${repo}/actions/runs?per_page=${perPage}`,
    token,
  );
  return res.workflow_runs;
}

export interface GitHubWorkflowJob {
  id: number;
  name: string;
  status: "queued" | "in_progress" | "completed" | "waiting" | string;
  conclusion: string | null;
}

export async function listWorkflowRunJobs(
  token: string,
  owner: string,
  repo: string,
  runId: number,
) {
  const res = await githubFetch<{ jobs: GitHubWorkflowJob[] }>(
    `/repos/${owner}/${repo}/actions/runs/${runId}/jobs`,
    token,
  );
  return res.jobs;
}

// ---------------------------------------------------------------------------
// Security findings (Phase 8) - code scanning (Semgrep/Gitleaks/Trivy SARIF
// uploads) and Dependabot alerts. Both need the `security_events` OAuth
// scope for private repos, but `repo` (already requested since Phase 4)
// covers public repos - see docs/devops-roadmap.md, Phase 8.
// ---------------------------------------------------------------------------

export interface GitHubCodeScanningAlert {
  number: number;
  created_at: string;
  html_url: string;
  state: "open" | "dismissed" | "fixed";
  rule: {
    id: string;
    description: string;
    severity: "none" | "note" | "warning" | "error" | null;
    security_severity_level: "low" | "medium" | "high" | "critical" | null;
  };
  tool: { name: string };
  most_recent_instance: {
    location: { path: string } | null;
  };
}

export async function listCodeScanningAlerts(token: string, owner: string, repo: string) {
  return githubFetch<GitHubCodeScanningAlert[]>(
    `/repos/${owner}/${repo}/code-scanning/alerts?per_page=50`,
    token,
  );
}

export interface GitHubDependabotAlert {
  number: number;
  created_at: string;
  html_url: string;
  state: "auto_dismissed" | "dismissed" | "fixed" | "open";
  dependency: { package: { name: string; ecosystem: string } };
  security_advisory: {
    summary: string;
    severity: "low" | "medium" | "high" | "critical";
  };
  security_vulnerability: {
    first_patched_version: { identifier: string } | null;
  };
}

export async function listDependabotAlerts(token: string, owner: string, repo: string) {
  return githubFetch<GitHubDependabotAlert[]>(
    `/repos/${owner}/${repo}/dependabot/alerts?per_page=50`,
    token,
  );
}

// ---------------------------------------------------------------------------
// Container registry (Phase 9) - GitHub Packages API. Needs the
// read:packages OAuth scope specifically; unlike code scanning/Dependabot
// alerts (Phase 8), GitHub does NOT accept the broader `repo`/`public_repo`
// scope as a substitute here, even for public packages.
// ---------------------------------------------------------------------------

export interface GitHubPackageVersion {
  id: number;
  name: string;
  html_url: string;
  created_at: string;
  metadata: { container: { tags: string[] } };
}

/** `owner` is the GitHub *user* that owns the package - GHCR packages are
 * user/org-scoped, not repo-scoped, even though docker.yml names the image
 * after the repo (`ghcr.io/${{ github.repository }}`). */
export async function listContainerVersions(token: string, owner: string, packageName: string) {
  return githubFetch<GitHubPackageVersion[]>(
    `/users/${owner}/packages/container/${encodeURIComponent(packageName)}/versions?per_page=20`,
    token,
  );
}

// ---------------------------------------------------------------------------
// Deployments (Phase 10) - populated automatically by deploy.yml's
// `environment:` job key, not by any manual API call this app makes.
// ---------------------------------------------------------------------------

export interface GitHubDeployment {
  id: number;
  sha: string;
  ref: string;
  environment: string;
  created_at: string;
  creator: { login: string; avatar_url: string } | null;
}

export async function listDeployments(token: string, owner: string, repo: string, perPage = 20) {
  return githubFetch<GitHubDeployment[]>(
    `/repos/${owner}/${repo}/deployments?per_page=${perPage}`,
    token,
  );
}

export interface GitHubDeploymentStatus {
  id: number;
  state:
    | "error"
    | "failure"
    | "inactive"
    | "in_progress"
    | "queued"
    | "pending"
    | "success"
    | "waiting";
  environment_url: string | null;
  created_at: string;
}

export async function listDeploymentStatuses(
  token: string,
  owner: string,
  repo: string,
  deploymentId: number,
) {
  return githubFetch<GitHubDeploymentStatus[]>(
    `/repos/${owner}/${repo}/deployments/${deploymentId}/statuses?per_page=5`,
    token,
  );
}

// ---------------------------------------------------------------------------
// Webhooks
// ---------------------------------------------------------------------------

const WEBHOOK_EVENTS = ["push", "pull_request", "issues", "release"];

export async function createWebhook(input: {
  token: string;
  owner: string;
  repo: string;
  url: string;
  secret: string;
}) {
  const hook = await githubFetch<{ id: number }>(
    `/repos/${input.owner}/${input.repo}/hooks`,
    input.token,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "web",
        active: true,
        events: WEBHOOK_EVENTS,
        config: {
          url: input.url,
          content_type: "json",
          secret: input.secret,
          insecure_ssl: "0",
        },
      }),
    },
  );
  return hook.id;
}

export async function deleteWebhook(input: {
  token: string;
  owner: string;
  repo: string;
  webhookId: number;
}) {
  await githubFetch(
    `/repos/${input.owner}/${input.repo}/hooks/${input.webhookId}`,
    input.token,
    { method: "DELETE" },
  );
}

export function generateWebhookSecret() {
  return crypto.randomBytes(32).toString("hex");
}

/** Timing-safe HMAC-SHA256 verification of GitHub's X-Hub-Signature-256 header. */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): boolean {
  if (!signatureHeader) return false;
  const expected =
    "sha256=" + crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
