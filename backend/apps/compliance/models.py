from django.db import models
from apps.common.models import TimeStampedModel


class PFContribution(TimeStampedModel):
    payslip = models.OneToOneField(
        "payroll.Payslip", on_delete=models.CASCADE, related_name="pf_contribution"
    )
    employee_share = models.DecimalField(max_digits=10, decimal_places=2)
    employer_share = models.DecimalField(max_digits=10, decimal_places=2)
    total = models.DecimalField(max_digits=10, decimal_places=2)

    def save(self, *args, **kwargs):
        self.total = self.employee_share + self.employer_share
        super().save(*args, **kwargs)


class ESIContribution(TimeStampedModel):
    payslip = models.OneToOneField(
        "payroll.Payslip", on_delete=models.CASCADE, related_name="esi_contribution"
    )
    employee_share = models.DecimalField(max_digits=10, decimal_places=2)
    employer_share = models.DecimalField(max_digits=10, decimal_places=2)
    total = models.DecimalField(max_digits=10, decimal_places=2)

    def save(self, *args, **kwargs):
        self.total = self.employee_share + self.employer_share
        super().save(*args, **kwargs)


class ChallanRun(TimeStampedModel):
    class ChallanType(models.TextChoices):
        EPF = "epf", "EPF"
        ESI = "esi", "ESI"

    payroll_run = models.ForeignKey(
        "payroll.PayrollRun", on_delete=models.CASCADE, related_name="challans"
    )
    challan_type = models.CharField(max_length=5, choices=ChallanType.choices)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    is_filed = models.BooleanField(default=False)
    filed_on = models.DateField(null=True, blank=True)

    class Meta:
        unique_together = ("payroll_run", "challan_type")

    def __str__(self):
        return f"{self.challan_type.upper()} – {self.payroll_run}"
