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

## ⬜ Phase 3 - Activity and audit system

Filtering (by user/event type/project/date) on top of Phase 1's activity
feed, plus a separate security-sensitive audit log (logins, permission/
role changes, membership changes, deployment actions, deletions) distinct
from the general activity feed.

## ⬜ Phase 4 - GitHub integration

Connect a GitHub repo to a project via the GitHub API/OAuth/webhooks.
Commits, branches, pull requests, issues, releases, contributors. Webhook
events become activity events. PRs linkable to tasks.

## ⬜ Phase 5 - Testing

Jest + React Testing Library (unit), Playwright (e2e). Coverage for auth,
project/task creation, permissions, webhook processing, PRs, activity
events. `npm test` and `npm run test:e2e`.

## ⬜ Phase 6 - Docker

`Dockerfile` (multi-stage), `docker-compose.yml` (app + Postgres/Redis
locally), `.dockerignore`, health checks.

## ⬜ Phase 7 - CI with GitHub Actions

`ci.yml`: checkout, install, lint, type-check, unit tests, build, e2e.
Results surfaced in a DevFlow Pipelines dashboard.

## ⬜ Phase 8 - DevSecOps

Semgrep, Gitleaks, Trivy, Dependabot wired into the pipeline. Findings
surfaced in a DevFlow Security section (vulnerability, severity,
dependency, file, status, detection time, recommended action).

## ⬜ Phase 9 - Container registry

Images tagged by commit SHA/branch/semver, pushed to GitHub Container
Registry (later AWS ECR). Image/tag/commit/size/security status visible
in DevFlow.

## ⬜ Phase 10 - Deployment environments

Development/Staging/Production, deployment history, Production approval
gate.

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
