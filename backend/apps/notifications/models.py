from django.db import models
from apps.accounts.models import User


class Notification(models.Model):
    class Type(models.TextChoices):
        LEAVE      = "leave",      "Leave"
        PAYSLIP    = "payslip",    "Payslip"
        ATTENDANCE = "attendance", "Attendance"
        GENERAL    = "general",    "General"

    user       = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications")
    title      = models.CharField(max_length=150)
    body       = models.TextField()
    notif_type = models.CharField(max_length=20, choices=Type.choices, default=Type.GENERAL)
    is_read    = models.BooleanField(default=False)
    ref_id     = models.PositiveIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.notif_type}] {self.title} → {self.user_id}"
