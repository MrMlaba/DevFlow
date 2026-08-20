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

## ⬜ Phase 2 - Project management

Real Kanban board with drag-and-drop, task attachments, linked issues/PRs,
and project statistics (completion %, open issues, active members, recent
activity). Phase 1 ships task/issue CRUD and a status-grouped board
without drag-and-drop as the honest MVP version of this.

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
