import calendar
from decimal import Decimal
from apps.attendance.models import Attendance
from apps.employees.models import Employee
from .models import SalaryStructure, PayrollRun, Payslip

PF_THRESHOLD = Decimal("30000")   # basic STRICTLY > this → TDS only, no PF/ESIC
PF_RATE      = Decimal("0.12")    # 12% of basic_pay  (employee EPF)
PF_ER_RATE   = Decimal("0.12")    # 12% of basic_pay  (employer EPF — for CTC display)
ESI_RATE     = Decimal("0.0075")  # 0.75% of basic_pay (employee ESIC)
ESI_ER_RATE  = Decimal("0.0325")  # 3.25% of basic_pay (employer ESIC — for CTC display)
TDS_RATE     = Decimal("0.10")    # 10% of basic_pay   (when basic > 30k)
BONUS_RATE   = Decimal("0.0833")  # 8.33% of full struct.basic (PF/ESIC regime only)


def _working_days(month, year):
    """Total days in month minus Sundays."""
    total   = calendar.monthrange(year, month)[1]
    sundays = sum(1 for d in range(1, total + 1) if calendar.weekday(year, month, d) == 6)
    return total - sundays


def run_payroll(month, year, user):
    run, _ = PayrollRun.objects.get_or_create(
        month=month, year=year, defaults={"run_by": user}
    )

    working_days = _working_days(month, year)
    employees    = Employee.objects.filter(status="active").select_related("salary_structure")

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

        # ── Regime (strictly greater, per spec) ───────────────
        if struct.basic > PF_THRESHOLD:
            # TDS regime: statutory bonus not applicable above ₹21,000 salary
            pf    = Decimal("0.00")
            esi   = Decimal("0.00")
            bonus = Decimal("0.00")
            tds   = (basic_pay * TDS_RATE).quantize(Decimal("0.01"))  # 10% of basic
        else:
            # PF + ESIC regime: bonus on full struct.basic (not prorated)
            bonus = (struct.basic * BONUS_RATE).quantize(Decimal("0.01"))
            pf    = (basic_pay   * PF_RATE).quantize(Decimal("0.01"))
            esi   = (basic_pay   * ESI_RATE).quantize(Decimal("0.01"))
            tds   = Decimal("0.00")

        # Bonus is shown in earnings and NOT deducted back, so it flows into take-home.
        # other_allowances excluded — not rendered in payslip.
        net = (basic_pay + hra_pay + da_pay + bonus - pf - esi - tds).quantize(Decimal("0.01"))

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
