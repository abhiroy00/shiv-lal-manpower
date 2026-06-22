from rest_framework import serializers
from .models import Attendance


class AttendanceSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.full_name", read_only=True)
    emp_code = serializers.CharField(source="employee.emp_code", read_only=True)
    site_name = serializers.CharField(source="site.name", read_only=True)

    class Meta:
        model = Attendance
        fields = "__all__"
        read_only_fields = ("created_at", "updated_at", "status", "geofence_ok", "face_match_score")


class CheckInSerializer(serializers.Serializer):
    lat = serializers.DecimalField(max_digits=10, decimal_places=7)
    lng = serializers.DecimalField(max_digits=10, decimal_places=7)
    selfie = serializers.ImageField(required=False)
