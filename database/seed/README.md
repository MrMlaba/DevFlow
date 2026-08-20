# Database seed

`seed.ts` populates a fresh Supabase project with demo data: one user per
DevFlow role, an organization, two projects, and a set of tasks/issues/
comments/activity events. It's idempotent - safe to run more than once.

## Run it

1. Apply every migration in `database/migrations/` first (see
   [`../../docs/database.md`](../../docs/database.md)).
2. Copy `.env.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` (Project Settings -> API -> service_role -
     **never** expose this in client code or commit it)
   - `SEED_USER_PASSWORD` - any password, used only for the local demo
     accounts below. Local development only; never reuse it anywhere real.
3. Run:

   ```bash
   npm run db:seed
   ```

## What it creates

| Email                  | Org role        | Role on both demo projects |
| ----------------------- | ---------------- | --------------------------- |
| admin@devflow.dev       | administrator    | administrator                |
| owner@devflow.dev       | developer        | project_owner                |
| dev@devflow.dev         | developer        | developer                    |
| reviewer@devflow.dev    | developer        | reviewer                     |
| lecturer@devflow.dev    | developer        | lecturer                     |

Sign in with any of these emails and `SEED_USER_PASSWORD` at `/login` to
explore DevFlow with a populated organization instead of an empty account.
