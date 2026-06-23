from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()


class EmployeeDetailSerializer(serializers.Serializer):
    emp_code     = serializers.CharField()
    designation  = serializers.CharField()
    site_name    = serializers.SerializerMethodField()
    date_joined  = serializers.DateField()
    status       = serializers.CharField()
    uan          = serializers.CharField()
    esic_no      = serializers.CharField()
    pan          = serializers.CharField()
    bank_account = serializers.CharField()
    ifsc         = serializers.CharField()
    address      = serializers.CharField()

    def get_site_name(self, obj):
        return obj.site.name if obj.site else None


class UserSerializer(serializers.ModelSerializer):
    employee_detail = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "phone", "email", "full_name", "role", "is_active", "created_at", "employee_detail")
        read_only_fields = ("id", "created_at")

    def get_employee_detail(self, obj):
        try:
            return EmployeeDetailSerializer(obj.employee).data
        except Exception:
            return None


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate_old_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Old password is incorrect.")
        return value

    def save(self):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.save()
