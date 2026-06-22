from rest_framework import serializers
from .models import SalaryStructure, PayrollRun, Payslip


class SalaryStructureSerializer(serializers.ModelSerializer):
    gross = serializers.SerializerMethodField()

    class Meta:
        model = SalaryStructure
        fields = "__all__"

    def get_gross(self, obj):
        return obj.gross()


class PayrollRunSerializer(serializers.ModelSerializer):
    class Meta:
        model = PayrollRun
        fields = "__all__"
        read_only_fields = ("run_by", "created_at", "updated_at")


class PayslipSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.full_name", read_only=True)
    emp_code = serializers.CharField(source="employee.emp_code", read_only=True)

    class Meta:
        model = Payslip
        fields = "__all__"
        read_only_fields = ("created_at", "updated_at")
