# Continuous Deployment (CD)

This document covers the CD pipeline for the Shiv Lal Manpower Portal.

---

## Overview

The CD pipeline runs automatically on every **push to `main`**. It can also be triggered manually via the GitHub Actions UI with an optional `environment` selector.

**File:** [`.github/workflows/cd.yml`](.github/workflows/cd.yml)

---

## Deployment Architecture

```
GitHub push to main
        │
        ├── build-backend  ──► ghcr.io/<owner>/shivlal-backend:latest
        ├── build-web      ──► ghcr.io/<owner>/shivlal-web:latest
        │
        └── deploy (SSH into production server)
                ├── docker compose pull
                ├── docker compose up -d
                ├── python manage.py migrate   ← creates notifications_notification table on first deploy
                ├── python manage.py collectstatic
                └── docker image prune
```

Images are published to the **GitHub Container Registry (GHCR)** using the built-in `GITHUB_TOKEN` — no extra registry credentials needed.

---

## Jobs

### `build-backend`

Builds the Django backend image from [`./backend/Dockerfile`](backend/Dockerfile) and pushes it to GHCR with three tags:

| Tag | Example |
|---|---|
| `latest` | `ghcr.io/owner/shivlal-backend:latest` |
| Branch name | `ghcr.io/owner/shivlal-backend:main` |
| Short SHA | `ghcr.io/owner/shivlal-backend:sha-a1b2c3d` |

The image installs `requirements/base.txt`, which now includes `django-celery-beat>=2.6`.

### `build-web`

Builds the React web app using the multi-stage [`./web/Dockerfile`](web/Dockerfile) (Node 20 → Nginx). The `VITE_API_URL` build arg is injected from the secret `VITE_API_URL`. The built bundle now includes the **Leave Management** page and updated **Payslip** page.

Pushes identical tag set to `ghcr.io/owner/shivlal-web`.

### `deploy`

Runs after both build jobs succeed. SSHs into the production server and:

1. Pulls the new images from GHCR
2. Recreates containers with `--remove-orphans`
3. Runs Django migrations — on the **first deploy after the latest pull**, this creates the `notifications_notification` table (`apps.notifications` `0001_initial`)
4. Runs `collectstatic`
5. Prunes old dangling images to reclaim disk space

---

## Production Stack (docker-compose.prod.yml)

| Service | Image | Notes |
|---|---|---|
| `db` | `postgres:16-alpine` | Persisted volume |
| `redis` | `redis:7-alpine` | AOF persistence enabled |
| `api` | `ghcr.io/<owner>/shivlal-backend:latest` | Gunicorn, 3 workers |
| `celery` | `ghcr.io/<owner>/shivlal-backend:latest` | 4 concurrent workers |
| `celery-beat` | `ghcr.io/<owner>/shivlal-backend:latest` | Default Celery scheduler |
| `web` | `ghcr.io/<owner>/shivlal-web:latest` | Nginx on port 80 |

> **Celery Beat note:** Uses the default Celery beat scheduler (not DatabaseScheduler) to match the project's `INSTALLED_APPS` — `django_celery_beat` app is not registered.

---

## One-Time Server Setup

### 1. Provision the server

Any Linux VPS (Ubuntu 22.04 recommended). Minimum: 2 vCPU, 2 GB RAM.

Install Docker + Compose plugin:

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# log out and back in
docker compose version   # should print v2.x
```

### 2. Create the deploy directory

```bash
sudo mkdir -p /opt/shivlal-manpower
sudo chown $USER:$USER /opt/shivlal-manpower
cd /opt/shivlal-manpower
```

### 3. Copy production files to the server

```bash
# From your local machine:
scp docker-compose.prod.yml user@your-server:/opt/shivlal-manpower/
scp .env.prod.example user@your-server:/opt/shivlal-manpower/.env.prod
```

Then on the server, edit `.env.prod` and fill in all values:

```bash
nano /opt/shivlal-manpower/.env.prod
```

See [`.env.prod.example`](.env.prod.example) for required variables.

### 4. Set the IMAGE_OWNER variable

```bash
echo 'export IMAGE_OWNER=<your-github-username>' >> ~/.bashrc
source ~/.bashrc
```

---

## GitHub Secrets to Configure

Go to **GitHub → Settings → Secrets and variables → Actions → New repository secret** and add:

| Secret name | Description |
|---|---|
| `DEPLOY_HOST` | IP address or hostname of your production server |
| `DEPLOY_USER` | SSH username (e.g. `ubuntu`, `deploy`) |
| `DEPLOY_SSH_KEY` | Private SSH key content (full `-----BEGIN...-----END` block) |
| `DEPLOY_PORT` | SSH port (optional, defaults to `22`) |
| `VITE_API_URL` | Full API URL baked into the web build (e.g. `https://api.yourdomain.com/api`) |

`GITHUB_TOKEN` is provided automatically by GitHub.

### Generating an SSH key pair for deployment

```bash
# On your local machine
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/shivlal_deploy

# Add the public key to the server
ssh-copy-id -i ~/.ssh/shivlal_deploy.pub user@your-server

# Copy the private key content into the DEPLOY_SSH_KEY secret
cat ~/.ssh/shivlal_deploy
```

---

## Manual Deployment Trigger

You can deploy without pushing code via the GitHub Actions UI:

1. Go to **Actions → CD → Run workflow**
2. Choose branch: `main`
3. Select environment: `production` or `staging`
4. Click **Run workflow**

---

## Rolling Back

To roll back to a previous release, find the short SHA from GHCR image tags and re-deploy it on the server:

```bash
ssh user@your-server
cd /opt/shivlal-manpower

IMAGE_OWNER=<owner> docker compose -f docker-compose.prod.yml pull \
  ghcr.io/<owner>/shivlal-backend:sha-<prev-sha> \
  ghcr.io/<owner>/shivlal-web:sha-<prev-sha>

# Update .env.prod or override image tags, then:
IMAGE_OWNER=<owner> docker compose -f docker-compose.prod.yml up -d
```

---

## First Deploy After Latest Pull

The collaborator's changes added the `apps.notifications` app. On the **first production deploy**, the `migrate` step will create:

```
notifications_notification  (title, body, notif_type, is_read, ref_id, created_at, user_id)
```

This migration is backwards-compatible — no existing tables are altered. No manual intervention required; the CD pipeline handles it.

---

## Mobile Deployment (EAS Build)

The mobile app (React Native 0.81.5 / Expo 54) goes through the app stores via EAS Build:

```bash
cd mobile
npm install -g eas-cli
eas login
eas build --platform android   # or ios
eas submit --platform android  # submit to Play Store
```

The app now includes: **Notifications**, **Leave**, **Profile**, **Check-In with GPS + camera**, and **Home** screens. Configure `mobile/eas.json` for build profiles before submitting.

---

## Monitoring After Deployment

Check that all containers are running:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=50 api
docker compose -f docker-compose.prod.yml logs --tail=50 celery
```

Verify the API is live:

```bash
curl -s https://yourdomain.com/api/health/ | python3 -m json.tool
```

Check notifications endpoint (requires auth token):

```bash
curl -H "Authorization: Bearer <token>" https://yourdomain.com/api/notifications/
```

---

## CD Status Badge

```markdown
![CD](https://github.com/<owner>/<repo>/actions/workflows/cd.yml/badge.svg)
```
