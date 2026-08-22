/**
 * Central place that reads and validates environment variables. Importing
 * from here (instead of `process.env.X` scattered around the codebase)
 * means a missing variable fails fast with a clear message instead of
 * surfacing as a confusing runtime error deep in a Supabase call.
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Copy .env.example to .env.local and fill it in.`,
    );
  }
  return value;
}

export const env = {
  supabaseUrl: () => requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: () => requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: () => requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  siteUrl: () =>
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  githubClientId: () => requireEnv("GITHUB_OAUTH_CLIENT_ID"),
  githubClientSecret: () => requireEnv("GITHUB_OAUTH_CLIENT_SECRET"),
  // Optional, not required(): unset almost everywhere (local dev, Vercel)
  // since only the in-cluster Prometheus scraping /api/metrics needs it.
  // Unset means that route responds 404 instead of serving unauthenticated
  // metrics - see src/app/api/metrics/route.ts.
  metricsToken: () => process.env.METRICS_TOKEN,
};
