output "app_url" {
  description = "Public URL of the DevFlow deployment."
  value       = "http://${aws_eip.app.public_ip}"
}

output "instance_id" {
  description = "EC2 instance ID - use with `aws ssm start-session` for shell access."
  value       = aws_instance.app.id
}

output "vpc_id" {
  value = aws_vpc.main.id
}
