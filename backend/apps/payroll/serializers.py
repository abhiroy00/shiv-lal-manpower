from rest_framework import serializers
from .models import SalaryStructure, PayrollRun, Payslip


class SalaryStructureSerializer(serializers.ModelSerializer):
    gross = serializers.SerializerMethodField()

    class Meta:
        model = SalaryStructure
        fields = "__all__"

    def get_gross(self, obj):
        return float(obj.gross())


class PayrollRunSerializer(serializers.ModelSerializer):
    payslip_count   = serializers.SerializerMethodField()
    total_gross     = serializers.SerializerMethodField()
    total_net       = serializers.SerializerMethodField()
    total_deductions = serializers.SerializerMethodField()
    month_label     = serializers.SerializerMethodField()

    class Meta:
        model = PayrollRun
        fields = "__all__"
        read_only_fields = ("run_by", "created_at", "updated_at")

    def get_payslip_count(self, obj):
        return obj.payslips.count()

    total_basic   = serializers.SerializerMethodField()
    total_hra     = serializers.SerializerMethodField()
    total_bonus   = serializers.SerializerMethodField()
    total_tds     = serializers.SerializerMethodField()

    def get_total_gross(self, obj):
        from django.db.models import Sum
        agg = obj.payslips.aggregate(
            s=Sum("basic") + Sum("hra") + Sum("da") + Sum("other_allowances")
        )
        return float(agg["s"] or 0)

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

    def get_total_net(self, obj):
        from django.db.models import Sum
        agg = obj.payslips.aggregate(s=Sum("net_pay"))
        return float(agg["s"] or 0)

    def get_total_deductions(self, obj):
        from django.db.models import Sum
        agg = obj.payslips.aggregate(
            s=Sum("pf_employee") + Sum("esi_employee") + Sum("tds") + Sum("other_deductions")
        )
        return float(agg["s"] or 0)

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
    run_month     = serializers.IntegerField(source="payroll_run.month", read_only=True)
    run_year      = serializers.IntegerField(source="payroll_run.year",  read_only=True)
    run_status    = serializers.CharField(source="payroll_run.run_status", read_only=True)
    month_label   = serializers.SerializerMethodField()

    class Meta:
        model = Payslip
        fields = "__all__"
        read_only_fields = ("created_at", "updated_at")

    pf_employer  = serializers.SerializerMethodField()
    esi_employer = serializers.SerializerMethodField()

    def get_gross_pay(self, obj):
        # CTC in PF/ESIC mode; employee gross in TDS mode
        from decimal import Decimal
        base = obj.basic + obj.hra + obj.da + obj.other_allowances + obj.bonus
        if obj.bonus > 0:  # PF/ESIC regime
            base += (obj.basic * Decimal("0.12") + obj.basic * Decimal("0.0325")).quantize(Decimal("0.01"))
        return float(base)

    def get_pf_employer(self, obj):
        from decimal import Decimal
        return float((obj.basic * Decimal("0.12")).quantize(Decimal("0.01")))

    def get_esi_employer(self, obj):
        from decimal import Decimal
        gross = obj.basic + obj.hra + obj.da + obj.other_allowances
        if gross <= Decimal("21000"):
            return float((gross * Decimal("0.0325")).quantize(Decimal("0.01")))
        return 0.0

    def get_month_label(self, obj):
        import calendar
        return f"{calendar.month_name[obj.payroll_run.month]} {obj.payroll_run.year}"
