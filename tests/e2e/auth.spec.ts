import { expect, test } from "@playwright/test";

import { DEMO_USERS, loginAs } from "./helpers/auth";

test.describe("Authentication", () => {
  test("redirects an unauthenticated visitor to login", async ({ page }) => {
    await page.goto("/overview");
    await expect(page).toHaveURL(/\/login/);
  });

  test("registers a new account and shows the email-confirmation notice", async ({
    page,
  }) => {
    // devflow.dev has no MX records, so Supabase Auth's signup endpoint
    // rejects it as an invalid address - use a domain it'll accept.
    const email = `e2e-${Date.now()}@example.com`;

    await page.goto("/register");
    await page.getByLabel("Full name").fill("E2E Test User");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill("correct-horse-battery-staple");
    await page.getByLabel("Confirm password").fill("correct-horse-battery-staple");
    await page.getByRole("button", { name: "Create account" }).click();

    const confirmationNotice = page.getByText(
      "Check your email to confirm your account before signing in.",
    );
    const rateLimited = page.getByText("email rate limit exceeded");
    await expect(confirmationNotice.or(rateLimited)).toBeVisible();

    // Supabase's built-in email service caps outgoing mail per hour - that's
    // an infra limit, not a bug in this app's registration flow.
    test.skip(
      await rateLimited.isVisible(),
      "Supabase's email rate limit was hit - not an app failure.",
    );
  });

  test("rejects an incorrect password", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(DEMO_USERS.admin.email);
    await page.getByLabel("Password").fill("definitely-the-wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText("Incorrect email or password.")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("logs in and reaches the dashboard", async ({ page }) => {
    await loginAs(page, DEMO_USERS.admin.email);
    await expect(page).toHaveURL("/overview");
  });

  test("logs out and can no longer reach protected pages", async ({ page }) => {
    await loginAs(page, DEMO_USERS.admin.email);

    await page.getByRole("button", { name: "Account menu" }).click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login/);

    await page.goto("/overview");
    await expect(page).toHaveURL(/\/login/);
  });
});
