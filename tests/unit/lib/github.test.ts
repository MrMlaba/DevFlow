import crypto from "node:crypto";
import { buildAuthorizeUrl, verifyWebhookSignature } from "@/lib/github";

describe("verifyWebhookSignature", () => {
  const secret = "test-webhook-secret";
  const body = JSON.stringify({ repository: { full_name: "octocat/hello-world" } });

  function sign(payload: string, key: string) {
    return "sha256=" + crypto.createHmac("sha256", key).update(payload).digest("hex");
  }

  it("accepts a correctly signed payload", () => {
    const signature = sign(body, secret);
    expect(verifyWebhookSignature(body, signature, secret)).toBe(true);
  });

  it("rejects a payload signed with the wrong secret", () => {
    const signature = sign(body, "a-different-secret");
    expect(verifyWebhookSignature(body, signature, secret)).toBe(false);
  });

  it("rejects a tampered body signed for the original body", () => {
    const signature = sign(body, secret);
    const tamperedBody = JSON.stringify({
      repository: { full_name: "attacker/malicious-repo" },
    });
    expect(verifyWebhookSignature(tamperedBody, signature, secret)).toBe(false);
  });

  it("rejects a missing signature header", () => {
    expect(verifyWebhookSignature(body, null, secret)).toBe(false);
  });

  it("rejects a malformed signature header without throwing", () => {
    expect(verifyWebhookSignature(body, "not-a-real-signature", secret)).toBe(false);
  });
});

describe("buildAuthorizeUrl", () => {
  it("builds a github.com authorize URL with the required query params", () => {
    const url = buildAuthorizeUrl({
      clientId: "client-123",
      redirectUri: "http://localhost:3000/api/github/oauth/callback",
      state: "random-state-value",
    });

    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe(
      "https://github.com/login/oauth/authorize",
    );
    expect(parsed.searchParams.get("client_id")).toBe("client-123");
    expect(parsed.searchParams.get("redirect_uri")).toBe(
      "http://localhost:3000/api/github/oauth/callback",
    );
    expect(parsed.searchParams.get("state")).toBe("random-state-value");
    expect(parsed.searchParams.get("scope")).toBe("repo read:user read:packages");
  });
});
