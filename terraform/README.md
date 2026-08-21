# Terraform

Codifies the exact infrastructure Phase 11 provisioned manually via the
AWS CLI: `providers.tf` (AWS provider + S3 remote state backend),
`variables.tf`, `main.tf` (shared data sources), `vpc.tf` (VPC, subnet,
IGW, route table, security group), `iam.tf` (the EC2 instance's
least-privilege role), `ec2.tf` (the instance + Elastic IP), `outputs.tf`.

No `ecr.tf` or `rds.tf`, despite those being in the original phase plan -
the app pulls its image from GHCR (Phase 9) and its database is Supabase
(Phase 1); provisioning either would be infrastructure nothing actually
uses. See [`docs/devops-roadmap.md`](../docs/devops-roadmap.md) (Phase
12) and [`docs/development.md`](../docs/development.md) for how to run
this.
