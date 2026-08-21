# Shared data sources - nothing resource-creating lives in this file.

data "aws_caller_identity" "current" {}

# Amazon Linux 2023's own SSM parameter for its latest AMI ID, rather than
# a hardcoded ID that goes stale (and silently drifts from what Phase 11
# was actually verified against).
data "aws_ssm_parameter" "al2023_ami" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64"
}

data "aws_availability_zones" "available" {
  state = "available"
}
