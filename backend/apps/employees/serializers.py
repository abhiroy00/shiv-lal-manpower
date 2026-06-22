from rest_framework import serializers
from .models import Employee, EmployeeDocument


class EmployeeDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployeeDocument
        fields = "__all__"
        read_only_fields = ("uploaded_at",)


class EmployeeSerializer(serializers.ModelSerializer):
    site_name = serializers.CharField(source="site.name", read_only=True)
    district_name = serializers.CharField(source="site.district.name", read_only=True)
    state_name = serializers.CharField(source="site.district.state.name", read_only=True)

    class Meta:
        model = Employee
        fields = "__all__"
        read_only_fields = ("created_at", "updated_at")


class EmployeeListSerializer(serializers.ModelSerializer):
    site_name = serializers.CharField(source="site.name", read_only=True)

    class Meta:
        model = Employee
        fields = ("id", "emp_code", "full_name", "phone", "designation", "site", "site_name", "status", "date_joined")
