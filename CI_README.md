# Continuous Integration (CI)

This document covers the CI pipeline for the Shiv Lal Manpower Portal.

---

## Overview

The CI pipeline runs automatically on every **push** to `main`/`develop` and on every **pull request** targeting those branches. It validates that all three parts of the stack — backend, web, and mobile — are healthy before any code can merge.

**File:** [`.github/workflows/ci.yml`](.github/workflows/ci.yml)

---

## Jobs

```
push / pull_request
        │
        ├── backend        (Python 3.12 + PostgreSQL 16 + Redis 7)
        │       ├── pip install requirements/dev.txt
        │       ├── python manage.py check
        │       ├── python manage.py migrate          ← includes notifications 0001_initial
        │       └── pytest
        │
        ├── web            (Node 20)
        │       ├── npm ci
        │       ├── npm run build  (Vite — leave page + payslip page included)
        │       └── upload dist/ artifact (7-day retention)
        │
        ├── mobile         (Node 20)
        │       ├── npm ci         (React Native 0.81.5, expo/AppEntry.js entry)
        │       └── npx expo config --type public
        │
        └── docker-build   (runs after backend passes)
                └── docker build ./backend  (no push)
```

---

## Job Details

### `backend` — Test

| Item | Value |
|---|---|
| Runner | `ubuntu-latest` |
| Python | 3.12 |
| Services | PostgreSQL 16-alpine, Redis 7-alpine |
| Test framework | `pytest-django` |
| Requirements | `backend/requirements/dev.txt` |

The job spins up real PostgreSQL and Redis containers (health-checked before the job starts), installs all dev dependencies, runs `manage.py check`, applies all migrations, then runs the full pytest suite.

Migrations applied include:
- All existing app schemas (accounts, employees, attendance, payroll, etc.)
- `apps.notifications` — `0001_initial` creates the `notifications_notification` table (new in latest pull)

### `web` — Build

| Item | Value |
|---|---|
| Runner | `ubuntu-latest` |
| Node | 20 |
| Build command | `npm run build` (Vite) |

Runs a full production build. The build now includes the new **Leave Management** page (`/leave`) and the updated **Payslip** page (`/payslip`). The resulting `dist/` folder is uploaded as artifact `web-dist-<sha>` for 7 days.

### `mobile` — Dependency Check

| Item | Value |
|---|---|
| Runner | `ubuntu-latest` |
| Node | 20 |
| React Native | 0.81.5 |
| Entry point | `expo/AppEntry.js` (standard Expo entry) |
| Check | `npx expo config --type public` |

Installs React Native 0.81.5 / Expo 54 dependencies and validates `app.json`. Babel config uses `hermes-canary` transform profile (`babel-preset-expo ~54.0.10`). New screens included in the app: **Notifications**, enhanced **Profile**, **Leave**, and **Check-In**.

Full Android/iOS builds go through EAS Build — see [CD_README.md](CD_README.md).

### `docker-build` — Image Validation

| Item | Value |
|---|---|
| Runner | `ubuntu-latest` |
| Trigger | Runs only after `backend` job passes |
| Action | `docker/build-push-action` (push: false) |

Builds the backend Docker image end-to-end (including `collectstatic`) to catch any Dockerfile or OS-level dependency issues early. Uses GitHub Actions layer cache for speed. Does **not** push the image.

---

## Running CI Locally

### Backend

```bash
cd backend

# Start services
docker run -d --name ci-pg \
  -e POSTGRES_USER=shivlal -e POSTGRES_PASSWORD=shivlal -e POSTGRES_DB=shivlal_test \
  -p 5432:5432 postgres:16-alpine

docker run -d --name ci-redis -p 6379:6379 redis:7-alpine

# Install dependencies
pip install -r requirements/dev.txt

# Set environment
export DJANGO_SETTINGS_MODULE=config.settings.dev
export SECRET_KEY=local-ci-key
export DATABASE_URL=postgres://shivlal:shivlal@localhost:5432/shivlal_test
export REDIS_URL=redis://localhost:6379/0
export CELERY_BROKER_URL=redis://localhost:6379/1
export CELERY_RESULT_BACKEND=redis://localhost:6379/2
export CORS_ALLOWED_ORIGINS=http://localhost:5173

# Run checks + tests
python manage.py check
python manage.py migrate --noinput
pytest --tb=short -q

# Cleanup
docker rm -f ci-pg ci-redis
```

### Web

```bash
cd web
npm ci
VITE_API_URL=http://localhost:8000/api npm run build
```

### Mobile

```bash
cd mobile
npm ci
npx expo config --type public
```

---

## Python Dependencies (as of latest pull)

`backend/requirements/dev.txt` installs `base.txt` plus dev tools:

```
# base.txt
Django>=5.0,<5.2
djangorestframework>=3.15
djangorestframework-simplejwt>=5.3
django-cors-headers>=4.3
django-filter>=23.5
psycopg2-binary>=2.9
celery>=5.3
redis>=5.0
openpyxl>=3.1
reportlab>=4.0
Pillow>=10.0
gunicorn>=21.0
uvicorn[standard]>=0.27
python-decouple>=3.8
django-celery-beat>=2.6      ← added in latest pull

# dev additions
django-debug-toolbar>=4.3
pytest-django>=4.8
pytest>=8.0
factory-boy>=3.3
```

---

## Django Apps Under Test

All 10 installed apps are exercised through migration and system check:

| App | Notes |
|---|---|
| `apps.accounts` | Custom User model, JWT auth |
| `apps.employees` | Employee records |
| `apps.deployment` | Staff assignments |
| `apps.attendance` | Attendance + leave requests |
| `apps.payroll` | Payslip generation |
| `apps.compliance` | Regulatory compliance |
| `apps.recruitment` | Hiring workflow |
| `apps.reports` | Analytics |
| `apps.dashboard` | Dashboard endpoints |
| `apps.notifications` | In-app notifications via signals (new) |

---

## Adding Tests

Tests follow standard pytest-django conventions:

```python
# backend/tests/test_notifications.py
import pytest
from apps.notifications.models import Notification

@pytest.mark.django_db
def test_notification_created_for_leave(leave_request_factory, hr_user):
    leave = leave_request_factory(status="pending")
    assert Notification.objects.filter(user=hr_user, notif_type="leave").exists()
```

Run a single file:

```bash
pytest backend/tests/test_notifications.py -v
```

---

## CI Status Badge

```markdown
![CI](https://github.com/<owner>/<repo>/actions/workflows/ci.yml/badge.svg)
```
