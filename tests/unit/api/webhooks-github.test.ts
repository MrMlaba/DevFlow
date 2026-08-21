/**
 * @jest-environment node
 *
 * Route Handlers run in a Node-like runtime, not a browser - override the
 * project's default jsdom environment for this file so NextResponse/
 * Request behave the way they do in production.
 */
import crypto from "node:crypto";

import { POST } from "@/app/api/webhooks/github/route";
import { createAdminClient } from "@/lib/supabase/admin";

jest.mock("@/lib/supabase/admin");

const REPO_ROW = {
  id: "repo-row-id",
  project_id: "project-1",
  organization_id: null,
  owner: "octocat",
  name: "hello-world",
  full_name: "octocat/hello-world",
  webhook_secret: "test-webhook-secret",
  webhook_id: 999,
};

/** A minimal fake Supabase client covering the exact chains the webhook route uses. */
function createFakeAdminClient(overrides: {
  repository?: typeof REPO_ROW | null;
} = {}) {
  const inserted: { table: string; rows: unknown }[] = [];
  const upserted: { table: string; rows: unknown }[] = [];

  const client = {
    from: jest.fn((table: string) => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          maybeSingle: jest.fn(async () => ({
            data: "repository" in overrides ? overrides.repository : REPO_ROW,
            error: null,
          })),
        })),
      })),
      upsert: jest.fn(async (rows: unknown) => {
        upserted.push({ table, rows });
        return { data: null, error: null };
      }),
      insert: jest.fn(async (rows: unknown) => {
        inserted.push({ table, rows });
        return { data: null, error: null };
      }),
    })),
  };

  return { client, inserted, upserted };
}

function sign(body: string, secret: string) {
  return "sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex");
}

function webhookRequest(event: string, payload: object, secret: string) {
  const body = JSON.stringify(payload);
  return new Request("http://localhost:3000/api/webhooks/github", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-github-event": event,
      "x-hub-signature-256": sign(body, secret),
    },
    body,
  });
}

describe("POST /api/webhooks/github", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects a payload with an invalid signature", async () => {
    const { client } = createFakeAdminClient();
    (createAdminClient as jest.Mock).mockReturnValue(client);

    const body = JSON.stringify({ repository: { full_name: "octocat/hello-world" } });
    const request = new Request("http://localhost:3000/api/webhooks/github", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-github-event": "push",
        "x-hub-signature-256": "sha256=not-a-real-signature",
      },
      body,
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("acknowledges (200) a webhook for a repository DevFlow doesn't know about", async () => {
    const { client } = createFakeAdminClient({ repository: null });
    (createAdminClient as jest.Mock).mockReturnValue(client);

    const request = webhookRequest(
      "push",
      { repository: { full_name: "someone-else/unrelated-repo" } },
      "irrelevant-secret",
    );
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ignored).toBeDefined();
  });

  it("handles a ping event without writing anything", async () => {
    const { client, inserted, upserted } = createFakeAdminClient();
    (createAdminClient as jest.Mock).mockReturnValue(client);

    const request = webhookRequest(
      "ping",
      { repository: { full_name: "octocat/hello-world" }, zen: "Anything added dilutes everything else." },
      REPO_ROW.webhook_secret,
    );
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(inserted).toHaveLength(0);
    expect(upserted).toHaveLength(0);
  });

  it("processes a push event: upserts commits and logs an activity event", async () => {
    const { client, inserted, upserted } = createFakeAdminClient();
    (createAdminClient as jest.Mock).mockReturnValue(client);

    const request = webhookRequest(
      "push",
      {
        ref: "refs/heads/main",
        pusher: { name: "octocat" },
        repository: { full_name: "octocat/hello-world" },
        commits: [
          {
            id: "abc123",
            message: "Fix session refresh race condition",
            url: "https://github.com/octocat/hello-world/commit/abc123",
            timestamp: new Date().toISOString(),
            author: { name: "Octo Cat", username: "octocat" },
          },
        ],
      },
      REPO_ROW.webhook_secret,
    );
    const response = await POST(request);

    expect(response.status).toBe(200);

    expect(upserted).toHaveLength(1);
    expect(upserted[0]!.table).toBe("github_commits");
    const commitRows = upserted[0]!.rows as { sha: string; project_id: string }[];
    expect(commitRows[0]!.sha).toBe("abc123");
    expect(commitRows[0]!.project_id).toBe(REPO_ROW.project_id);

    expect(inserted).toHaveLength(1);
    expect(inserted[0]!.table).toBe("activity_events");
    const activityRow = inserted[0]!.rows as { event_type: string; description: string };
    expect(activityRow.event_type).toBe("repository.push");
    expect(activityRow.description).toContain("octocat");
  });

  it("processes a merged pull_request event: upserts the PR and logs a merge event", async () => {
    const { client, inserted, upserted } = createFakeAdminClient();
    (createAdminClient as jest.Mock).mockReturnValue(client);

    const request = webhookRequest(
      "pull_request",
      {
        action: "closed",
        number: 42,
        repository: { full_name: "octocat/hello-world" },
        pull_request: {
          title: "Add authentication",
          state: "closed",
          merged_at: new Date().toISOString(),
          closed_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          html_url: "https://github.com/octocat/hello-world/pull/42",
          user: { login: "octocat", avatar_url: "https://example.com/a.png" },
          head: { ref: "feature/auth" },
          base: { ref: "main" },
          additions: 120,
          deletions: 10,
          changed_files: 5,
        },
      },
      REPO_ROW.webhook_secret,
    );
    const response = await POST(request);

    expect(response.status).toBe(200);

    expect(upserted).toHaveLength(1);
    expect(upserted[0]!.table).toBe("github_pull_requests");
    const prRow = upserted[0]!.rows as { number: number; is_merged: boolean };
    expect(prRow.number).toBe(42);
    expect(prRow.is_merged).toBe(true);

    expect(inserted).toHaveLength(1);
    const activityRow = inserted[0]!.rows as { event_type: string };
    expect(activityRow.event_type).toBe("pull_request.merged");
  });
});
