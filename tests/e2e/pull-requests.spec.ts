import { expect, test } from "@playwright/test";

import { DEMO_USERS, loginAs } from "./helpers/auth";

// A full PR sync requires a connected GitHub repo (real OAuth flow, out of
// scope for E2E without dedicated GitHub test credentials). This verifies
// the page renders correctly whether or not any PRs are synced yet.
test.describe("Pull requests", () => {
  test("the pull requests page renders for a signed-in user", async ({ page }) => {
    await loginAs(page, DEMO_USERS.admin.email);

    await page.goto("/pull-requests");
    await expect(
      page.getByRole("heading", { name: "Pull Requests", exact: true }),
    ).toBeVisible();

    const emptyState = page.getByText("No pull requests yet");
    const table = page.getByRole("table");
    await expect(emptyState.or(table)).toBeVisible();
  });
});
