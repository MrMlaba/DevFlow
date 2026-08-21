variable "aws_region" {
  description = "AWS region for all resources."
  type        = string
  default     = "us-east-1"
}

variable "instance_type" {
  description = "EC2 instance type - t3.micro is free-tier eligible."
  type        = string
  default     = "t3.micro"
}

variable "container_image" {
  description = "Image the instance pulls and runs - published by .github/workflows/docker.yml (Phase 9)."
  type        = string
  default     = "ghcr.io/mrmlaba/devflow:latest"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC."
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidr" {
  description = "CIDR block for the single public subnet."
  type        = string
  default     = "10.0.1.0/24"
}
