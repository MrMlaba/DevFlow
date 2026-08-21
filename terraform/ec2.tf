# Allocated standalone (not tied to the instance at creation) so its
# address is already known when rendering the instance's user-data below
# - avoids a circular dependency between "the instance needs to know its
# own public IP" and "the EIP needs an instance to attach to."
resource "aws_eip" "app" {
  domain = "vpc"

  tags = { Name = "devflow-eip" }
}

# Same container Phase 9's docker.yml already publishes to GHCR, run on
# real infrastructure instead of a laptop - not a separate deployment
# story. No load balancer: a single instance with an Elastic IP costs
# nothing extra to exist, unlike an ALB (~$16-22/mo just for existing) -
# revisit if this ever needs to scale past one instance.
resource "aws_instance" "app" {
  ami                    = data.aws_ssm_parameter.al2023_ami.value
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.web.id]
  iam_instance_profile   = aws_iam_instance_profile.ec2.name

  metadata_options {
    http_tokens = "required" # IMDSv2 only
  }

  user_data = templatefile("${path.module}/templates/user-data.sh.tpl", {
    region          = var.aws_region
    container_image = var.container_image
    site_url        = aws_eip.app.public_ip
  })

  tags = { Name = "devflow-app" }
}

resource "aws_eip_association" "app" {
  instance_id   = aws_instance.app.id
  allocation_id = aws_eip.app.id
}
