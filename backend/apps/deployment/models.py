from django.db import models
from apps.common.models import TimeStampedModel


class State(TimeStampedModel):
    name = models.CharField(max_length=80, unique=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class District(TimeStampedModel):
    state = models.ForeignKey(State, on_delete=models.CASCADE, related_name="districts")
    name = models.CharField(max_length=80)

    class Meta:
        unique_together = ("state", "name")
        ordering = ["state__name", "name"]

    def __str__(self):
        return f"{self.name}, {self.state.name}"


class Site(TimeStampedModel):
    district = models.ForeignKey(District, on_delete=models.CASCADE, related_name="sites")
    name = models.CharField(max_length=120)
    office_name = models.CharField(max_length=120, blank=True, help_text="Administrative office name")
    address = models.TextField(blank=True)
    lat = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    lng = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    geofence_radius = models.PositiveIntegerField(default=200, help_text="Radius in metres")
    sanctioned_strength = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.district})"
