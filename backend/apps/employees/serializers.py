from rest_framework import serializers
from .models import Employee, EmployeeDocument


class EmployeeDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployeeDocument
        fields = "__all__"
        read_only_fields = ("uploaded_at", "employee")


class EmployeeSerializer(serializers.ModelSerializer):
    site_name     = serializers.CharField(source="site.name", read_only=True)
    district_name = serializers.CharField(source="site.district.name", read_only=True)
    state_name    = serializers.CharField(source="site.district.state.name", read_only=True)
    has_login           = serializers.SerializerMethodField()
    password_changed_at = serializers.SerializerMethodField()

    class Meta:
        model  = Employee
        fields = "__all__"
        read_only_fields = ("created_at", "updated_at")

    def get_has_login(self, obj):
        try:
            return obj.user_account is not None
        except Exception:
            return False

    def get_password_changed_at(self, obj):
        try:
            return obj.user_account.password_changed_at
        except Exception:
            return None


class EmployeeListSerializer(serializers.ModelSerializer):
    site_name = serializers.CharField(source="site.name", read_only=True)
    has_login = serializers.SerializerMethodField()
    doc_count = serializers.SerializerMethodField()

    class Meta:
        model  = Employee
        fields = ("id", "emp_code", "full_name", "phone", "designation",
                  "site", "site_name", "status", "date_joined", "has_login", "doc_count")

    def get_has_login(self, obj):
        try:
            return obj.user_account is not None
        except Exception:
            return False

    def get_doc_count(self, obj):
        return obj.documents.count()
