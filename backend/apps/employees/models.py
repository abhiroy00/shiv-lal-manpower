from django.db import models
from apps.common.models import TimeStampedModel


class Employee(TimeStampedModel):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        ON_LEAVE = "on_leave", "On Leave"
        INACTIVE = "inactive", "Inactive"

    emp_code = models.CharField(max_length=20, unique=True)
    full_name = models.CharField(max_length=120)
    phone = models.CharField(max_length=15, unique=True)
    designation = models.CharField(max_length=80)
    site = models.ForeignKey(
        "deployment.Site",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="employees",
    )
    uan = models.CharField(max_length=20, blank=True)
    esic_no = models.CharField(max_length=20, blank=True)
    aadhar = models.CharField(max_length=12, blank=True)
    pan = models.CharField(max_length=10, blank=True)
    bank_account = models.CharField(max_length=20, blank=True)
    ifsc = models.CharField(max_length=11, blank=True)
    date_joined = models.DateField()
    date_of_birth = models.DateField(null=True, blank=True)
    address = models.TextField(blank=True)
    photo = models.ImageField(upload_to="employees/photos/", null=True, blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.ACTIVE)

    def __str__(self):
        return f"{self.emp_code} – {self.full_name}"


class EmployeeDocument(TimeStampedModel):
    class DocType(models.TextChoices):
        AADHAR = "aadhar", "Aadhar"
        PAN = "pan", "PAN"
        PHOTO = "photo", "Photo"
        OTHER = "other", "Other"

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="documents")
    doc_type = models.CharField(max_length=20, choices=DocType.choices)
    file = models.FileField(upload_to="employees/docs/")
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.employee.emp_code} – {self.doc_type}"
