# GitHub Actions workflows

`ci.yml` (Phase 7): lint, type-check, unit tests, and build run on every
push and pull request to `main`; E2E tests run on push to `main` only
(needs repository secrets - see the comment at the top of the `e2e` job).

`security.yml` (Phase 8): Gitleaks, Semgrep, and Trivy run on every push/PR
to `main` and weekly. Reports findings (uploaded as SARIF to GitHub code
scanning) rather than failing the build - see the comment at the top of
the file. `../dependabot.yml` handles version-update PRs separately.

`docker.yml` (Phase 9) lands in its own phase. See
[`docs/devops-roadmap.md`](../../docs/devops-roadmap.md).
