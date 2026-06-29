from django.db import models
from apps.common.models import TimeStampedModel


class Requisition(TimeStampedModel):
    site = models.ForeignKey("deployment.Site", on_delete=models.CASCADE, related_name="requisitions")
    designation = models.CharField(max_length=80)
    count_required = models.PositiveSmallIntegerField()
    is_open = models.BooleanField(default=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.designation} x{self.count_required} – {self.site}"


class Candidate(TimeStampedModel):
    class Stage(models.TextChoices):
        APPLIED = "applied", "Applied"
        SCREENED = "screened", "Screened"
        INTERVIEW = "interview", "Interview"
        SELECTED = "selected", "Selected"
        REJECTED = "rejected", "Rejected"

    requisition = models.ForeignKey(
        Requisition, null=True, blank=True, on_delete=models.SET_NULL, related_name="candidates"
    )
    full_name = models.CharField(max_length=120)
    phone = models.CharField(max_length=15)
    designation = models.CharField(max_length=80)
    experience_years = models.PositiveSmallIntegerField(default=0)
    notes = models.TextField(blank=True)
    stage = models.CharField(max_length=12, choices=Stage.choices, default=Stage.APPLIED)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.full_name} – {self.stage}"
