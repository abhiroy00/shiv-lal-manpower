from decimal import Decimal
from apps.attendance.models import Attendance
from apps.employees.models import Employee
from .models import SalaryStructure, PayrollRun, Payslip

PF_RATE = Decimal("0.12")
ESI_THRESHOLD = Decimal("21000")
ESI_RATE = Decimal("0.0075")


def run_payroll(month, year, user):
    run, _ = PayrollRun.objects.get_or_create(
        month=month, year=year, defaults={"run_by": user}
    )
    employees = Employee.objects.filter(status="active").select_related("salary_structure")

    for emp in employees:
        try:
            struct = emp.salary_structure
        except SalaryStructure.DoesNotExist:
            continue

        present = Attendance.objects.filter(
            employee=emp, date__month=month, date__year=year, status__in=["present", "late"]
        ).count()

        working_days = 26
        ratio = Decimal(present) / Decimal(working_days)
        gross = struct.gross() * ratio

        pf = gross * PF_RATE if gross > 0 else Decimal(0)
        esi = gross * ESI_RATE if gross <= ESI_THRESHOLD else Decimal(0)
        net = gross - pf - esi

        Payslip.objects.update_or_create(
            payroll_run=run,
            employee=emp,
            defaults={
                "present_days": present,
                "working_days": working_days,
                "basic": struct.basic * ratio,
                "hra": struct.hra * ratio,
                "da": struct.da * ratio,
                "other_allowances": struct.other_allowances * ratio,
                "pf_employee": pf,
                "esi_employee": esi,
                "net_pay": net,
            },
        )
    return run
