import { jobStatus, runStatus } from "@/services/github";
import type { GitHubWorkflowJob, GitHubWorkflowRun } from "@/lib/github";

function run(overrides: Partial<GitHubWorkflowRun>): GitHubWorkflowRun {
  return {
    id: 1,
    name: "CI",
    display_title: "Fix bug",
    head_branch: "main",
    head_sha: "abc1234",
    run_number: 1,
    event: "push",
    status: "completed",
    conclusion: "success",
    html_url: "https://github.com/octocat/hello-world/actions/runs/1",
    run_started_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:03:00Z",
    actor: { login: "octocat", avatar_url: "" },
    head_commit: { message: "Fix bug" },
    ...overrides,
  };
}

function job(overrides: Partial<GitHubWorkflowJob>): GitHubWorkflowJob {
  return {
    id: 1,
    name: "lint",
    status: "completed",
    conclusion: "success",
    started_at: "2026-01-01T00:00:00Z",
    completed_at: "2026-01-01T00:00:30Z",
    ...overrides,
  };
}

describe("runStatus", () => {
  it("maps a queued run", () => {
    expect(runStatus(run({ status: "queued", conclusion: null }))).toBe("queued");
  });

  it("maps an in-progress run to running, regardless of conclusion", () => {
    expect(runStatus(run({ status: "in_progress", conclusion: null }))).toBe("running");
  });

  it("maps a completed+success run to success", () => {
    expect(runStatus(run({ status: "completed", conclusion: "success" }))).toBe("success");
  });

  it("maps a completed+cancelled run to cancelled", () => {
    expect(runStatus(run({ status: "completed", conclusion: "cancelled" }))).toBe("cancelled");
  });

  it("maps a completed+skipped run to cancelled, not failed", () => {
    expect(runStatus(run({ status: "completed", conclusion: "skipped" }))).toBe("cancelled");
  });

  it("maps any other completed conclusion (failure, timed_out, ...) to failed", () => {
    expect(runStatus(run({ status: "completed", conclusion: "failure" }))).toBe("failed");
    expect(runStatus(run({ status: "completed", conclusion: "timed_out" }))).toBe("failed");
  });
});

describe("jobStatus", () => {
  it("maps a completed+success job to success", () => {
    expect(jobStatus(job({ status: "completed", conclusion: "success" }))).toBe("success");
  });

  it("maps a completed+failure job to failed", () => {
    expect(jobStatus(job({ status: "completed", conclusion: "failure" }))).toBe("failed");
  });

  it("maps an in-progress job to running", () => {
    expect(jobStatus(job({ status: "in_progress", conclusion: null }))).toBe("running");
  });

  it("maps a queued job to pending", () => {
    expect(jobStatus(job({ status: "queued", conclusion: null }))).toBe("pending");
  });
});
