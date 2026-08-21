import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// Playwright runs as a plain Node process, not through Next.js, so .env.local
// isn't loaded automatically the way `next dev` loads it for the app itself.
// Tests need SEED_USER_PASSWORD to log in as the demo accounts.
const envPath = ".env.local";
if (existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // next dev compiles routes on demand - parallel workers hitting distinct
  // routes at once (fresh project/task IDs each run) queue up compilation
  // and cause real timeouts, not just slowness. Run serially instead.
  workers: 1,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Reuses a dev server you already have running locally; starts one
  // automatically otherwise (e.g. in CI, once Phase 7 adds that).
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
