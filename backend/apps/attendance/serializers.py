from rest_framework import serializers
from .models import Attendance, LeaveRequest


class AttendanceSerializer(serializers.ModelSerializer):
    employee_name  = serializers.CharField(source="employee.full_name",      read_only=True)
    emp_code       = serializers.CharField(source="employee.emp_code",       read_only=True)
    site_name      = serializers.CharField(source="site.name",               read_only=True)
    reviewer_name  = serializers.CharField(source="reviewed_by.full_name",   read_only=True, default=None)
    selfie_url     = serializers.SerializerMethodField()

    class Meta:
        model  = Attendance
        fields = "__all__"
        read_only_fields = (
            "created_at", "updated_at", "status", "geofence_ok", "face_match_score",
            "reviewed_by", "reviewed_at",
        )

    def get_selfie_url(self, obj):
        """Absolute URL of the check-in selfie (or None). Built from the request
        so it works behind nginx / on the deployed domain."""
        if not obj.selfie:
            return None
        request = self.context.get("request")
        try:
            url = obj.selfie.url
        except ValueError:
            return None
        return request.build_absolute_uri(url) if request else url


class CheckInSerializer(serializers.Serializer):
    lat    = serializers.DecimalField(max_digits=10, decimal_places=7)
    lng    = serializers.DecimalField(max_digits=10, decimal_places=7)
    selfie = serializers.ImageField(required=False)


class LeaveRequestSerializer(serializers.ModelSerializer):
    employee_name  = serializers.CharField(source="employee.full_name", read_only=True)
    emp_code       = serializers.CharField(source="employee.emp_code",  read_only=True)
    days           = serializers.IntegerField(read_only=True)
    reviewer_name  = serializers.CharField(source="reviewed_by.full_name", read_only=True, default=None)

    class Meta:
        model  = LeaveRequest
        fields = "__all__"
        read_only_fields = ("employee", "status", "reviewed_by", "reviewed_at", "review_note")
