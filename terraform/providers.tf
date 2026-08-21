terraform {
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Bootstrapped once via the AWS CLI, before this backend could exist -
  # see docs/development.md (Phase 12). use_lockfile uses S3's own
  # conditional writes for state locking (Terraform 1.10+), so no
  # DynamoDB table is needed just to hold a lock.
  backend "s3" {
    bucket       = "devflow-terraform-state-915639745052"
    key          = "devflow/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project   = "devflow"
      ManagedBy = "terraform"
    }
  }
}
