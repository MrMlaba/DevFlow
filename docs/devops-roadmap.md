# DevOps roadmap

DevFlow is built as a **progressive DevOps learning project**: each phase
adds one real piece of infrastructure, motivated by an actual problem the
project has at that point, and the app stays fully working after every
phase. This document is the running log - updated every time a phase adds
a new technology - of what problem it solved, why DevFlow needed it, how
it works, how it's configured, how it integrates with what's already
there, and what was learned building it.

Status legend: ✅ done · 🚧 in progress · ⬜ planned

## ✅ Phase 0 - Architecture and project foundation

**Problem it solves:** starting to write features immediately, without an
agreed folder structure or documentation habit, tends to produce a
codebase where similar things live in different places and nobody knows
where new code should go.

**Why DevFlow needs it:** DevFlow's scope grows across 20 phases and many
technologies. A predictable structure (`src/app`, `src/features`,
`src/services`, `database/migrations`, `docs/`, ...) is what makes it
possible to keep adding phases without the codebase becoming unnavigable.

**How it works / how it's configured:** see
[`docs/architecture.md`](./architecture.md) for the full layer breakdown.
In short: `app/` is routing only, `features/` is UI + mutations for one
product area, `services/` is the data-access layer, `lib/` and `config/`
are cross-cutting. Folders for later phases (`docker/`, `kubernetes/`,
`terraform/`, `monitoring/`, `.github/workflows/`) exist from the start,
each with a short README saying what will land there and in which phase,
so the target shape is visible before it's built.

**What was learned:** deciding the layer boundaries (`services/` vs.
`features/*/actions.ts`, specifically) before writing feature code made
every later decision ("where does this function go?") mechanical instead
of debated each time.

## ✅ Phase 1 - MVP application

**Problem it solves:** every later phase (CI, security scanning,
deployments, monitoring, incidents) needs something real to build,
secure, deploy, and monitor. Without a working product first, DevOps
tooling has nothing to operate on.

**Why DevFlow needs it:** authentication, RBAC, and the core project/task/
issue data model are the foundation every other feature (GitHub
integration, pipelines, deployments) attaches to.

**How it works:**

- **Frontend:** Next.js 16 (App Router, Turbopack), React 19, TypeScript,
  Tailwind CSS v4, shadcn/ui (on `@base-ui/react`, not Radix - see
  [`docs/development.md`](./development.md) for the API differences that
  matters for).
- **Auth:** Supabase Auth - registration, login, logout, password reset,
  profile editing, session refresh via `proxy.ts`.
- **RBAC:** a five-role model (`administrator`, `project_owner`,
  `developer`, `reviewer`, `lecturer`) enforced by Postgres row-level
  security, mirrored in a TypeScript permission matrix for the UI. See
  [`docs/database.md`](./database.md#role-based-access-control).
- **Core entities:** organizations, projects, project members (+
  invitations), tasks, issues, comments, and a project activity feed.
- **Navigation:** the full 15-item sidebar from the spec exists today;
  sections without a real backend yet (Pull Requests, Pipelines,
  Deployments, Environments, Monitoring, Incidents, AI Assistant) show
  clearly-labeled realistic mock data instead of being missing or faked
  as real.

**How it's configured:** a Supabase project (Postgres + Auth), configured
via `.env.local` (see `.env.example`). No infrastructure beyond that -
this phase runs entirely on `npm run dev` plus a cloud Supabase project.

**How it integrates:** this *is* the base everything else attaches to.
GitHub integration (Phase 4) will add commits/PRs to the `projects` a user
already has. CI (Phase 7) will report pipeline runs against the same
projects. Deployments (Phase 10) will reference the same environments a
project's team already manages.

**What was learned:**

- shadcn/ui's newer `base-nova` style is built on `@base-ui/react`, which
  uses a `render` prop instead of Radix's `asChild`, and `onClick` instead
  of `onSelect` on menu items. This wasn't apparent until `next build`'s
  type-checking caught every `asChild` usage at once - worth checking a
  freshly-scaffolded component's actual source before assuming an API
  from prior experience with shadcn/Radix.
- `@supabase/postgrest-js` silently degrades every query to `never` if the
  hand-written `Database` type doesn't structurally satisfy its
  `GenericSchema` constraint (missing `Relationships` arrays, or missing
  `Views`/`Functions`/`CompositeTypes` keys) - and does so without a
  helpful error message pointing at the cause. Worth checking early with
  a full `npm run build` rather than assuming a hand-written type "looks
  right."
- Next.js 16 renamed `middleware.ts` to `proxy.ts` and made `params`/
  `searchParams`/`cookies()`/`headers()` fully async (no sync fallback) -
  confirmed against the framework's own bundled docs
  (`node_modules/next/dist/docs/`) before writing any routes, since
  training data predates this version.
- A handful of bugs only surfaced once this ran against a real Supabase
  project rather than just passing `npm run build` - worth calling out
  since none of them were type errors:
  - **Ambiguous embedded selects.** `project_members`/`organization_members`
    each have two foreign keys to `profiles` (`user_id` and `invited_by`).
    A select like `profiles(...)` without naming the FK
    (`profiles!project_members_user_id_fkey(...)`) fails at request time
    with `PGRST201`, not at build time.
  - **RLS scopes by "can you see this row," not "is this row yours."**
    `listUserProjects()`/`listUserOrganizations()` originally queried
    `project_members`/`organization_members` unfiltered, trusting RLS to
    return "my rows." But `is_project_member(project_id)` only checks
    whether *you* belong to that project - so the query actually returned
    every member's row for every project you're on, producing duplicate
    projects in the UI. Fixed by adding an explicit `.eq("user_id", ...)`
    - RLS is a ceiling on what a query is *allowed* to return, not a
    substitute for the query's own `WHERE` clause.
  - **Redundant `auth.getUser()` calls compound real latency.** Several
    service functions called `supabase.auth.getUser()` directly instead of
    the shared `cache()`-wrapped helper, so a single page load triggered
    3-4 separate network round trips to Supabase's Auth server (a real
    validation call, not a local JWT decode) instead of one. Consolidating
    onto one cached helper per request measurably improved navigation
    speed, especially with the Supabase project in a different region than
    the dev machine.

## ✅ Phase 2 - Project management

**Problem it solves:** Phase 1's task/issue CRUD proved the data model and
permissions, but a status-grouped list isn't how anyone actually wants to
triage work, and tasks had no way to carry supporting files or point at
the bug they were meant to fix.

**Why DevFlow needs it:** a Kanban board people will actually use day to
day, plus the "professional" polish (drag-and-drop, attachments, linked
issues, a real progress bar) the spec calls for.

**How it works:**

- **Drag-and-drop board** (`src/features/tasks/components/task-board.tsx`)
  using `@dnd-kit/core`. Dropping a card on a different column calls the
  same `updateTaskStatusAction` the manual status dropdown already used,
  with an optimistic local move so the card doesn't wait for the round
  trip. Column order within a status isn't persisted (no `position`
  column) - cards re-sort to `created_at desc` on reload. Adding a
  `position` column and a reorder mutation is the natural next step if
  manual ordering turns out to matter.
- **Task attachments**: a private Supabase Storage bucket
  (`task-attachments`) plus a `task_attachments` metadata table (Phase 2's
  addition to the schema - see `docs/database.md`). Upload/delete go
  through Server Actions using the uploader's own session, so bucket RLS
  is the same project-membership check as everything else. Downloads use
  short-lived signed URLs since the bucket is private.
- **Linked issues**: uses the `issues.linked_task_id` column that already
  existed in the Phase 1 schema (issues could always point at a task; only
  the UI to set/see it was missing). A task's detail view shows every
  issue linking to it; an issue's detail view lets you change which task
  it's linked to.
- **Linked pull requests**: intentionally left as a labeled placeholder on
  the task detail view ("Connects once GitHub integration is set up") -
  there's no real PR data to link until Phase 4, and faking it would
  violate the "never let the UI claim mock data is real" rule.
- **Project statistics**: mostly already existed from Phase 1's project
  overview page (tasks completed/total, open issues, active members,
  activity feed). Phase 2 adds a visual progress bar and splits out
  "tasks remaining" as its own stat, matching the spec's exact list.

**How it's configured:** one additional migration
(`database/migrations/0008_task_attachments.sql`) creates the table, the
storage bucket, and both sets of RLS policies - no dashboard clicking
required, same "run this SQL" workflow as Phase 1's schema.

**How it integrates:** the board still writes through the exact same
`services/tasks.ts` functions Phase 1 built; nothing about the data layer
changed shape, only the UI on top of it. Attachments and linked issues use
the RBAC model unchanged (`task:update` permission gates both).

## ✅ Phase 3 - Activity and audit system

**Problem it solves:** the Phase 1 activity feed answers "what happened,"
but has no way to narrow that down ("what did *this person* do," "show me
just role changes," "what happened last week"), and has no concept of
"security-sensitive" at all - a task rename and a permission change look
the same in the feed.

**Why DevFlow needs it:** an org growing past a handful of people needs to
be able to filter the noise, and an administrator needs a record of
security-relevant actions that regular project members can't see or
tamper with, distinct from the general "what's happening on my project"
feed.

**How it works:**

- **Activity feed filtering** (`/activity`, and project overview's feed):
  by user, event type, project, and date range, all server-rendered via a
  plain GET `<form>` and URL search params - no client JS needed, and the
  filtered URL is shareable/bookmarkable. `src/services/activity.ts`'s
  `listActivity()` already supported every one of these filters from
  Phase 1; only the UI was missing.
- **A second, distinct event log**: `audit_log`
  (`database/migrations/0009_audit_log.sql`), populated by
  `src/services/audit.ts`'s `logAudit()`. It only records the categories
  the spec calls out as security-sensitive - login, password changes,
  project membership changes, role changes, and deletions (tasks, issues,
  comments) - not every mutation. See
  [`docs/database.md`](./database.md#activity-feed-vs-audit-log) for the
  full comparison with `activity_events`.
- **Visibility is asymmetric by design**: org admins can read every
  org/project-scoped audit entry; every user can read their own
  account-level entries (their own login history) but not anyone else's -
  enforced by RLS, not application code. View it at Settings → Audit log.
- Closed a small pre-existing gap while wiring this up: comment deletion
  had a working Server Action and RLS policy but no delete button in the
  UI. Added one (visible on hover, in `CommentThread`), and made
  `deleteComment` throw a clear error instead of silently no-op'ing when
  RLS denies it - the kind of thing that's easy to miss until you're
  looking for every place a deletion needs to be audited.

**How it's configured:** one migration (`0009_audit_log.sql`) adds the
table and its RLS policies - same workflow as every migration so far.

**How it integrates:** `logAudit()` calls sit inside the same service
functions that already call `logActivity()` (`services/members.ts`,
`services/tasks.ts`, `services/issues.ts`, `services/comments.ts`), plus
two new call sites in `features/auth/actions.ts` for login and password
changes. Nothing about the RBAC model changed - the audit log observes the
same actions the permission matrix already gates.

**What was learned:** deployment actions and environment changes are
listed in the spec's audit categories, but there's nothing real to audit
there yet (Phase 10) - logging fake deployment audit entries would
contradict the "never expose mock data as real" rule that's held since
Phase 1's preview-data banners. Better to log nothing for a category than
log something fabricated; Phase 10 adds those audit entries alongside the
real deployment feature.

## ✅ Phase 4 - GitHub integration

**Problem it solves:** every prior phase's data was entered by hand inside
DevFlow. Real software development happens in Git/GitHub - without a
connection to it, DevFlow can't reflect what's actually happening in a
project's codebase.

**Why DevFlow needs it:** this is the foundation Phases 7-10 (CI,
security scanning, deployments) build on - pipelines run against commits,
deployments ship a commit SHA, and none of that means anything without a
connected repository first.

**How it works:**

- **GitHub OAuth App**, not a personal access token - a user clicks
  "Connect GitHub" (Settings), goes through GitHub's real consent screen
  (`repo read:user` scope), and DevFlow stores the resulting token
  (`src/app/api/github/oauth/`). Connecting a *repository* to a *project*
  is a separate step (any project admin with a connected account, from
  that project's Settings tab) - one user's OAuth grant, once made, is
  reusable for any repo they administer.
- **Webhooks** for real-time sync: connecting a repo registers a webhook
  (push, pull_request, issues, release events) with a per-repository
  secret. `src/app/api/webhooks/github/route.ts` verifies the
  HMAC-SHA256 signature, then upserts commits/PRs and writes an activity
  event for the other event types.
- **Manual "Sync now"** as the primary, always-available path: it doesn't
  need a public URL, so it's what actually gets tested during local
  development. Webhooks work automatically once DevFlow is deployed
  (Phase 6+); locally, GitHub simply can't reach `http://localhost`
  unless you run a tunnel.
- **Commits and Pull Requests get dedicated pages** (project-scoped tabs,
  plus a cross-project Pull Requests page replacing Phase 1's mock one -
  the first nav item to graduate from "Preview data" to real). Branches,
  contributors, releases, and GitHub's own issues are fetched live from
  the API for the project Overview tab instead of persisted - they don't
  need webhook-driven sync or a dedicated page per the spec.
- **Pull requests link to tasks** using the `linked_task_id` column
  (mirrors how issues already link to tasks since Phase 2), editable from
  the Pull Requests table or from a task's detail view, which now shows
  its real linked PRs instead of the Phase 2 placeholder.
- CI/security/deployment status per pull request are explicitly *not*
  shown yet - that data doesn't exist until Phases 7/8/10, and showing a
  placeholder status next to a real PR would be worse than not showing
  it, since it'd look like real data attached to something real.

**How it's configured:** one migration
(`0010_github_integration.sql`) plus two new environment variables
(`GITHUB_OAUTH_CLIENT_ID`/`SECRET`) from a GitHub OAuth App the user
registers themselves (same pattern as the Supabase project in Phase 1 -
an external account/app DevFlow can't provision on someone's behalf).

**How it integrates:** webhook and sync events write to the same
`activity_events` table every other phase already writes to
(`src/services/activity.ts`), so GitHub activity shows up in the same
feed as task moves and comments, filterable the same way (Phase 3).

**What was learned:**

- `lucide-react` (currently 1.33.0 in this project - a major-version jump
  from the 0.x series in training data) dropped brand/logo icons like
  `Github` entirely. Caught by `next build` failing on a missing export,
  not by lint or types - worth grepping a package's actual exports
  (`node -e "console.log(Object.keys(require('lucide-react')))"`) rather
  than assuming an icon name from memory when a major version is newer
  than expected.
- Found and fixed three open-redirect gaps while building the OAuth
  callback: every `?next=`/`?redirect=` parameter (email confirmation,
  password reset, the new GitHub OAuth callback, and even the existing
  `/login?redirect=`) needs validation that it's a same-site relative
  path before use, or a crafted link can send a user who legitimately
  authenticates off to an attacker's site afterward. Worth an explicit
  pass for this pattern any time a new "redirect back to X" flow is
  added, since it's easy to add the third instance of a bug the first two
  already had.
- Wrote the migration's own comment saying repo connect/disconnect writes
  "happen through the admin client" - then implemented the actual
  service functions using the regular session client, which has no
  INSERT/DELETE policy for that table. `npm run build` doesn't catch a
  mismatch between a migration's RLS policies and which Supabase client a
  service function uses - that only surfaces at request time. Worth
  double-checking the client/policy pairing by hand for every new write
  path, especially ones added late while a feature is still taking shape.

## ✅ Phase 5 - Testing

**Problem it solves:** every phase so far was verified by hand against the
live Supabase project. That doesn't scale - there was no way to know a
change to, say, the permission matrix or the webhook handler hadn't
silently broken something else, short of re-clicking through the whole
app after every change.

**Why DevFlow needs it:** Phase 7 (CI) needs something to actually run.
Automated tests are also what let later phases (Docker, Terraform,
Kubernetes) change how the app is *built and deployed* with confidence
that its behavior hasn't changed.

**How it works:**

- **Unit/component tests** (`tests/unit/`, Jest + React Testing Library):
  validation schemas (auth, project, task), the permission matrix
  (`config/permissions.ts`), GitHub webhook signature verification,
  `lib/utils.ts`/`config/status.ts`, and RTL component tests for the
  login/register forms and the create-project dialog (mocking the Server
  Action so these stay pure UI tests). A separate Route Handler test for
  `POST /api/webhooks/github` uses a hand-built fake Supabase admin client
  (mimicking `.from().select().eq().maybeSingle()` /
  `.upsert()`/`.insert()`) and *real* HMAC-SHA256 signatures, covering
  invalid signatures, unknown repos, `ping`, `push` (commit upsert +
  activity event), and a merged `pull_request` (PR upsert + merge activity
  event).
- **E2E tests** (`tests/e2e/`, Playwright + Chromium): log in as the
  seeded demo accounts (`database/seed/seed.ts`) rather than registering
  fresh users for most flows, since confirming a real registration needs a
  real inbox. Covers: authentication (redirect-when-signed-out, register,
  wrong password, login, logout), project creation (org admins only, per
  RLS), task creation and assignment, the resulting activity event,
  permissions (a reviewer can't manage members on a project a project
  owner can), and a smoke test that the Pull Requests page renders.
- Tests run **serially** (`workers: 1`) against `next dev`. Parallel
  workers hitting distinct routes for the first time (a fresh project ID
  every run) queue up Turbopack's on-demand compilation and produced real
  timeouts, not just slowness - serial execution removed the flakiness
  entirely for a suite this size.

**How it's configured:** `jest.config.ts` (via `next/jest`, `jsdom`,
`server-only` mapped to an empty mock - see "what was learned" below) and
`playwright.config.ts` (loads `.env.local` itself, since Playwright runs
as a plain Node process outside Next's env loading; auto-starts
`npm run dev` if nothing's already listening on port 3000). `npm test` /
`npm run test:watch` for unit tests, `npm run test:e2e` /
`npm run test:e2e:ui` for E2E.

**How it integrates:** tests exercise the exact same `services/*.ts`,
Server Actions, and RLS policies every prior phase built - nothing was
restructured to make it testable. The E2E suite runs against the same
live Supabase project the app itself uses (there's no separate test
database yet); it creates real rows (timestamped names avoid collisions
across runs) rather than mocking Supabase.

**What was learned:**

- The `server-only` package throws when it detects a `window` global,
  which jsdom provides - Jest's own Next.js integration docs recommend
  mapping it to an empty module via `moduleNameMapper` rather than
  disabling it another way.
- Zod v4 validates UUIDs against the actual RFC4122 shape (the version and
  variant nibbles), stricter than v3's format check - test fixtures like
  `"11111111-1111-1111-1111-111111111111"` fail validation because the
  4th group doesn't start with 8/9/a/b; needed valid-looking UUIDs
  (`"...-4111-8111-..."`) in every test fixture.
- E2E testing caught two real bugs unit tests couldn't have, both only
  visible in a real browser against a real backend:
  - **Manual slug editing was silently corrupting input.** The slug
    field's `onChange` re-ran the same `slugify()` used for
    auto-generating a slug from the project name - which strips trailing
    hyphens. Re-running that on every keystroke ate the hyphen before the
    next character arrived, turning "custom-slug" into "customslug" as
    you typed it. Fixed with a separate `slugifyLive()` (no trailing-
    hyphen stripping) for manual edits, keeping the full `slugify()` only
    for the auto-generate-from-name path.
  - **The account menu crashed the page on open.** `DropdownMenuLabel`
    used Base UI's `Menu.GroupLabel` directly, which throws
    (`MenuGroupContext is missing`) unless it's inside a `Menu.Group` -
    every call site in the app used it standalone (matching the
    Radix-based shadcn/ui API this was adapted from, where a label
    doesn't need a group). A component test mocking the dropdown wouldn't
    have caught this; only a real click in a real browser triggered Base
    UI's runtime check. Fixed once, in the shared component, by wrapping
    `GroupLabel` in an implicit `Menu.Group` so every caller keeps working
    unchanged.
- Locators need to account for real page structure, not just the
  element being tested: a project card's accessible name includes its
  whole visible text (including its "N members" footer), so
  `getByRole("link", { name: "Members" })` matched project cards too, not
  just the intended tab. Scoping by URL/href sidestepped it.
- Supabase's own signup endpoint rejects `@devflow.dev` addresses
  (`email_address_invalid`) even though the seeded demo accounts use that
  domain - the seed script creates them via the *admin* API
  (`auth.admin.createUser`), which skips the deliverability check that
  the public `signUp()` endpoint runs. A real E2E registration test needs
  a domain with real MX records.

## ✅ Phase 6 - Docker

**Problem it solves:** every phase so far only had one way to run DevFlow
- `npm run dev`/`npm run start` on a machine with Node 20 installed. That's
fine for local development, but it's not something Phase 7's CI can build
once and run anywhere, and it's not something Phase 9's registry has
anything to push.

**Why DevFlow needs it:** a container is the deployable unit every later
phase builds on - Phase 7 builds and tests the image, Phase 9 tags and
pushes it, Phase 10-14 run it as the actual production workload.
Packaging it now, while there's still only one way to run the app,
is simpler than retrofitting it once Docker-specific concerns
(build-time vs. runtime env vars, health checks) are tangled up with
three phases' worth of other changes.

**How it works:**

- **Multi-stage `Dockerfile`** (repo root, Docker convention): a `deps`
  stage installs dependencies once and caches that layer separately from
  source changes; a `builder` stage runs `npm run build`; a `runner`
  stage copies only the traced output `next.config.ts`'s new
  `output: "standalone"` produces (`.next/standalone`, `.next/static`,
  `public`) into a fresh `node:22-alpine` image, running as a non-root
  user. No source, no dev dependencies, no full `node_modules` in the
  final image. (Originally `node:20-alpine` - bumped to 22 once Phase 7
  found that version was actually broken for this app; see that phase's
  notes below.)
- **A liveness endpoint**, `/api/health` (`src/app/api/health/route.ts`):
  returns `200 {"status":"ok"}` immediately - deliberately cheap ("is the
  process up," not "can it reach Supabase"), so Docker's `HEALTHCHECK`
  (and later Kubernetes probes, Phase 13/14) can poll it often without
  false-flagging the container unhealthy during a transient Supabase
  blip that isn't this process's fault. `proxy.ts` already treats
  `/api/*` as public, so the check doesn't need auth.
- **`docker-compose.yml`** runs the one `app` service against the same
  cloud Supabase project `npm run dev` already uses (`env_file:
  .env.local`) - **no local Postgres or Redis container.** DevFlow's
  Postgres *is* Supabase: Auth, row-level security, and Storage all come
  from the same hosted project, and a bare `postgres` image the app isn't
  actually configured to talk to would be exactly the "infrastructure the
  UI doesn't actually use" problem this project has avoided since Phase
  1's mock-data banners and Phase 3's audit-log scoping. Redis isn't
  added either - nothing in the app does caching or background job
  processing yet, so there's nothing for it to back (see
  `docs/architecture.md`'s "not until a concrete problem requires it"
  principle). Both get added in whichever future phase introduces a real
  consumer, not preemptively here.
- **`.dockerignore`** keeps `node_modules`, `.git`, `.env*`, tests, and
  docs out of the build context - real secrets are injected via `docker
  run -e` / compose's `env_file`, never baked into the image.

**How it's configured:** `npm run docker:build` / `docker:up` /
`docker:down` (thin wrappers around `docker compose`, using
`--env-file .env.local` so compose's variable substitution - separate
from the `env_file:` that populates the *container's* runtime
environment - can see it too), or `docker build`/`docker run` directly.
See [`docs/development.md`](./development.md#running-with-docker).

**How it integrates:** the image runs the exact same Next.js app every
prior phase built - Server Actions, RLS-backed Supabase queries, the
GitHub webhook route - unchanged. `NEXT_PUBLIC_*` variables are declared
as Dockerfile `ARG`s (inlined into the client bundle at build time, the
way Next.js requires) even though nothing in the app reads them from a
Client Component yet (everything's Server Components/Actions so far) -
so that stays correct once something does, without another round of
Docker changes.

**What was learned:**

- `output: "standalone"` needed verifying beyond just `next build`
  succeeding - Docker isn't installed on this machine, so the real check
  was copying `public`/`.next/static` into `.next/standalone` by hand and
  running `node server.js` directly (exactly what the Dockerfile's runner
  stage does), then curling `/api/health`, `/login`, and `/` against it.
  All three responded correctly, which is the same artifact Docker would
  produce - "the build succeeds" and "the server actually serves traffic"
  are different claims, and only the second one is what running in
  production means.
- `next build` succeeds with **zero** environment variables present (no
  `.env.local` at all) - verified directly by moving it aside and
  rebuilding. Nothing in this app reads a Supabase env var during static
  generation (every route touching Supabase is server-rendered on
  demand, not prerendered) and no Client Component reads a
  `NEXT_PUBLIC_*` value. That's what makes it safe for the Dockerfile's
  build stage to not require secrets - but it's a property of *this
  app's current code*, not of Next.js generally, and would stop being
  true the moment a Client Component reads `env.supabaseUrl()`.
- `output: "standalone"` copies a `package.json` into `.next/standalone`
  with the same `"name"` as the repo's own - `jest-haste-map` scans that
  by default and reports a "Haste module naming collision" warning any
  time `.next/` exists when `npm test` runs (e.g., build-then-test in the
  same session, or a CI job that does both). Jest's `testPathIgnorePatterns`
  already excluded `.next/` from *test* discovery, but not from the
  module map it builds regardless - fixed with a separate
  `modulePathIgnorePatterns`.
- Next.js's self-hosting guide flags `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`
  as something that must stay consistent across instances, or requests
  landing on different server processes fail with "Failed to find Server
  Action" - not a problem for today's single-container Compose setup
  (Next generates and bakes in one key per build, and every container
  from that build shares it), but worth remembering once Phase 10+
  actually runs multiple replicas or does rolling deploys across
  separate image builds.

## ✅ Phase 7 - CI with GitHub Actions

**Problem it solves:** every check so far (`lint`, `type-check`, `test`,
`build`, `test:e2e`) only ran when someone remembered to run it by hand.
Nothing stopped a broken build or a failing test from reaching `main`.

**Why DevFlow needs it:** this is the first *real, DevFlow-external*
DevOps system in the project - GitHub, not something DevFlow's own code
runs - and it's the data source for the Pipelines dashboard the spec
calls for. Phase 9 (registry) and Phase 10+ (deployments) both build on
"there's a CI run for every commit," so it has to exist before either can.

**How it works:**

- **`.github/workflows/ci.yml`**, four independent jobs on every push and
  pull request to `main`: `lint`, `type-check`, `unit-tests`, `build`.
  None of them need secrets - Phase 6 already confirmed `next build`
  succeeds with zero environment variables present, since nothing here
  reads a Supabase value during static generation or from a Client
  Component.
- **A fifth job, `e2e`, runs only on push to `main`** (not on every PR):
  it seeds the database (`npm run db:seed` - safe to re-run, every insert
  in the seed script checks for an existing row first) and runs the full
  Playwright suite against a freshly-started server, same as locally.
  Deliberately *not* on every PR: this suite logs in as the seeded demo
  accounts and creates real, timestamped projects/tasks in the same live
  Supabase project `npm run dev` already uses - DevFlow has no separate
  test environment (see "what was learned" below) - and running it on
  every PR would multiply both that data growth and how often the
  registration test can hit Supabase's email rate limit. Needs four
  repository secrets set in GitHub (Settings -> Secrets and variables ->
  Actions): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`, `SEED_USER_PASSWORD` - the same values
  already in `.env.local`.
- **The Pipelines page is live now** (`src/app/(dashboard)/pipelines/`,
  `live: true` in `config/navigation.ts`): it fetches CI runs straight
  from GitHub's REST API (`GET /repos/{owner}/{repo}/actions/runs`, then
  each run's `/jobs` for a per-job status breakdown) for every project
  the user belongs to that has a connected repository - the exact same
  "fetch live, don't persist" pattern Phase 4 already used for a repo's
  branches/contributors/releases. `MOCK_PIPELINES` is gone; the page
  shows a real empty state ("Connect a GitHub repository...") when a
  project has no connected repo, or that repo has no runs yet, instead of
  the old `<PreviewDataBanner />`.

**How it's configured:** nothing new beyond the repository secrets
above - the workflow file and the Pipelines page both reuse Phase 4's
GitHub OAuth connection (`github_accounts`, `project_repositories`) for
everything they need.

**How it integrates:** `listVisiblePipelineRuns()`
(`src/services/github.ts`) composes the same `getProjectRepository()` /
`getGitHubAccount()` lookups the project overview page's repository
snapshot already uses, so a pipeline run only shows up for a project once
someone's actually connected a repo to it (Settings tab) - same
authorization shape as everything else GitHub-related.

**What was learned:**

- Verified the empty state, not (yet) the populated one: `ci.yml` didn't
  exist on GitHub until this phase's commit is pushed, so
  `MrMlaba/DevFlow` genuinely has zero Actions runs to fetch right now.
  Ran the new Pipelines page against the live dev server and confirmed it
  renders the "No CI runs yet" empty state correctly rather than
  crashing or showing anything fabricated - the "there are real runs and
  they render with the right status/stage badges" path can only be
  verified after pushing, since a run has to actually happen on GitHub
  first.
- DevFlow doesn't have a separate CI/test Supabase project - every phase
  so far has tested directly against the one real project, which is a
  deliberate, cost-free choice for a personal learning project but means
  the E2E job in CI writes real rows to the same database dashboard use
  does. Scoping E2E to `main`-only pushes (rather than skipping it
  entirely, or accepting it on every PR) is this phase's answer to that
  tradeoff - documented here rather than solved with new infrastructure,
  since a real separate environment is a bigger decision than this phase
  needs to make.
- GitHub's workflow-run status/conclusion pair has more states
  (`skipped`, `neutral`, `timed_out`, `action_required`,
  `startup_failure`) than the UI's five-state badge
  (`queued`/`running`/`success`/`failed`/`cancelled`) or four-state stage
  badge (`success`/`failed`/`running`/`pending`) have room for. Grouping
  `skipped`/`neutral` under "cancelled" rather than "failed" was a
  deliberate call - a job that didn't run isn't the same claim as a job
  that ran and broke - and is unit-tested directly
  (`tests/unit/services/github-pipelines.test.ts`) since it's exactly the
  kind of mapping logic that's easy to get subtly wrong and easy to test
  in isolation.
- **`tsc --noEmit` on its own doesn't have what `next build` generates for
  free.** The first real CI run failed `type-check` with "Cannot find
  name 'PageProps'"/`'LayoutProps'` - Next's route-aware type helpers
  (used in `layout.tsx`, `login/page.tsx`) live in `.next/types/`, which
  `next build`/`next dev` generate as a side effect but a standalone
  `tsc --noEmit` never triggers on its own. Never caught locally because
  `.next/` already existed from prior local builds. Fixed with
  `next typegen` (generates just the route types, no full build) as a
  step before `type-check` in CI.
- **This app's actual minimum Node version turned out to be 22, not
  20** - and every earlier phase had been silently relying on this
  machine's Node 24. `@supabase/supabase-js`'s `realtime-js` dependency
  initializes a `RealtimeClient` unconditionally inside the
  `SupabaseClient` constructor (every `createClient()` call, whether or
  not realtime features are used), and that constructor requires a native
  `WebSocket` global - present in Node 22+, not Node 20. The `e2e` job's
  `npm run db:seed` step crashed with "Node.js detected but native
  WebSocket not found" the instant it created a Supabase client, on a
  workflow pinned to `node-version: 20`. Bumped to Node 22 everywhere
  that runs this app for real: `ci.yml`, the Phase 6 `Dockerfile`
  (`node:20-alpine` -> `node:22-alpine`), and `package.json`'s new
  `engines.node`. Local development never hit this because it happened
  to run on Node 24 the whole time - a reminder that "works on my
  machine" can be hiding an actual minimum-version requirement, not just
  a preference, and that CI running on a *different*, explicitly-pinned
  Node version is exactly what catches that.

## ✅ Phase 8 - DevSecOps

**Problem it solves:** Phase 7's `ci.yml` checks that the app *works*
(lints, type-checks, tests, builds) but says nothing about whether it's
*safe* - a committed API key, a SQL-injection-shaped pattern, a
vulnerable npm package, or a CVE in the Docker base image would all pass
CI cleanly.

**Why DevFlow needs it:** this is the actual subject of Phase 8's spec
section - three scanners (SAST, secrets, container/dependency
vulnerabilities) plus Dependabot, with findings visible inside DevFlow
itself, not just buried in a separate tool's dashboard.

**How it works:**

- **`.github/workflows/security.yml`**, three independent jobs on every
  push/PR to `main` plus a weekly Monday-morning schedule (a dependency
  can go from safe to vulnerable without this repo changing at all, once
  a new CVE is disclosed):
  - **Gitleaks** - scans the current tree (not full git history) for
    secrets.
  - **Semgrep** - SAST using community rulesets (`p/security-audit`,
    `p/typescript`, `p/react`) - no Semgrep account/token needed, and
    `--metrics=off` skips even the anonymous usage ping.
  - **Trivy** - builds the actual Phase 6 `Dockerfile` and scans the
    resulting image for CRITICAL/HIGH OS and dependency
    vulnerabilities. This doubles as the first real CI verification that
    the Dockerfile builds at all - Phase 6 could only check that by hand
    (Docker isn't installed on the machine this project was built on).
  - All three upload SARIF to GitHub's code scanning
    (`github/codeql-action/upload-sarif`), the same system CodeQL uses.
- **Reporting, not blocking, for now**: every scanner is configured to
  exit `0` regardless of findings, so a finding doesn't fail the build.
  Semgrep's community rulesets in particular are known for real false
  positives on a codebase that's never been scanned before - turning
  every finding into an instant hard failure on day one, before anything
  has been triaged, would mean the first run blocks all future pushes.
  Turning specific categories into a real gate is a natural follow-up
  once findings have been reviewed.
- **`.github/dependabot.yml`** - weekly version-update PRs for npm and
  GitHub Actions dependencies. This is a *different* GitHub feature from
  "Dependabot alerts" (vulnerable dependency findings); alerts need
  enabling once, manually, in the repo's Settings (see
  `docs/development.md`).
- **The Security page is live** (`src/app/(dashboard)/security/`,
  new nav item using the `ShieldAlert` icon Phase 0 had already reserved
  for this): fetches findings straight from two separate GitHub
  systems - code scanning alerts (Semgrep/Gitleaks/Trivy) and Dependabot
  alerts - and merges them into one table (finding, project, severity,
  file/dependency, status, detected time), same "fetch live, don't
  persist" pattern as Pipelines (Phase 7) and the repo snapshot (Phase
  4). No new database table.

**How it's configured:** nothing beyond what's already there from Phase
4 (the GitHub OAuth connection) - plus, once, enabling "Dependabot
alerts" in the connected repo's Settings -> Code security. Code scanning
alerts populate themselves the first time `security.yml` runs.

**How it integrates:** `listVisibleSecurityFindings()`
(`src/services/github.ts`) reuses the exact same
`getProjectRepository()`/`getGitHubAccount()` lookups every other
GitHub-backed page already uses - a finding only shows up for a project
once someone's connected a repo to it, same authorization shape as
Pipelines and Pull Requests.

**What was learned:**

- GitHub gates these two endpoints on the `security_events` OAuth scope
  for private repos, but accepts the narrower `public_repo` scope (a
  strict subset of the already-requested `repo` scope) for public ones -
  confirmed against GitHub's own REST API docs before writing any code,
  since guessing wrong here would have meant either a silently-broken
  feature or asking every connected user to re-consent to a broader
  scope for no reason. `MrMlaba/DevFlow` is public, so the existing Phase
  4 connection works without any changes.
- Verified each tool's exact CLI/action syntax against current docs
  before writing the workflow, rather than from memory - training data
  for fast-moving CLI flags (gitleaks' `detect` subcommand was deprecated
  in favor of `dir`, for one) ages out quickly, and a wrong flag here
  would have meant another slow push-wait-read-logs CI debug cycle like
  Phase 7's.
- A code scanning alert's severity can live in either of two fields -
  `rule.security_severity_level` (a normalized low/medium/high/critical,
  when the tool provides one) or the more generic `rule.severity`
  (none/note/warning/error, always present) - and which one shows up
  depends on the uploading tool. Handled with an explicit fallback
  (`codeScanningSeverity()`), unit-tested directly
  (`tests/unit/services/github-security.test.ts`) rather than assumed,
  since a silently-wrong severity badge is a security dashboard failing
  at its one job.
- Two more real bugs, caught only once this actually ran on GitHub:
  `aquasecurity/trivy-action@0.36.0` failed instantly ("Set up job")
  because the real git tag is `v0.36.0` - GitHub Actions doesn't fall
  back to a nearby tag, it just fails to resolve the reference. And the
  `trivy` job's own `docker build` step failed with `"/app/public": not
  found` - `public/` had been empty since Phase 0's scaffold, and **git
  doesn't track empty directories at all**, so it existed on the local
  disk this project was built on but was never actually in the repo;
  `actions/checkout` on a fresh CI runner never had it. Fixed with a
  `public/.gitkeep`, verified by exporting the commit tree with
  `git archive` (which reproduces exactly what a checkout produces)
  before pushing again, rather than trusting the working directory.

## ✅ Phase 9 - Container registry

**Problem it solves:** Phase 6 built a `Dockerfile`; Phase 8's `trivy`
job proved it actually builds in CI. Neither produces anything anyone
else can run - the image only ever existed inside that one job, then got
thrown away.

**Why DevFlow needs it:** a pushed, tagged image is the actual
deployable artifact Phase 10+ (deployment environments, AWS, Kubernetes)
need to reference - "deploy commit `abc123`" only means something once
there's a real image tagged `abc123` sitting in a registry.

**How it works:**

- **`.github/workflows/docker.yml`** builds the same Phase 6 `Dockerfile`
  and pushes to **GitHub Container Registry** (`ghcr.io`), not Docker
  Hub - authentication is the workflow's own built-in `GITHUB_TOKEN`
  (`packages: write` permission), not a new secret to configure, unlike
  Phase 7's `e2e` job. Only runs on push to `main` and on version tags
  (`v*.*.*`) - never on PRs, since an image built from an unreviewed
  branch has no business in a shared registry; PRs already get their
  Dockerfile validated by Phase 8's `trivy` job, which builds the image
  too but never pushes it.
- **Tagging** via `docker/metadata-action`: `sha-<short-sha>` on every
  push, `latest` only on `main`, and the semver tag itself
  (`v1.2.3` -> tag `1.2.3`) when the trigger was a version tag. Image
  name (`ghcr.io/${{ github.repository }}`) is lowercased automatically -
  necessary since `MrMlaba/DevFlow` has uppercase characters Docker image
  refs can't.
- **The Pipelines page now shows published images** too (a new
  "Container images" section below the existing CI runs list - the same
  page, not a new nav item, since an image is downstream of a CI run and
  the two belong in one "delivery" story): tags, which project, and when
  pushed, each linking out to its GHCR page. Same live-fetch pattern as
  everything else GitHub-backed.

**How it's configured:** nothing new for the workflow itself (GHCR auth
is automatic). The read path needed a **new OAuth scope**,
`read:packages` - added to `buildAuthorizeUrl()`
(`src/lib/github.ts`) alongside the Phase 4 `repo read:user` scopes.
Unlike Phase 8's code scanning/Dependabot endpoints, GitHub does **not**
accept `repo`/`public_repo` as a substitute for `read:packages`, even for
public packages - confirmed against GitHub's REST API docs before
building anything, specifically to avoid finding out the hard way that
an existing connection couldn't see image data. Accounts connected
before this phase (i.e. everyone, so far) need to reconnect GitHub
(Settings) once to pick up the new scope; until then, the "Container
images" section just shows its empty-state message rather than erroring
- the same fails-open handling `list*` functions in `services/github.ts`
already use everywhere for a missing scope/permission.

**How it integrates:** `listVisibleContainerImages()` reuses the same
`getProjectRepository()`/`getGitHubAccount()` lookups every other
GitHub-backed page uses. GHCR packages are user/org-scoped, not
repo-scoped, even though the image is *named* after the repo - the
Packages API call is `/users/{owner}/...`, not `/repos/{owner}/{repo}/...`.

**What was learned:**

- Verified `docker/login-action`, `docker/metadata-action`, and
  `docker/build-push-action`'s exact current version tags against their
  real git tags (`v4`, `v6`, `v7`) before writing the workflow - directly
  motivated by Phase 8's `trivy-action@0.36.0` (missing the `v`) failing
  instantly in CI. Worth establishing as a standing habit for every new
  third-party Action, not just the one that already burned time.
- GitHub Packages' version-listing response doesn't include image size
  or digest at all (confirmed against the API docs, not assumed) -
  getting real size data would mean calling the registry's own Docker
  Registry HTTP API v2 directly (a different, manifest-based protocol,
  not a REST endpoint), which is real added complexity for one column.
  Left out rather than faked or estimated - the roadmap's original
  "image/tag/commit/size/security status" list assumed a field that
  turned out not to be free to get; commit and tag both still show
  (the pushed tag literally contains the short SHA), and security status
  is already covered by Phase 8's Security page.

## ✅ Phase 10 - Deployment environments

**Problem it solves:** Phase 9 gets an image into a registry; nothing
runs it anywhere real. Every prior phase's "deployment" was `npm run
dev` on the machine this project was built on.

**Why DevFlow needs it:** this is the first environment a real user
(not just this project's own CI) could actually visit, and the first
place a "Production approval gate" - a human decision the deploy
literally waits on - means anything.

**How it works:**

- **Hosting is Vercel, not AWS** - Phase 11 ("AWS") is explicitly where
  this project provisions real cloud infrastructure; introducing that
  now would duplicate that phase's whole purpose. Vercel's free tier
  gets a real, working deployment today with zero billing, and Phase 11
  later becomes "migrate Production to AWS," a realistic sequence real
  teams follow.
- **Three environments, mapped honestly onto what free-tier Vercel
  actually offers** - a genuine third hosted tier ("Custom Environments")
  needs a paid Pro plan, discovered by checking Vercel's docs rather than
  assuming:
  - **Development** = this machine, `npm run dev`. Unhosted, exactly as
    it's been since Phase 0.
  - **Staging** = a Vercel **Preview** deployment - auto-deploys on
    every push to `main`, no gate.
  - **Production** = a Vercel **Production** deployment
    (`vercel deploy --prod`), gated behind a GitHub Environment with a
    required reviewer.
- **`.github/workflows/deploy.yml`**, two jobs on push to `main`:
  `deploy-staging` (unconditional), then `deploy-production` (`needs:
  deploy-staging`). Each job's `environment:` key is what makes GitHub
  create a real, API-readable Deployment record for that push - and,
  once a required-reviewer rule is added to the `production` environment
  (Settings -> Environments -> production -> Required reviewers, a
  one-time manual step), what makes that job actually pause for a human
  click before running. No custom approval logic in DevFlow's own code -
  GitHub enforces it natively, same pattern as every GitHub-native
  feature this project has leaned on since Phase 7.
- **Environments and Deployments pages are both live now**
  (`src/app/(dashboard)/environments/`, `.../deployments/`): read
  straight from GitHub's real Deployments API - same live-fetch pattern
  as Pipelines/Security/container images. Development renders as a
  static, unhosted card (there's nothing to fetch for it); Staging and
  Production show their latest real deployment or an honest "Not
  deployed yet."

**How it's configured:** a Vercel account, with the project's Git
integration **disconnected** (Vercel's own auto-deploy-on-push would
otherwise run in parallel with this workflow's deploys and conflict);
`VERCEL_TOKEN`/`VERCEL_ORG_ID`/`VERCEL_PROJECT_ID` as GitHub repository
secrets; the app's env vars set directly on Vercel's dashboard (they
differ by environment, which is what Vercel's own env var scoping is
for - not duplicated through GitHub Actions). See
[`docs/development.md`](./development.md) for the exact steps.

**How it integrates:** `listVisibleDeployments()` reuses the same
`getProjectRepository()`/`getGitHubAccount()` lookups every other
GitHub-backed page uses - a deployment only shows up for a project once
someone's connected a repo to it, unchanged since Phase 4.

**What was learned:**

- **`output: "standalone"` (Phase 6, for the Docker image) broke the
  very first Vercel build outright** - `next build` itself succeeded,
  but Vercel's own post-build step failed with `ENOENT
  .next/next-server.js.nft.json`. Standalone mode restructures the build
  output specifically for generic self-hosting and doesn't produce the
  file Vercel's Lambda-bundling pipeline expects; the two are mutually
  exclusive. Fixed by making `output` conditional on the `VERCEL` env var
  Vercel sets automatically during its own build, verified locally both
  ways (`npm run build` still produces `.next/standalone`; `VERCEL=1 npm
  run build` produces `next-server.js.nft.json` instead) before pushing.
- **Vercel access tokens can be scoped to a single project**, and a
  project-scoped token fails account-level operations (`vercel whoami`,
  `vercel link`) with a confusing `404 User not found` - not an
  "invalid token" error, which cost real time treating it as a
  bad-paste problem before the dashboard's own Scope column (comparing
  a working token's icon against the failing one's) made the actual
  difference visible. The fix is a token created with Scope: **Full
  Account**, not a project.
- **`vercel deploy`'s stdout shape isn't just an interactive-vs-piped
  question - it's platform-dependent too, which "verified locally"
  didn't actually catch.** The exact same non-interactive invocation
  (`vercel deploy --yes`, output captured via command substitution)
  printed a JSON result object when tested on this Windows machine, but
  a bare URL on GitHub's real Linux runner - matching Vercel's own CLI
  docs example ("stdout is always the Deployment URL") there, but not
  here. The first real CI run crashed trying to `JSON.parse()` a plain
  URL string. Fixed by not assuming either shape: check whether the
  output starts with `{` before attempting to parse it, falling back to
  the raw string otherwise. The deeper lesson isn't about Vercel
  specifically - it's that "I tested this exact command locally" is only
  as strong as how close "locally" is to where it'll actually run;
  Windows Git Bash was close enough to catch some things (Phase 6-9's
  local verifications all held up) but not this one.
- **Vercel's Deployment Protection (an SSO wall) applies to `*.vercel.app`
  URLs by default - including the Production one**, not just Preview
  deployments - confirmed directly via the Projects API
  (`ssoProtection.deploymentType: "all_except_custom_domains"`). Only a
  connected *custom domain* is exempt. Left as Vercel's secure-by-default
  setting rather than silently disabled - genuinely making Production
  publicly reachable needs either a custom domain or an explicit,
  deliberate opt-out in Project Settings, both real decisions for
  whoever owns the project to make, not something to flip quietly while
  wiring up a deploy pipeline.

## ⬜ Phase 11 - AWS

First manual production deployment: IAM, VPC, subnets, security groups,
load balancing, ECR, CloudWatch, RDS, S3.

## ⬜ Phase 12 - Terraform

The Phase 11 infrastructure re-created as code: `main.tf`, `variables.tf`,
`outputs.tf`, `providers.tf`, `vpc.tf`, `iam.tf`, `ecr.tf`, `rds.tf`.

## ⬜ Phase 13 - Kubernetes locally

Kind/Minikube. Manifests for frontend/backend/worker/redis/postgres:
Deployments, Services, ConfigMaps, Secrets, Ingress, probes, HPA.

## ⬜ Phase 14 - AWS EKS

Production workload moved to EKS: node groups, IAM, load balancer,
networking, autoscaling - provisioned via the Phase 12 Terraform.

## ⬜ Phase 15 - Monitoring and observability

Prometheus (CPU, memory, request rate/latency, error rate, DB
connections), Grafana dashboards, Loki logs.

## ⬜ Phase 16 - Incident management

Incidents with severity/status/timeline, MTTR and failure-rate
calculations, tied to deployments and monitoring alerts.

## ⬜ Phase 17 - GitOps with Argo CD

Argo CD watches a deployment-config repo/path; DevFlow displays GitOps
sync status.

## ⬜ Phase 18 - AI project assistant

OpenAI API, answering questions about real DevFlow data (tasks, GitHub
activity, pipelines, deployments, incidents). Responses clearly separate
actual system data from AI-generated interpretation - the assistant never
fabricates statistics.

## ⬜ Phase 19 - Team contribution dashboard

Per-member activity indicators (commits, PRs, tasks completed, reviews,
deployments) for lecturers/PMs - explicitly labeled as activity
indicators, not a claim that commit count equals contribution.

## ⬜ Phase 20 - Production hardening

Security/performance/accessibility/error-handling/logging passes; DB
indexes, caching, API validation, rate limiting; dependency/container/
load/security testing; backup and disaster-recovery documentation.
