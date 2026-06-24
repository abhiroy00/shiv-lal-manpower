from rest_framework import serializers
from .models import LeaveRequest


class LeaveRequestSerializer(serializers.ModelSerializer):
    days          = serializers.ReadOnlyField()
    employee_name = serializers.SerializerMethodField()
    emp_code      = serializers.SerializerMethodField()
    reviewer_name = serializers.SerializerMethodField()

    class Meta:
        model  = LeaveRequest
        fields = (
            "id", "leave_type", "from_date", "to_date", "reason",
            "status", "review_note", "reviewed_at",
            "days", "employee_name", "emp_code", "reviewer_name",
            "created_at", "updated_at",
        )
        read_only_fields = (
            "id", "status", "review_note", "reviewed_at",
            "days", "employee_name", "emp_code", "reviewer_name",
            "created_at", "updated_at",
        )

    def get_employee_name(self, obj):
        return obj.employee.full_name

    def get_emp_code(self, obj):
        return obj.employee.emp_code

    def get_reviewer_name(self, obj):
        return obj.reviewed_by.full_name if obj.reviewed_by else None

    def validate(self, data):
        if data.get("from_date") and data.get("to_date"):
            if data["from_date"] > data["to_date"]:
                raise serializers.ValidationError("from_date must be before or equal to to_date.")
        return data
