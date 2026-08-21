#!/bin/bash
set -e
REGION="${region}"
dnf install -y docker
systemctl enable --now docker

get_param() {
  aws ssm get-parameter --name "/devflow/$1" --with-decryption --region "$REGION" --query Parameter.Value --output text
}

docker run -d --name devflow --restart unless-stopped -p 80:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL="$(get_param NEXT_PUBLIC_SUPABASE_URL)" \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY="$(get_param NEXT_PUBLIC_SUPABASE_ANON_KEY)" \
  -e SUPABASE_SERVICE_ROLE_KEY="$(get_param SUPABASE_SERVICE_ROLE_KEY)" \
  -e NEXT_PUBLIC_SITE_URL="http://${site_url}" \
  -e GITHUB_OAUTH_CLIENT_ID="$(get_param GITHUB_OAUTH_CLIENT_ID)" \
  -e GITHUB_OAUTH_CLIENT_SECRET="$(get_param GITHUB_OAUTH_CLIENT_SECRET)" \
  --log-driver=awslogs --log-opt awslogs-region="$REGION" --log-opt awslogs-group=/devflow/app --log-opt awslogs-create-group=true \
  ${container_image}
