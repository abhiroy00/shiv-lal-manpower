from decimal import Decimal
from rest_framework import serializers
from .models import SalaryStructure, PayrollRun, Payslip


def _compute_figures(payslip):
    """
    Return (gross_ctc, total_deductions, net_pay) consistent with the PDF.
    Mirrors pdf_service.py so the web and PDF always agree.
    """
    basic   = payslip.basic
    hra     = payslip.hra
    da      = payslip.da
    bonus   = payslip.bonus        # 8.33% of struct.basic if PF mode, else 0
    pf_emp  = payslip.pf_employee
    esi_emp = payslip.esi_employee
    tds     = payslip.tds
    other_d = payslip.other_deductions

    if bonus > 0:                  # PF / ESIC mode
        pf_er  = (basic * Decimal("0.12")).quantize(Decimal("0.01"))
        esi_er = (basic * Decimal("0.0325")).quantize(Decimal("0.01"))
        gross   = basic + hra + da + pf_er + esi_er + bonus
        total_d = pf_emp + pf_er + esi_emp + esi_er + bonus + other_d
    else:                          # TDS mode
        pf_er = esi_er = Decimal("0")
        gross   = basic + hra + da
        total_d = tds + other_d

    net = gross - total_d
    return gross, total_d, net, pf_er, esi_er


def _run_totals(run):
    """Compute gross / deductions / net totals for a PayrollRun (one DB query)."""
    gross = ded = net = Decimal("0")
    for p in run.payslips.all():
        g, d, n, _, _ = _compute_figures(p)
        gross += g
        ded   += d
        net   += n
    return {"gross": gross, "deductions": ded, "net": net}


def _get_run_totals(run):
    """Cache totals on the instance so all three methods share one query."""
    if not hasattr(run, "_computed_totals"):
        run._computed_totals = _run_totals(run)
    return run._computed_totals


class SalaryStructureSerializer(serializers.ModelSerializer):
    gross = serializers.SerializerMethodField()

    class Meta:
        model = SalaryStructure
        fields = "__all__"

    def get_gross(self, obj):
        return float(obj.gross())


class PayrollRunSerializer(serializers.ModelSerializer):
    payslip_count    = serializers.SerializerMethodField()
    total_gross      = serializers.SerializerMethodField()
    total_net        = serializers.SerializerMethodField()
    total_deductions = serializers.SerializerMethodField()
    month_label      = serializers.SerializerMethodField()
    total_basic      = serializers.SerializerMethodField()
    total_hra        = serializers.SerializerMethodField()
    total_bonus      = serializers.SerializerMethodField()
    total_tds        = serializers.SerializerMethodField()

    class Meta:
        model = PayrollRun
        fields = "__all__"
        read_only_fields = ("run_by", "created_at", "updated_at")

    def get_payslip_count(self, obj):
        return obj.payslips.count()

    def get_total_gross(self, obj):
        return float(_get_run_totals(obj)["gross"])

    def get_total_net(self, obj):
        return float(_get_run_totals(obj)["net"])

    def get_total_deductions(self, obj):
        return float(_get_run_totals(obj)["deductions"])

    def get_total_basic(self, obj):
        from django.db.models import Sum
        return float(obj.payslips.aggregate(s=Sum("basic"))["s"] or 0)

    def get_total_hra(self, obj):
        from django.db.models import Sum
        return float(obj.payslips.aggregate(s=Sum("hra"))["s"] or 0)

    def get_total_bonus(self, obj):
        from django.db.models import Sum
        return float(obj.payslips.aggregate(s=Sum("bonus"))["s"] or 0)

    def get_total_tds(self, obj):
        from django.db.models import Sum
        return float(obj.payslips.aggregate(s=Sum("tds"))["s"] or 0)

    def get_month_label(self, obj):
        import calendar
        return f"{calendar.month_name[obj.month]} {obj.year}"


class PayslipSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.full_name",   read_only=True)
    emp_code      = serializers.CharField(source="employee.emp_code",    read_only=True)
    designation   = serializers.CharField(source="employee.designation", read_only=True)
    site_name     = serializers.CharField(source="employee.site.name",   read_only=True, default="")
    bank_account  = serializers.CharField(source="employee.bank_account",read_only=True, default="")
    ifsc          = serializers.CharField(source="employee.ifsc",        read_only=True, default="")
    gross_pay     = serializers.SerializerMethodField()
    net_pay       = serializers.SerializerMethodField()   # overrides model field
    pf_employer   = serializers.SerializerMethodField()
    esi_employer  = serializers.SerializerMethodField()
    run_month     = serializers.IntegerField(source="payroll_run.month", read_only=True)
    run_year      = serializers.IntegerField(source="payroll_run.year",  read_only=True)
    run_status    = serializers.CharField(source="payroll_run.run_status", read_only=True)
    month_label   = serializers.SerializerMethodField()

    class Meta:
        model = Payslip
        fields = "__all__"
        read_only_fields = ("created_at", "updated_at")

    def get_gross_pay(self, obj):
        gross, _, _, _, _ = _compute_figures(obj)
        return float(gross)

    def get_net_pay(self, obj):
        _, _, net, _, _ = _compute_figures(obj)
        return float(net)

    def get_pf_employer(self, obj):
        _, _, _, pf_er, _ = _compute_figures(obj)
        return float(pf_er)

    def get_esi_employer(self, obj):
        _, _, _, _, esi_er = _compute_figures(obj)
        return float(esi_er)

    def get_month_label(self, obj):
        import calendar
        return f"{calendar.month_name[obj.payroll_run.month]} {obj.payroll_run.year}"
