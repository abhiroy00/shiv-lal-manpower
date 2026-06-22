from django.contrib import admin
from .models import SalaryStructure, PayrollRun, Payslip

admin.site.register(SalaryStructure)
admin.site.register(PayrollRun)

@admin.register(Payslip)
class PayslipAdmin(admin.ModelAdmin):
    list_display = ("employee", "payroll_run", "present_days", "net_pay")
    list_filter = ("payroll_run",)
    search_fields = ("employee__emp_code", "employee__full_name")
