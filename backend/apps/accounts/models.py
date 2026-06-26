from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from apps.common.models import TimeStampedModel
from .managers import UserManager


class User(AbstractBaseUser, PermissionsMixin, TimeStampedModel):
    class Role(models.TextChoices):
        ADMIN = "admin", "Admin"
        HR = "hr", "HR"
        SUPERVISOR = "supervisor", "Supervisor"
        EMPLOYEE = "employee", "Employee"

    phone = models.CharField(max_length=15, unique=True)
    email = models.EmailField(blank=True)
    full_name = models.CharField(max_length=120)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.EMPLOYEE)
    employee = models.OneToOneField(
        "employees.Employee",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="user_account",
    )
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    password_changed_at = models.DateTimeField(null=True, blank=True)

    USERNAME_FIELD = "phone"
    REQUIRED_FIELDS = ["full_name"]

    objects = UserManager()

    def __str__(self):
        return f"{self.full_name} ({self.role})"
