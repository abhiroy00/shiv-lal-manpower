from django.db import models
from django.conf import settings
from apps.common.models import TimeStampedModel


class LeaveRequest(TimeStampedModel):
    class LeaveType(models.TextChoices):
        CASUAL  = "cl",     "Casual Leave"
        SICK    = "sl",     "Sick Leave"
        EARNED  = "el",     "Earned Leave"
        UNPAID  = "unpaid", "Unpaid Leave"

    class Status(models.TextChoices):
        PENDING  = "pending",  "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        CANCELLED = "cancelled", "Cancelled"

    ANNUAL_LIMITS = {
        "cl":     12,
        "sl":     12,
        "el":     15,
        "unpaid": None,
    }

    employee    = models.ForeignKey(
        "employees.Employee",
        on_delete=models.CASCADE,
        related_name="leave_requests",
    )
    leave_type  = models.CharField(max_length=10, choices=LeaveType.choices)
    from_date   = models.DateField()
    to_date     = models.DateField()
    reason      = models.TextField()
    status      = models.CharField(max_length=15, choices=Status.choices, default=Status.PENDING)
    review_note = models.TextField(blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="reviewed_leaves",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.employee.emp_code} – {self.leave_type} ({self.from_date} → {self.to_date})"

    @property
    def days(self):
        if self.from_date and self.to_date:
            return (self.to_date - self.from_date).days + 1
        return 0
