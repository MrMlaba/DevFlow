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
  url.searchParams.set("scope", "repo read:user");
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
