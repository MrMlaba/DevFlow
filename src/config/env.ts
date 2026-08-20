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
};
