# Development

## Prerequisites

- Node.js 20+ and npm
- A free [Supabase](https://supabase.com) project (Postgres + Auth)
- A [GitHub OAuth App](https://github.com/settings/developers) (Phase 4+
  - only needed to test the GitHub integration; the rest of the app works
  without it)
- Git

## Setup

```bash
git clone <this-repo>
cd DevFlow
npm install

cp .env.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY from
# your Supabase project's Settings -> API. Fill in SUPABASE_SERVICE_ROLE_KEY
# too if you plan to run the seed script.
```

Apply the database schema (see [`docs/database.md`](./database.md) for
details):

```bash
for f in database/migrations/*.sql; do
  psql "$DATABASE_URL" -f "$f"
done
```

Optionally seed demo data (creates one user per role - see
[`database/seed/README.md`](../database/seed/README.md)):

```bash
npm run db:seed
```

To test GitHub integration, register an OAuth App at
[github.com/settings/developers](https://github.com/settings/developers)
- New OAuth App, Homepage URL `http://localhost:3000`, Authorization
callback URL `http://localhost:3000/api/github/oauth/callback` - then set
`GITHUB_OAUTH_CLIENT_ID`/`GITHUB_OAUTH_CLIENT_SECRET` in `.env.local`.
Real-time webhook delivery needs a public URL GitHub can reach, which
`localhost` isn't - use the in-app "Sync now" button for local
development, or a tunnel (ngrok, Cloudflare Tunnel) if you want to see
webhooks fire live before this app is deployed (Phase 6+).

Start the dev server:

```bash
npm run dev
# http://localhost:3000
```

## Scripts

| Command               | Does                                            |
| ----------------------- | -------------------------------------------------- |
| `npm run dev`             | Start the Next.js dev server (Turbopack)              |
| `npm run build`            | Production build (also runs the TypeScript check)      |
| `npm run start`             | Serve a production build                              |
| `npm run lint`               | ESLint                                              |
| `npm run type-check`          | `tsc --noEmit`                                       |
| `npm run db:seed`              | Populate demo data (see above)                       |
| `npm test`                   | Run unit/component tests (Jest + React Testing Library) |
| `npm run test:watch`             | Unit tests in watch mode                              |
| `npm run test:e2e`              | Run the Playwright E2E suite                          |
| `npm run test:e2e:ui`             | E2E suite in Playwright's UI mode                      |

## Testing

**Unit/component tests** (`tests/unit/`) don't need Supabase or a running
server - `npm test` runs them directly against validation schemas, the
permission matrix, and mocked components/actions.

**E2E tests** (`tests/e2e/`, Playwright) run against a real, running app
and a real Supabase project - `npm run test:e2e` starts `npm run dev`
automatically if nothing's already listening on `localhost:3000` (or
reuses a dev server you already have running). They need:

- The database seeded (`npm run db:seed`) - tests log in as the demo
  accounts it creates.
- `SEED_USER_PASSWORD` set in `.env.local` (the password those demo
  accounts were created with).

Tests run serially (`workers: 1` in `playwright.config.ts`) - `next dev`
compiles routes on demand, and parallel workers hitting fresh routes at
once queues up compilation and produces real timeouts, not just
slowness. The registration test hits Supabase's real signup endpoint and
will self-skip if that account's email rate limit has been used up
(check the test output for "email rate limit exceeded") - that's a
Supabase quota, not an app failure.

See [`docs/devops-roadmap.md`](./devops-roadmap.md) for what each test
file covers and what E2E testing caught that unit tests couldn't.

## Project conventions

- **Data access goes through `src/services/*.ts`**, never directly through
  a Supabase client call inside a component or a Server Action. This keeps
  every query in one place and makes the return types consistent (see
  [`docs/architecture.md`](./architecture.md#layers)).
- **Mutations are Server Actions** (`"use server"`) in
  `src/features/*/actions.ts`, driven by forms using React 19's
  `useActionState`/`useFormStatus`. Validate input with zod
  (`src/lib/validations/*.ts`) and return the shared `FormState` shape
  (`src/lib/form-state.ts`) so every form's error handling looks the same.
- **Every mutation that matters logs an activity event** via
  `src/services/activity.ts`'s `logActivity()`. If you add a new mutation,
  add a `logActivity` call so the project's Activity feed stays complete.
- **Authorization checks**: use `can(role, permission)` from
  `src/config/permissions.ts` in Server Actions for a fast, clear error -
  but never treat that as the real security boundary. RLS
  (`database/migrations/`) is what actually enforces access; the
  permission matrix is a UX/DX convenience that must stay consistent with
  it.
- **New pages under `src/app/(dashboard)/`** get the shared sidebar/topbar
  automatically via the route group's layout. Add the route to
  `src/config/navigation.ts` if it should appear in the sidebar.

### shadcn/ui runs on Base UI, not Radix - watch for `render` vs `asChild`

This project's shadcn/ui components (`components.json` style: `base-nova`)
are built on **`@base-ui/react`**, not Radix UI. If you're used to Radix's
`asChild` + single-child composition pattern, note the difference:

```tsx
// Radix-style asChild - does NOT work here, will fail to type-check
<Button asChild>
  <Link href="/projects">Projects</Link>
</Button>

// Base UI's render prop - use this instead
<Button nativeButton={false} render={<Link href="/projects" />}>
  Projects
</Button>
```

The element passed to `render` receives the component's props/behavior;
children of the *outer* component (`Button`, `DialogTrigger`,
`DropdownMenuItem`, ...) become what's actually rendered inside it.

`Button` and `DialogTrigger`/`SheetTrigger` default to `nativeButton={true}`
- they expect their rendered DOM node to actually be a `<button>`, and log a
console error if it isn't. That's fine when `render` points at something
that itself renders a `<button>` (like our own `Button` component, e.g.
`<DialogTrigger render={<Button />}>`), but when `render` points at a
`<Link>` or `<a>`, pass `nativeButton={false}` explicitly so Base UI adds
the right ARIA role/keyboard handling instead of expecting native button
semantics. Also
note `DropdownMenuItem` uses `onClick`, not Radix's `onSelect`, and
`Select`'s `onValueChange` receives `string | null` (guard against `null`
before using the value).

### Adding a shadcn/ui component

```bash
npx shadcn@latest add <component-name>
```

This CLI is also different from the classic shadcn CLI - run
`npx shadcn@latest add --help` if a flag you remember doesn't work.

## Realtime type-checking gotcha

`src/types/database.ts` is hand-written to mirror
`database/migrations/`. If a Supabase query starts returning `never` or
`unknown` everywhere, the most likely cause is `Database["public"]` no
longer satisfying `@supabase/postgrest-js`'s `GenericSchema` constraint
(usually a table missing its `Relationships: [...]` array, or Views/
Functions/CompositeTypes missing from the schema type) - see the comment
at the top of that file.
