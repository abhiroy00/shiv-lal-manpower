import calendar
from decimal import Decimal
from apps.attendance.models import Attendance
from apps.employees.models import Employee
from .models import SalaryStructure, PayrollRun, Payslip

PF_THRESHOLD  = Decimal("30000")   # basic >= this → TDS only, NO PF/ESIC
PF_RATE       = Decimal("0.12")    # 12% of basic (employee PF)
ESI_RATE      = Decimal("0.0075")  # 0.75% of basic (employee ESIC)
TDS_RATE      = Decimal("0.10")    # 10% of gross (applied when basic >= 30k)
BONUS_RATE    = Decimal("0.0833")  # 8.33% statutory bonus
PF_EMPLOYER   = Decimal("0.12")    # employer PF  (for reference / future reporting)
ESI_EMPLOYER  = Decimal("0.0325")  # employer ESI (for reference / future reporting)


def _working_days(month, year):
    """Total days in month minus Sundays."""
    total = calendar.monthrange(year, month)[1]
    sundays = sum(1 for d in range(1, total + 1) if calendar.weekday(year, month, d) == 6)
    return total - sundays


def run_payroll(month, year, user):
    run, _ = PayrollRun.objects.get_or_create(
        month=month, year=year, defaults={"run_by": user}
    )

    working_days = _working_days(month, year)
    employees = Employee.objects.filter(status="active").select_related("salary_structure")

    created = updated = skipped = 0
    for emp in employees:
        try:
            struct = emp.salary_structure
        except SalaryStructure.DoesNotExist:
            skipped += 1
            continue

        present = Attendance.objects.filter(
            employee=emp,
            date__month=month,
            date__year=year,
            status__in=["present", "late"],
        ).count()

        ratio     = Decimal(present) / Decimal(working_days) if working_days else Decimal(0)
        basic_pay = (struct.basic            * ratio).quantize(Decimal("0.01"))
        hra_pay   = (struct.hra              * ratio).quantize(Decimal("0.01"))
        da_pay    = (struct.da               * ratio).quantize(Decimal("0.01"))
        other_pay = (struct.other_allowances * ratio).quantize(Decimal("0.01"))
        bonus     = (basic_pay * BONUS_RATE).quantize(Decimal("0.01"))
        gross     = basic_pay + hra_pay + da_pay + other_pay

        # ── Deduction logic ──────────────────────────────────────
        # Rule: basic >= ₹30,000 → TDS only (no PF, no ESIC)
        #       basic <  ₹30,000 → PF + ESIC (no TDS)
        if struct.basic >= PF_THRESHOLD:
            pf  = Decimal("0.00")
            esi = Decimal("0.00")
            tds = (gross * TDS_RATE).quantize(Decimal("0.01"))
        else:
            pf  = (basic_pay * PF_RATE).quantize(Decimal("0.01"))
            esi = (basic_pay * ESI_RATE).quantize(Decimal("0.01"))
            tds = Decimal("0.00")

        net = (gross + bonus - pf - esi - tds).quantize(Decimal("0.01"))

        _, was_created = Payslip.objects.update_or_create(
            payroll_run=run,
            employee=emp,
            defaults={
                "present_days":     present,
                "working_days":     working_days,
                "basic":            basic_pay,
                "hra":              hra_pay,
                "da":               da_pay,
                "other_allowances": other_pay,
                "bonus":            bonus,
                "pf_employee":      pf,
                "esi_employee":     esi,
                "tds":              tds,
                "net_pay":          net,
            },
        )
        if was_created:
            created += 1
        else:
            updated += 1

    run.refresh_from_db()
    return run, {"created": created, "updated": updated, "skipped": skipped}
