"""
Compliance service — generates PF/ESI contribution records from a PayrollRun.

PF rates:
  Employee  : 12% of basic → EPF
  Employer  : 12% of basic total
               └─ 8.33% → EPS (capped ₹1,250/month)
               └─ 3.67% → EPF (or remainder after EPS cap)

ESI rates (only if IP wages ≤ ₹21,000):
  Employee  : 0.75% of gross
  Employer  : 3.25% of gross
"""
from decimal import Decimal
from apps.payroll.models import Payslip, PayrollRun
from .models import PFContribution, ESIContribution, ChallanRun

PF_EMP_RATE   = Decimal("0.12")
EPS_RATE      = Decimal("0.0833")
EPF_EMP_RATE  = Decimal("0.0367")
EPS_CAP       = Decimal("1250.00")   # ₹1,250/month EPS ceiling
EDLI_RATE     = Decimal("0.005")     # 0.5% EDLI (employer) — included in total

ESI_EMP_RATE  = Decimal("0.0075")
ESI_EMPLR_RATE = Decimal("0.0325")
ESI_THRESHOLD = Decimal("21000")


def generate_compliance(payroll_run):
    """
    For every payslip in the run, create/update PFContribution and ESIContribution.
    Then create/update ChallanRun totals.
    Returns (pf_total, esi_total, pf_count, esi_count).
    """
    payslips = payroll_run.payslips.select_related("employee").all()

    pf_total  = Decimal("0.00")
    esi_total = Decimal("0.00")
    pf_count  = esi_count = 0

    for slip in payslips:
        basic = slip.basic
        gross = slip.basic + slip.hra + slip.da + slip.other_allowances

        # ── PF ─────────────────────────────────────────────────
        emp_pf   = (basic * PF_EMP_RATE).quantize(Decimal("0.01"))
        eps      = min((basic * EPS_RATE).quantize(Decimal("0.01")), EPS_CAP)
        epf_empl = (basic * EPF_EMP_RATE).quantize(Decimal("0.01"))
        edli     = (basic * EDLI_RATE).quantize(Decimal("0.01"))
        emp_pf_total = (emp_pf + epf_empl + eps + edli).quantize(Decimal("0.01"))

        pf_obj, _ = PFContribution.objects.update_or_create(
            payslip=slip,
            defaults={
                "employee_share": emp_pf,
                "employer_share": (epf_empl + eps + edli),
            },
        )
        pf_total += emp_pf_total
        pf_count += 1

        # ── ESI ────────────────────────────────────────────────
        if gross <= ESI_THRESHOLD and gross > 0:
            esi_emp   = (gross * ESI_EMP_RATE).quantize(Decimal("0.01"))
            esi_empl  = (gross * ESI_EMPLR_RATE).quantize(Decimal("0.01"))
            ESIContribution.objects.update_or_create(
                payslip=slip,
                defaults={
                    "employee_share": esi_emp,
                    "employer_share": esi_empl,
                },
            )
            esi_total += esi_emp + esi_empl
            esi_count += 1

    # ── ChallanRun totals ───────────────────────────────────────
    ChallanRun.objects.update_or_create(
        payroll_run=payroll_run, challan_type=ChallanRun.ChallanType.EPF,
        defaults={"total_amount": pf_total},
    )
    ChallanRun.objects.update_or_create(
        payroll_run=payroll_run, challan_type=ChallanRun.ChallanType.ESI,
        defaults={"total_amount": esi_total},
    )

    return {
        "pf_total":  float(pf_total),
        "esi_total": float(esi_total),
        "pf_count":  pf_count,
        "esi_count": esi_count,
    }
