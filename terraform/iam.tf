# Least-privilege, not administrator: this role can do exactly two
# things beyond what SSM Session Manager needs - read /devflow/* secrets,
# write to the /devflow/* CloudWatch Logs group. Nothing else.

data "aws_iam_policy_document" "ec2_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "ec2" {
  name               = "devflow-ec2-role"
  description        = "DevFlow EC2 instance role: SSM Session Manager + secrets + CloudWatch Logs"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume_role.json
}

resource "aws_iam_role_policy_attachment" "ssm_core" {
  role       = aws_iam_role.ec2.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

data "aws_iam_policy_document" "app_access" {
  statement {
    sid       = "ReadAppSecrets"
    actions   = ["ssm:GetParameter", "ssm:GetParameters", "ssm:GetParametersByPath"]
    resources = ["arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/devflow/*"]
  }

  statement {
    sid       = "WriteAppLogs"
    actions   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents", "logs:DescribeLogStreams"]
    resources = ["arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:/devflow/*"]
  }
}

resource "aws_iam_role_policy" "app_access" {
  name   = "devflow-app-access"
  role   = aws_iam_role.ec2.id
  policy = data.aws_iam_policy_document.app_access.json
}

resource "aws_iam_instance_profile" "ec2" {
  name = "devflow-ec2-profile"
  role = aws_iam_role.ec2.name
}
