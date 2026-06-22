from django.db import models
from apps.common.models import TimeStampedModel


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

    class Meta:
        unique_together = ("employee", "date")
        ordering = ["-date"]

    def __str__(self):
        return f"{self.employee.emp_code} – {self.date} – {self.status}"
