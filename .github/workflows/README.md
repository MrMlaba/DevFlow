# GitHub Actions workflows

`ci.yml` (Phase 7): lint, type-check, unit tests, and build run on every
push and pull request to `main`; E2E tests run on push to `main` only
(needs repository secrets - see the comment at the top of the `e2e` job).

`security.yml` (Phase 8): Gitleaks, Semgrep, and Trivy run on every push/PR
to `main` and weekly. Reports findings (uploaded as SARIF to GitHub code
scanning) rather than failing the build - see the comment at the top of
the file. `../dependabot.yml` handles version-update PRs separately.

`docker.yml` (Phase 9): builds and pushes to GitHub Container Registry
on push to `main` and on version tags (`v*.*.*`) - no secrets needed,
GHCR auth is the workflow's own `GITHUB_TOKEN`. Never runs on PRs; those
already get the Dockerfile validated (built, not pushed) by
`security.yml`'s `trivy` job. See
[`docs/devops-roadmap.md`](../../docs/devops-roadmap.md).
