#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  Shiv Lal Manpower — One-time EC2 server setup script (Amazon Linux)
#
#  Run ONCE as ec2-user immediately after launching your EC2 instance:
#    chmod +x setup-ec2.sh && ./setup-ec2.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

APP_DIR="/opt/shivlal-manpower"

echo "==> [1/5] Updating system packages ..."
sudo dnf update -y

echo "==> [2/5] Installing Docker ..."
sudo dnf install -y docker
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker ec2-user
echo "NOTE: Run 'newgrp docker' after this script to activate group."

echo "==> [3/5] Installing Docker Compose plugin ..."
DOCKER_CONFIG=${DOCKER_CONFIG:-$HOME/.docker}
mkdir -p "$DOCKER_CONFIG/cli-plugins"
curl -SL "https://github.com/docker/compose/releases/download/v2.27.0/docker-compose-linux-x86_64" \
  -o "$DOCKER_CONFIG/cli-plugins/docker-compose"
chmod +x "$DOCKER_CONFIG/cli-plugins/docker-compose"

echo "==> [4/5] Creating application directory ..."
sudo mkdir -p "$APP_DIR"
sudo chown ec2-user:ec2-user "$APP_DIR"

echo "==> [5/5] Configuring firewall ..."
# Amazon Linux uses firewalld; ports 80/443 are usually open via Security Group
# so this is optional but good practice
sudo dnf install -y firewalld 2>/dev/null || true
sudo systemctl enable firewalld 2>/dev/null || true
sudo systemctl start firewalld 2>/dev/null || true
sudo firewall-cmd --permanent --add-service=http 2>/dev/null || true
sudo firewall-cmd --permanent --add-service=https 2>/dev/null || true
sudo firewall-cmd --reload 2>/dev/null || true

echo ""
echo "==========================================================="
echo "  EC2 setup complete!"
echo "==========================================================="
echo ""
echo "NEXT STEPS:"
echo ""
echo "  1. Apply Docker group (no need to re-login):"
echo "     newgrp docker"
echo "     docker --version"
echo "     docker compose version"
echo ""
echo "  2. Create the production environment file:"
echo "     nano $APP_DIR/.env.prod"
echo ""
echo "  3. Set GitHub Secret DEPLOY_USER = ec2-user"
echo ""
echo "  4. Push to main branch to trigger first deployment."
echo ""
