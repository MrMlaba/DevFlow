# GitHub Actions workflows

`ci.yml` (Phase 7): lint, type-check, unit tests, and build run on every
push and pull request to `main`; E2E tests run on push to `main` only
(needs repository secrets - see the comment at the top of the `e2e` job).

`security.yml` (Phase 8) and `docker.yml` (Phase 9) land in their own
phases. See [`docs/devops-roadmap.md`](../../docs/devops-roadmap.md).
