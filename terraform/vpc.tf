# One public subnet, no NAT Gateway - nothing here runs in a private
# subnet needing outbound-only internet access, and a NAT Gateway costs
# money just for existing (~$32/mo) regardless of whether anything uses
# it. See docs/devops-roadmap.md (Phase 11) for the same reasoning
# applied when this was first provisioned manually.

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = { Name = "devflow-vpc" }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = { Name = "devflow-igw" }
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidr
  availability_zone       = data.aws_availability_zones.available.names[0]
  map_public_ip_on_launch = true

  tags = { Name = "devflow-public-subnet" }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = { Name = "devflow-public-rt" }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# Port 80 only - no SSH. Shell access is via SSM Session Manager
# (iam.tf's AmazonSSMManagedInstanceCore policy), so there's no port 22
# to leave open, no key pair to lose or leak.
resource "aws_security_group" "web" {
  name        = "devflow-web-sg"
  description = "DevFlow EC2 - HTTP inbound only, no SSH (SSM Session Manager instead)"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "devflow-web-sg" }
}
