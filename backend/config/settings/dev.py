from .base import *

DEBUG = True

ALLOWED_HOSTS = ["*"]  # dev only — allow all hosts including mobile IP

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

CORS_ALLOW_ALL_ORIGINS = True

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# Attendance: check-in at or before this time → Present; after → Late
# Format: (hour, minute) in 24h
LATE_THRESHOLD = (9, 30)
