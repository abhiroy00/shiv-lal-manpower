from django.db import models
from apps.common.models import TimeStampedModel


class LeaveRequest(TimeStampedModel):
    class LeaveType(models.TextChoices):
        CASUAL  = "cl",     "Casual Leave"
        SICK    = "sl",     "Sick Leave"
        EARNED  = "el",     "Earned Leave"
        UNPAID  = "unpaid", "Unpaid Leave"

    class LeaveStatus(models.TextChoices):
        PENDING  = "pending",  "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    employee    = models.ForeignKey("employees.Employee", on_delete=models.CASCADE, related_name="leaves")
    leave_type  = models.CharField(max_length=10, choices=LeaveType.choices)
    from_date   = models.DateField()
    to_date     = models.DateField()
    reason      = models.TextField()
    status      = models.CharField(max_length=10, choices=LeaveStatus.choices, default=LeaveStatus.PENDING)
    reviewed_by = models.ForeignKey("accounts.User", null=True, blank=True, on_delete=models.SET_NULL)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_note = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.employee.emp_code} – {self.leave_type} ({self.from_date} → {self.to_date})"

    @property
    def days(self):
        return (self.to_date - self.from_date).days + 1


class Attendance(TimeStampedModel):
    class CheckStatus(models.TextChoices):
        PRESENT = "present", "Present"
        ABSENT = "absent", "Absent"
        LATE = "late", "Late"
        REVIEW = "review", "Under Review"

    employee = models.ForeignKey(
        "employees.Employee", on_delete=models.CASCADE, related_name="attendances"
    )
    date = models.DateField()
    check_in_time = models.TimeField(null=True, blank=True)
    check_out_time = models.TimeField(null=True, blank=True)
    selfie = models.ImageField(upload_to="attendance/selfies/%Y/%m/", null=True, blank=True)
    lat = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    lng = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    geofence_ok = models.BooleanField(default=False)
    face_match_score = models.FloatField(null=True, blank=True)
    status = models.CharField(max_length=10, choices=CheckStatus.choices, default=CheckStatus.REVIEW)
    site = models.ForeignKey(
        "deployment.Site", null=True, blank=True, on_delete=models.SET_NULL
    )
    reviewed_by = models.ForeignKey(
        "accounts.User", null=True, blank=True, on_delete=models.SET_NULL,
        related_name="reviewed_attendances",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_note = models.TextField(blank=True)

    class Meta:
        unique_together = ("employee", "date")
        ordering = ["-date"]

    def __str__(self):
        return f"{self.employee.emp_code} – {self.date} – {self.status}"
