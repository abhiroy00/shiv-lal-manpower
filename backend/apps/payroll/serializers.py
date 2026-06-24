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

    def get_total_gross(self, obj):
        from django.db.models import Sum
        agg = obj.payslips.aggregate(
            s=Sum("basic") + Sum("hra") + Sum("da") + Sum("other_allowances")
        )
        return float(agg["s"] or 0)

    def get_total_net(self, obj):
        from django.db.models import Sum
        agg = obj.payslips.aggregate(s=Sum("net_pay"))
        return float(agg["s"] or 0)

    def get_total_deductions(self, obj):
        from django.db.models import Sum
        agg = obj.payslips.aggregate(
            s=Sum("pf_employee") + Sum("esi_employee") + Sum("other_deductions")
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

    def get_gross_pay(self, obj):
        return float(obj.basic + obj.hra + obj.da + obj.other_allowances)

    def get_month_label(self, obj):
        import calendar
        return f"{calendar.month_name[obj.payroll_run.month]} {obj.payroll_run.year}"
