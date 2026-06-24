# Backend – Shiv Lal Manpower Portal

Django 5 REST API powering the manpower management portal.

---

## What is uv?

[uv](https://docs.astral.sh/uv/) is a Python package and project manager written in Rust by Astral (the team behind Ruff). It replaces `pip`, `pip-tools`, `virtualenv`, and `pyenv` with a single fast tool.

Key benefits over plain `pip`:

| | pip | uv |
|---|---|---|
| Install speed | baseline | 10–100× faster (parallel, cached) |
| Lockfile | none (pip-tools needed) | built-in `uv.lock` |
| Virtual env | manual | automatic |
| Python version mgmt | no | yes (`uv python install`) |
| Reproducible builds | fragile | `--frozen` guarantees exact versions |

---

## Project dependency layout

Dependencies live in `pyproject.toml` instead of the old `requirements/*.txt` files:

```
[project].dependencies          ← production deps (was requirements/base.txt)
[dependency-groups] dev         ← dev/test deps  (was requirements/dev.txt)
[dependency-groups] prod        ← prod-only deps  (was requirements/prod.txt)
```

`uv.lock` is the auto-generated lockfile. **Commit it** — it pins every transitive dependency so every developer and the Docker build get identical environments.

---

## Local development

### 1. Install uv (one-time)

```bash
# macOS / Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Windows (PowerShell)
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

### 2. Set up the project

```bash
cd backend

# Install base + dev dependencies into an auto-managed .venv
uv sync --group dev
```

uv creates `.venv/` automatically — no need to run `python -m venv` first.

### 3. Run Django commands

Prefix any command with `uv run` and it uses the project venv automatically:

```bash
uv run python manage.py runserver
uv run python manage.py migrate
uv run python manage.py createsuperuser
uv run python manage.py shell
```

### 4. Run tests

```bash
uv run pytest
```

### 5. Add a new package

```bash
uv add <package>            # adds to [project].dependencies + updates uv.lock
uv add --group dev <package>  # adds to dev group
```

### 6. Remove a package

```bash
uv remove <package>
```

### 7. Sync after pulling changes

If a teammate added or removed packages, just run:

```bash
uv sync --group dev
```

---

## Docker

The `Dockerfile` installs uv from the official image and uses `uv sync --frozen` to install deps from the lockfile exactly:

```dockerfile
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/
COPY pyproject.toml uv.lock* ./
RUN uv sync --frozen --no-dev --no-install-project
```

- `--frozen` — refuses to update the lockfile; fails if `uv.lock` is out of date (safe for CI/CD)
- `--no-dev` — skips dev/test dependencies in the production image
- `--no-install-project` — skips installing the project itself (not a library, so not needed)

To rebuild after changing dependencies:

```bash
docker compose build api
```

---

## Environment variables

Copy `.env.example` to `.env` before first run:

```bash
cp .env.example .env
```

Key variables:

| Variable | Default | Description |
|---|---|---|
| `SECRET_KEY` | dev key | Django secret key |
| `DATABASE_URL` | postgres://... | PostgreSQL connection string |
| `CELERY_BROKER_URL` | redis://... | Redis for Celery broker |
| `CELERY_RESULT_BACKEND` | redis://... | Redis for Celery results |
| `DJANGO_SETTINGS_MODULE` | `config.settings.dev` | Settings module to use |

---

## Running with Docker Compose

```bash
# From the repo root
docker compose up --build
```

Services started:

| Service | URL |
|---|---|
| Django API | http://localhost:8000 |
| React web | http://localhost:5173 |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |
