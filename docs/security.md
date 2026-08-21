# Security

This document covers what's implemented today (Phases 1-3). DevSecOps
tooling (Trivy, Semgrep, Gitleaks, Dependabot) lands in Phase 8. See
[`docs/devops-roadmap.md`](./devops-roadmap.md) for the full plan.

## Authorization: row-level security is the real boundary

Every table DevFlow reads or writes through the app has RLS enabled
(`database/migrations/`). The Next.js app talks to Postgres using the
**signed-in user's own session** for nearly everything, so a bug that
forgets a permission check in application code still can't leak or
mutate data the database itself wouldn't allow. See
[`docs/database.md`](./database.md#role-based-access-control) for the
RBAC model and helper functions.

`src/config/permissions.ts`'s `can()` function is a second, UI/DX-facing
layer - it makes Server Actions fail fast with a readable error and lets
the UI hide actions a user can't take - but it is not itself a security
control. If it and the RLS policies ever disagree, RLS wins (silently, as
a permission-denied error from Postgres), which is the safe failure mode.

## The service-role key

`src/lib/supabase/admin.ts` creates a Supabase client with the
`service_role` key, which **bypasses RLS entirely**. It's guarded with
`import "server-only"` (build fails if it's ever imported into client
code) and is used in exactly two places:

1. `src/services/members.ts`'s `redeemInvitationsForEmail` - runs once,
   automatically, right after a new user signs up, to attach them to any
   projects that invited their email before they had an account. A brand
   new user isn't yet a project admin, so this step can't run under their
   own RLS-scoped session.
2. `database/seed/seed.ts` - a local-only script that needs the Auth Admin
   API to create demo users.

Never add a third use without a specific reason RLS can't express -
that's the whole point of keeping this key out of the request path.

## Authentication

- Supabase Auth (email + password) via `@supabase/ssr`, using the PKCE
  flow for email confirmation and password-reset links
  (`src/app/auth/callback/route.ts`).
- Sessions are httpOnly cookies, refreshed on every request by
  `proxy.ts`/`src/lib/supabase/middleware.ts`.
- Password reset always returns the same success message whether or not
  the email is registered (`src/features/auth/actions.ts`,
  `requestPasswordReset`), to avoid leaking which emails have accounts.
- Passwords require a minimum of 8 characters
  (`src/lib/validations/auth.ts`); Supabase enforces this again
  server-side regardless of client validation.

## Secrets

- `.env.example` documents every environment variable DevFlow needs, with
  no real values.
- `.env.local` is git-ignored (`.gitignore`'s `.env*` rule).
- `src/config/env.ts` centralizes env var access and throws a clear error
  immediately if something required is missing, rather than failing
  confusingly deep inside a Supabase call.
- The only "secret" that is intentionally not sensitive is
  `SEED_USER_PASSWORD` - it's a local-development-only password for demo
  accounts created by `database/seed/seed.ts`, never used outside your own
  machine.

## Audit log

`src/services/audit.ts`'s `logAudit()` writes to a dedicated `audit_log`
table for security-sensitive actions specifically: login, password
changes, project membership changes, role changes, and deletions (tasks,
issues, comments). It's distinct from the general activity feed
(`activity_events`) - see
[`docs/database.md`](./database.md#activity-feed-vs-audit-log) for the
full comparison. Only organization administrators can read org/project-
scoped entries; every user can read their own account-level entries
(login, password change). View it at Settings → Audit log.

## Input validation

Every Server Action validates its input with a zod schema
(`src/lib/validations/*.ts`) before touching the database. This catches
malformed input at the boundary rather than relying on Postgres
constraints alone (though those exist too, as a second line of defense -
`not null`, foreign keys, `unique`, enum types).

## Not yet implemented

These are called out explicitly rather than silently absent, so nobody
mistakes DevFlow's current state for production-hardened:

- **Rate limiting** on auth endpoints (login/register/password-reset) -
  planned for Phase 20 (Production Hardening).
- **Automated dependency/secret/container scanning** (Dependabot, Gitleaks,
  Trivy, Semgrep) - Phase 8.
- **CSRF**: Next.js Server Actions include built-in origin checking, so
  this is handled by the framework rather than custom code.
