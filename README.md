# Shiv Lal Manpower Portal

A full-stack HR & Manpower management platform.

**Stack:** Django 5 + Celery (backend) · React/Vite + Nginx (web) · PostgreSQL · Redis  
**Infra:** AWS EC2 · Docker Compose · GitHub Actions CI/CD · GHCR (container images)

---

## Table of Contents

1. [Architecture](#architecture)
2. [Local Development](#local-development)
3. [AWS Deployment — Step-by-Step](#aws-deployment--step-by-step)
   - [Step 1 — Provision EC2 Instance](#step-1--provision-ec2-instance)
   - [Step 2 — Set GitHub Secrets](#step-2--set-github-secrets)
   - [Step 3 — First-time Server Setup](#step-3--first-time-server-setup)
   - [Step 4 — Configure .env.prod on Server](#step-4--configure-envprod-on-server)
   - [Step 5 — Trigger First Deployment](#step-5--trigger-first-deployment)
4. [CI/CD Pipeline](#cicd-pipeline)
5. [Environment Variables Reference](#environment-variables-reference)
6. [Useful Commands](#useful-commands)
7. [Security Checklist](#security-checklist)

---

## Architecture

```
GitHub main branch
       │
       ├─► CI (every push / PR)
       │     ├─ Backend: uv + pytest + Django check
       │     ├─ Web: npm ci + vite build
       │     └─ Docker: backend image build smoke-test
       │
       └─► CD (push to main only)
             ├─ Build & push ghcr.io/.../shivlal-backend:latest
             ├─ Build & push ghcr.io/.../shivlal-web:latest
             └─ SSH → EC2
                  └─ docker compose pull + up -d + migrate
```

```
EC2 Instance (t3.small / t3.medium)
┌─────────────────────────────────────────────────────┐
│  Docker network: shivlal-net                        │
│                                                     │
│  [web:80]  → Nginx serving React SPA                │
│  [api:8000] → Gunicorn (Django)                     │
│  [celery]  → Celery worker                          │
│  [celery-beat] → Celery scheduler                   │
│  [db:5432] → PostgreSQL 16                          │
│  [redis:6379] → Redis 7                             │
└─────────────────────────────────────────────────────┘
```

---

## Local Development

```bash
# Clone
git clone https://github.com/abhiroy00/shiv-lal-manpower.git
cd shiv-lal-manpower

# Backend
cd backend
uv sync --group dev
uv run python manage.py migrate
uv run python manage.py runserver

# Web (separate terminal)
cd web
npm install
npm run dev
```

Full stack with Docker:

```bash
docker compose up --build
```

---

## AWS Deployment — Step-by-Step

### Step 1 — Provision EC2 Instance

1. Open the [AWS EC2 Console](https://ap-south-1.console.aws.amazon.com/ec2/home?region=ap-south-1#Instances:) (Account: **962765734765 / shivlal mandal**)

2. Click **Launch instance** and configure:

   | Setting | Value |
   |---|---|
   | Name | `shivlal-manpower-prod` |
   | AMI | Ubuntu Server 22.04 LTS (64-bit x86) |
   | Instance type | `t3.small` (min) or `t3.medium` (recommended) |
   | Key pair | Create new: `shivlal-prod-key` → download `.pem` |
   | Storage | 20 GB gp3 |

3. Under **Network settings → Create security group**, add these inbound rules:

   | Type | Protocol | Port | Source |
   |---|---|---|---|
   | SSH | TCP | 22 | Your IP (or 0.0.0.0/0 temporarily) |
   | HTTP | TCP | 80 | 0.0.0.0/0, ::/0 |
   | HTTPS | TCP | 443 | 0.0.0.0/0, ::/0 |

4. Click **Launch instance**.

5. **Allocate an Elastic IP** (so the IP doesn't change on restart):
   - EC2 → Elastic IPs → Allocate Elastic IP address
   - Associate it with your new instance
   - Note down this IP — you'll use it everywhere

---

### Step 2 — Set GitHub Secrets

Go to your GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**.

Add each secret:

| Secret name | Value |
|---|---|
| `DEPLOY_HOST` | Your EC2 Elastic IP (e.g. `13.235.100.50`) |
| `DEPLOY_USER` | `ec2-user` |
| `DEPLOY_SSH_KEY` | Content of your `.pem` file (the entire text including `-----BEGIN RSA PRIVATE KEY-----`) |
| `DEPLOY_PORT` | `22` |
| `VITE_API_URL` | `http://<YOUR_ELASTIC_IP>/api` |

> `GITHUB_TOKEN` is injected automatically — you don't need to set it.

---

### Step 3 — First-time Server Setup

SSH into your EC2 instance:

```bash
chmod 400 shivlal-prod-key.pem
ssh -i shivlal-prod-key.pem ec2-user@<YOUR_ELASTIC_IP>
```

On the server, download and run the setup script:

```bash
curl -fsSL https://raw.githubusercontent.com/abhiroy00/shiv-lal-manpower/main/scripts/setup-ec2.sh \
  -o setup-ec2.sh
chmod +x setup-ec2.sh
./setup-ec2.sh
```

This installs Docker, creates `/opt/shivlal-manpower/`, and configures the firewall. Takes ~3 minutes.

After it finishes, apply the Docker group:

```bash
newgrp docker
docker --version   # should print Docker version
```

---

### Step 4 — Configure .env.prod on Server

Still on the EC2 instance:

```bash
cd /opt/shivlal-manpower
nano .env.prod
```

Paste the contents of `.env.prod.example` (from the repo root) and fill in real values:

```dotenv
DJANGO_SETTINGS_MODULE=config.settings.prod
SECRET_KEY=<generate: python3 -c "import secrets; print(secrets.token_urlsafe(50))">
DEBUG=False
ALLOWED_HOSTS=<YOUR_ELASTIC_IP>

POSTGRES_USER=shivlal
POSTGRES_PASSWORD=<strong-password>
POSTGRES_DB=shivlal_db

DB_NAME=shivlal_db
DB_USER=shivlal
DB_PASSWORD=<same-strong-password>
DB_HOST=db
DB_PORT=5432

REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/1
CELERY_RESULT_BACKEND=redis://redis:6379/2

CORS_ALLOWED_ORIGINS=http://<YOUR_ELASTIC_IP>
```

Save (`Ctrl+X → Y → Enter`). Restrict permissions:

```bash
chmod 600 /opt/shivlal-manpower/.env.prod
```

---

### Step 5 — Trigger First Deployment

The CD pipeline runs automatically on every push to `main`. To trigger it now:

```bash
# On your local machine
git commit --allow-empty -m "chore: trigger first deployment"
git push origin main
```

Watch progress at: **GitHub repo → Actions → CD — Build & Deploy to AWS EC2**

When it finishes (usually 4–6 minutes), your app is live:

- **Web frontend:** `http://<YOUR_ELASTIC_IP>/`
- **API:** `http://<YOUR_ELASTIC_IP>:8000/api/`

---

## CI/CD Pipeline

### CI (`.github/workflows/ci.yml`)

Runs on every push and pull request to `main` or `develop`.

| Job | What it does |
|---|---|
| `backend` | Spins up Postgres + Redis, runs `uv run pytest`, Django system check |
| `web` | `npm ci` + `npm run build` — ensures Vite bundle succeeds |
| `docker-build` | Builds the backend Docker image locally (no push) to catch Dockerfile errors |

### CD (`.github/workflows/cd.yml`)

Runs only on push to `main` (or manually via workflow_dispatch).

| Job | What it does |
|---|---|
| `build-backend` | Builds and pushes `ghcr.io/<owner>/shivlal-backend:latest` to GHCR |
| `build-web` | Builds and pushes `ghcr.io/<owner>/shivlal-web:latest` to GHCR |
| `deploy` | SCPs `docker-compose.prod.yml` to EC2 → SSHs in → `docker compose pull + up -d + migrate` → health check |

**Rollback:** The previous image tag (e.g. `sha-xxxxxxx`) is still in GHCR. To roll back manually:

```bash
# On EC2
cd /opt/shivlal-manpower
IMAGE_OWNER=abhiroy00 \
  docker compose -f docker-compose.prod.yml \
  up -d --no-build \
  # edit docker-compose.prod.yml to pin a specific sha tag first
```

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `SECRET_KEY` | Yes | Django secret key — keep private, ≥50 chars |
| `DEBUG` | Yes | Must be `False` in production |
| `ALLOWED_HOSTS` | Yes | Comma-separated: EC2 IP + domain |
| `POSTGRES_USER` | Yes | PostgreSQL username (for db container) |
| `POSTGRES_PASSWORD` | Yes | PostgreSQL password |
| `POSTGRES_DB` | Yes | Database name |
| `DB_HOST` | Yes | `db` (Docker service name) |
| `DB_PORT` | Yes | `5432` |
| `CELERY_BROKER_URL` | Yes | `redis://redis:6379/1` |
| `CELERY_RESULT_BACKEND` | Yes | `redis://redis:6379/2` |
| `CORS_ALLOWED_ORIGINS` | Yes | Frontend origin(s), comma-separated |
| `VITE_API_URL` | CD secret | Baked into the web Docker image at build time |

---

## Useful Commands

All run on the EC2 server from `/opt/shivlal-manpower`:

```bash
# View all running containers
docker compose -f docker-compose.prod.yml ps

# Follow logs (all services)
docker compose -f docker-compose.prod.yml logs -f

# Follow logs (API only)
docker compose -f docker-compose.prod.yml logs -f api

# Run a Django management command
docker compose -f docker-compose.prod.yml exec api uv run python manage.py shell

# Create a Django superuser
docker compose -f docker-compose.prod.yml exec api \
  uv run python manage.py createsuperuser

# Restart a single service (e.g., after config change)
docker compose -f docker-compose.prod.yml restart api

# Full stop
docker compose -f docker-compose.prod.yml down

# Full stop + wipe volumes (DESTRUCTIVE — deletes database)
docker compose -f docker-compose.prod.yml down -v
```

---

## Security Checklist

- [ ] `.env.prod` is **not** committed to git (it's in `.gitignore`)
- [ ] `SECRET_KEY` is a unique random string (never the dev default)
- [ ] `DEBUG=False` in production
- [ ] `ALLOWED_HOSTS` contains only your actual hosts
- [ ] EC2 SSH access is restricted to your IP in the Security Group
- [ ] Database password is strong and different from any other service
- [ ] EC2 Elastic IP is associated (stable address)
- [ ] Backups: enable automated RDS snapshots **or** set up a cron to `pg_dump` the Postgres volume

---

> **Never commit real credentials, `.env.prod`, or the `.pem` key file to this repository.**
