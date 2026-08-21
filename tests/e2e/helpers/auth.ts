import type { Page } from "@playwright/test";

/**
 * Demo accounts created by `npm run db:seed` (see database/seed/README.md).
 * E2E tests log in as these rather than registering fresh users, since a
 * real registration requires confirming a real email - out of scope
 * without a test inbox.
 */
export const DEMO_USERS = {
  admin: { email: "admin@devflow.dev", role: "administrator" },
  owner: { email: "owner@devflow.dev", role: "project_owner" },
  developer: { email: "dev@devflow.dev", role: "developer" },
  reviewer: { email: "reviewer@devflow.dev", role: "reviewer" },
  lecturer: { email: "lecturer@devflow.dev", role: "lecturer" },
} as const;

function seedPassword() {
  const password = process.env.SEED_USER_PASSWORD;
  if (!password) {
    throw new Error(
      "SEED_USER_PASSWORD isn't set. E2E tests log in as the seeded demo " +
        "accounts (see database/seed/README.md) - set it in .env.local.",
    );
  }
  return password;
}

export async function loginAs(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(seedPassword());
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("/overview");
}
