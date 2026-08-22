# Development

## Prerequisites

- **Node.js 22+** and npm - not just "recent enough": `@supabase/supabase-js`
  requires a native `WebSocket` global (Node 22+) the instant anything
  calls `createClient()`, even if nothing uses realtime features. Older
  Node throws immediately (see `docs/devops-roadmap.md`, Phase 7).
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

`$DATABASE_URL`'s host matters: Supabase's direct connection host
(`db.<project-ref>.supabase.co`) resolves IPv6-only, which fails with
"Temporary failure in name resolution" on an IPv4-only network - not a
credentials problem (found while applying Phase 16's migration; see
`docs/devops-roadmap.md`). Use the connection pooler host instead,
copied from the Supabase dashboard's Connect button ("Session pooler"
or "Transaction pooler" tab):

```
postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
```

Note the username is `postgres.<project-ref>`, not just `postgres`,
when going through the pooler. If a fresh migration's table doesn't
show up in the app right after applying it (a PostgREST error like
`PGRST205: Could not find the table '...' in the schema cache`), force
a refresh instead of waiting for PostgREST's own polling interval:

```bash
psql "$DATABASE_URL" -c "NOTIFY pgrst, 'reload schema';"
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

## CI (GitHub Actions)

`.github/workflows/ci.yml` runs `lint`/`type-check`/`unit-tests`/`build`
on every push and pull request to `main` - no setup needed, none of them
use secrets. The `e2e` job (push to `main` only) needs four repository
secrets set at Settings -> Secrets and variables -> Actions, using the
same values as your `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`SEED_USER_PASSWORD`. Without them, that one job fails while the other
four still pass normally.

## Security scanning

`.github/workflows/security.yml` runs Gitleaks, Semgrep, and Trivy on
every push/PR to `main` and weekly - no setup needed, none of them use
secrets or accounts. Findings show up in DevFlow's own Security page,
which reads them from two GitHub features:

- **Code scanning alerts** (Semgrep/Gitleaks/Trivy) populate themselves
  automatically the first time `security.yml` runs - nothing to enable.
- **Dependabot alerts** (vulnerable dependencies) need enabling once, at
  **Settings -> Code security -> Dependabot alerts** on the GitHub repo.
  Without it, DevFlow's Security page just won't show any Dependabot
  findings - it fails open, not with an error.

`.github/dependabot.yml` is a separate, related feature - weekly PRs
that bump outdated dependencies - and works independently of whether
alerts are enabled.

## Container registry

`.github/workflows/docker.yml` builds and pushes an image to GitHub
Container Registry on every push to `main` and on version tags - no
setup needed, GHCR auth is the workflow's own built-in token.

Seeing pushed images on the Pipelines page needs the `read:packages`
OAuth scope, added in Phase 9 - if you connected GitHub before this
phase, **reconnect it once** (Settings -> GitHub -> Disconnect, then
Connect again) to pick up the new scope. Until then, the page's
"Container images" section just shows its empty-state message rather
than an error.

## Deployments (Vercel)

`.github/workflows/deploy.yml` deploys to Vercel on every push to
`main` - Staging (a Preview deployment) automatically, Production only
after a human approves it in GitHub's UI. One-time setup, none of it
billed:

1. Create a free Vercel account (vercel.com) and import this repo as a
   project.
2. **Disconnect Vercel's own Git integration**: project -> Settings ->
   Git -> Disconnect. Otherwise Vercel deploys on every push *and* this
   workflow does too.
3. Create an access token at vercel.com/account/tokens with **Scope: Full
   Account** - not scoped to a single project, or CLI commands like
   `vercel whoami` fail with a `404 User not found` that looks like a bad
   token but isn't (see Phase 10's notes in `docs/devops-roadmap.md`).
4. Get your Org ID and Project ID - easiest via `npx vercel link` in the
   repo root (prompts you to log in, then links the directory); read
   both out of the `.vercel/project.json` it creates.
5. Add three repository secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`,
   `VERCEL_PROJECT_ID`.
6. Set the app's env vars **on Vercel's dashboard**, not through GitHub
   Actions - project -> Settings -> Environment Variables:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL` (set this to
   whatever domain Vercel assigns your project). Vercel scopes env vars
   per environment natively, which is simpler than passing them through
   CI.
7. Add your Vercel domain to Supabase's redirect allowlist: Supabase
   dashboard -> Authentication -> URL Configuration -> Redirect URLs ->
   add `https://*.vercel.app/**`.
8. **Require a reviewer for Production**: repo Settings -> Environments
   -> `production` -> Required reviewers -> add yourself. Without this,
   `deploy-production` runs immediately instead of waiting for approval.

**Known limitation**: the GitHub integration (Connect GitHub) uses an
OAuth App with one fixed callback URL, currently pointed at `localhost`
- it won't work on the deployed site unless you register a second OAuth
App with a production callback URL. Left out of scope rather than
solved partially.

**Also worth knowing**: Vercel's Deployment Protection (an SSO wall) is
on by default for every `*.vercel.app` URL, Production included - only a
connected custom domain is exempt. That means only you (logged into
Vercel) can open Staging/Production links until you either attach a
custom domain or turn protection off explicitly in Project Settings ->
Deployment Protection.

## AWS (Phase 11)

The same container Phase 6 already builds, running on a real EC2
instance instead of a laptop - see `docs/devops-roadmap.md` (Phase 11)
for the full architecture and why load balancers/NAT Gateways/RDS were
deliberately left out (the first two cost money just for existing; the
third would duplicate Supabase, which the app already uses for
everything).

**One-time account setup:**

1. Create an AWS account (requires a payment card even for free-tier
   usage - it won't be charged as long as usage stays in bounds).
2. **Before creating anything else**: AWS Budgets -> create a budget,
   alert at a low threshold (this project uses $1) - the point is being
   notified within hours of any real spend, not at the end of the month.
3. Enable MFA on the root account (root has no permission limits, so
   it's the login worth protecting).
4. IAM -> create a user (not root) with `AdministratorAccess`, create an
   access key for it (CLI use case).
5. Put `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` in `.env.local` -
   these are for the AWS CLI on your own machine, not read by the
   Next.js app itself (see `.env.example`).
6. Make the `devflow` GHCR package public (github.com/MrMlaba/DevFlow ->
   Packages -> devflow -> Package settings -> Change visibility) - the
   EC2 instance pulls it without needing a second credential this way.

The app itself, running on that infrastructure, gets its config from
AWS Systems Manager Parameter Store (`/devflow/*`, `SecureString`) at
boot - not from `.env.local` and not baked into the instance. Only the
EC2 instance's own IAM role can read them.

**Windows-specific gotcha**: Git Bash rewrites `/`-prefixed CLI arguments
into Windows paths (MSYS path conversion), which breaks AWS CLI
parameter names and `file://` references in ways that look like a real
AWS error but aren't. Set `MSYS_NO_PATHCONV=1` before running `aws`
commands (and, defensively, `terraform` too) from Git Bash. PowerShell
and a real Linux/macOS shell don't have this problem.

## Terraform (Phase 12)

`terraform/` codifies the exact infrastructure Phase 11 provisioned by
hand - see `docs/devops-roadmap.md` (Phase 12) for the full reasoning
(what's deliberately not there, and why secrets never touch Terraform
state).

One-time bootstrap - the S3 bucket backing Terraform's own state has to
exist before Terraform can use it as a backend, so it's created via the
CLI, not Terraform itself:

```bash
aws s3api create-bucket --bucket devflow-terraform-state-<your-account-id> --region us-east-1
aws s3api put-bucket-versioning --bucket devflow-terraform-state-<your-account-id> --versioning-configuration Status=Enabled --region us-east-1
aws s3api put-bucket-encryption --bucket devflow-terraform-state-<your-account-id> --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}' --region us-east-1
aws s3api put-public-access-block --bucket devflow-terraform-state-<your-account-id> --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true --region us-east-1
```

Update the bucket name in `terraform/providers.tf`'s `backend "s3"`
block to match, then:

```bash
cd terraform
terraform init
terraform plan   # review before applying anything
terraform apply
```

Needs `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` in your shell
environment (the same ones in `.env.local` from Phase 11's setup) and
the `devflow` GHCR package set to public, same as Phase 11.

**If Phase 11's infrastructure already exists when you first run this**:
either `terraform import` each resource, or tear down the manually-
created resources first and let `terraform apply` create them fresh -
this project did the latter (see Phase 12's "what was learned" for why).

## Kubernetes locally (Phase 13)

`kubernetes/README.md` has the exact commands. Short version: this
project uses **k3s installed directly inside WSL2**, not Kind or
Minikube - both need Docker Desktop running as a second VM, which was
enough to destabilize a memory-constrained machine (see
`docs/devops-roadmap.md`, Phase 13, for the full story). If your
machine has more headroom, `kind-config.yaml` is kept as a documented
alternative.

One real gotcha worth knowing before you hit it: k3s's install script
prompts for `sudo`, which hangs forever with no TTY to answer it in a
non-interactive shell. Run it as root directly instead:
`wsl -u root -d Ubuntu -- bash -c "curl -sfL https://get.k3s.io | sh -"`.

**If your WSL2 VM seems to keep crash-looping pods for no clear
reason** (restart counts climbing on pods you haven't touched,
including CoreDNS/Traefik), check `wsl --status` / a plain `wsl -u root
-d Ubuntu -- bash -c "uptime"` before assuming it's a memory problem
with your workload - WSL2's default `vmIdleTimeout` (60s with no
connected client) will shut the whole VM down between spaced-out
commands and cold-boot it again on the next one, and commands landing
right after a cold boot look exactly like an unstable cluster. Add to
(or create) `%UserProfile%\.wslconfig`:

```ini
[wsl2]
vmIdleTimeout=-1
```

then `wsl --shutdown` once to apply it.

## Monitoring locally (Phase 15)

`kubernetes/monitoring/` - Prometheus + Grafana, deployed into the same
k3s cluster Phase 13 set up. See `docs/devops-roadmap.md` (Phase 15)
for what's monitored and what was deliberately left out (Loki, DB
connections).

```bash
wsl -u root -d Ubuntu
cd /mnt/c/path/to/DevFlow/kubernetes/monitoring
k3s kubectl apply -f namespace.yaml -f prometheus-rbac.yaml

# Real values, not the example files - same pattern as
# kubernetes/secret.example.yaml. Use the same METRICS_TOKEN value for
# both - Prometheus presents it back to the app's /api/metrics.
k3s kubectl create secret generic prometheus-secrets -n monitoring \
  --from-literal=metrics-token=<your METRICS_TOKEN>
k3s kubectl create secret generic grafana-secrets -n monitoring \
  --from-literal=admin-password=$(openssl rand -hex 16)

k3s kubectl apply -f prometheus-configmap.yaml -f prometheus-deployment.yaml -f prometheus-service.yaml
k3s kubectl apply -f grafana-configmap.yaml -f grafana-deployment.yaml -f grafana-service.yaml
```

The app's own image needs `METRICS_TOKEN` added to `devflow-secrets`
(see `kubernetes/secret.example.yaml`) and rebuilding/redeploying if
you're running an image from before this phase.

**Access** (same reasoning as accessing the app itself in Phase 13 -
`kubectl port-forward`, not the LoadBalancer):

```bash
k3s kubectl port-forward -n monitoring svc/grafana 3001:3000
# http://localhost:3001 - admin / the password you generated above
k3s kubectl port-forward -n monitoring svc/prometheus 9090:9090
# http://localhost:9090 - raw PromQL, Status > Targets to check scrape health
```

If a pod goes silently missing on startup with no useful `kubectl
logs` output, `crictl logs`/`crictl stats` (run as root inside WSL2,
talking to containerd directly instead of through the kubelet's proxy)
was the tool that actually explained it during this phase - see Phase
15's "what was learned" for a real example.

## Running with Docker

Builds and runs the app in a container against your existing cloud
Supabase project (the same `.env.local` `npm run dev` uses) - see
[`docs/devops-roadmap.md`](./devops-roadmap.md) (Phase 6) for why there's
no local Postgres/Redis container.

```bash
npm run docker:build   # docker compose build
npm run docker:up      # docker compose up - http://localhost:3000
npm run docker:down    # stop and remove the container
```

Or with `docker` directly, without compose:

```bash
docker build -t devflow .
docker run -p 3000:3000 --env-file .env.local devflow
```

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
