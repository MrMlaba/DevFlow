import { expect, test } from "@playwright/test";

import { DEMO_USERS, loginAs } from "./helpers/auth";

// Every seeded demo user is a member of the "DevFlow Platform" project with
// a fixed role (see database/seed/seed.ts): reviewer@devflow.dev is a
// "reviewer" (no member management), owner@devflow.dev is the
// "project_owner" (full member management) - see config/permissions.ts.
async function openDevFlowPlatformMembers(page: import("@playwright/test").Page) {
  await page.goto("/projects");
  // The project card's accessible name includes its footer text ("N
  // members"), which fuzzy-matches a "Members" link locator too - navigate
  // via the card's real href instead of clicking through it.
  const href = await page.getByRole("link", { name: "DevFlow Platform" }).getAttribute("href");
  await page.goto(href!);
  await page.getByRole("link", { name: "Members" }).click();
  await page.waitForURL(/\/members$/);
}

test.describe("Permissions", () => {
  test("a reviewer cannot manage project members", async ({ page }) => {
    await loginAs(page, DEMO_USERS.reviewer.email);
    await openDevFlowPlatformMembers(page);

    await expect(page.getByRole("button", { name: "Invite member" })).not.toBeVisible();
  });

  test("a project owner can manage project members", async ({ page }) => {
    await loginAs(page, DEMO_USERS.owner.email);
    await openDevFlowPlatformMembers(page);

    await expect(page.getByRole("button", { name: "Invite member" })).toBeVisible();
  });
});
