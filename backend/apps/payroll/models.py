from django.db import models
from apps.common.models import TimeStampedModel


class SalaryStructure(TimeStampedModel):
    employee = models.OneToOneField(
        "employees.Employee", on_delete=models.CASCADE, related_name="salary_structure"
    )
    basic = models.DecimalField(max_digits=10, decimal_places=2)
    hra = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    da = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    other_allowances = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    def gross(self):
        return self.basic + self.hra + self.da + self.other_allowances

    def __str__(self):
        return f"{self.employee.emp_code} – ₹{self.gross()}"


class PayrollRun(TimeStampedModel):
    class RunStatus(models.TextChoices):
        DRAFT = "draft", "Draft"
        APPROVED = "approved", "Approved"
        PAID = "paid", "Paid"

    month = models.PositiveSmallIntegerField()
    year = models.PositiveSmallIntegerField()
    run_status = models.CharField(max_length=10, choices=RunStatus.choices, default=RunStatus.DRAFT)
    run_by = models.ForeignKey(
        "accounts.User", null=True, on_delete=models.SET_NULL, related_name="payroll_runs"
    )

    class Meta:
        unique_together = ("month", "year")
        ordering = ["-year", "-month"]

    def __str__(self):
        return f"Payroll {self.month}/{self.year} [{self.run_status}]"


class Payslip(TimeStampedModel):
    payroll_run = models.ForeignKey(PayrollRun, on_delete=models.CASCADE, related_name="payslips")
    employee = models.ForeignKey(
        "employees.Employee", on_delete=models.CASCADE, related_name="payslips"
    )
    present_days = models.PositiveSmallIntegerField(default=0)
    working_days = models.PositiveSmallIntegerField(default=26)
    basic = models.DecimalField(max_digits=10, decimal_places=2)
    hra = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    da = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    other_allowances = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    pf_employee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    esi_employee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    other_deductions = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    net_pay = models.DecimalField(max_digits=10, decimal_places=2)
    pdf_file = models.FileField(upload_to="payslips/", null=True, blank=True)

    class Meta:
        unique_together = ("payroll_run", "employee")

    def __str__(self):
        return f"{self.employee.emp_code} – {self.payroll_run}"
