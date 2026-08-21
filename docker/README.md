# Docker

The `Dockerfile`, `docker-compose.yml`, and `.dockerignore` live at the
repo root (Docker convention - the build context is the project root, and
tools expect them there). This folder is kept as the place Phase 6's
container-related notes are indexed from.

No local Postgres or Redis container: DevFlow's Postgres *is* Supabase
(Auth + RLS + Storage come from the same hosted project a bare `postgres`
image wouldn't have), and nothing in the app uses Redis yet. See
[`docs/devops-roadmap.md`](../docs/devops-roadmap.md) (Phase 6) for the
full reasoning and how to build/run the image.
