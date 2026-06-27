from datetime import date
from rest_framework import serializers
from .models import State, District, Site


class StateSerializer(serializers.ModelSerializer):
    class Meta:
        model = State
        fields = "__all__"


class DistrictSerializer(serializers.ModelSerializer):
    state_name = serializers.CharField(source="state.name", read_only=True)

    class Meta:
        model = District
        fields = "__all__"


class SiteSerializer(serializers.ModelSerializer):
    district_name     = serializers.CharField(source="district.name",       read_only=True)
    state_name        = serializers.CharField(source="district.state.name", read_only=True)
    district_state_id = serializers.IntegerField(source="district.state.id", read_only=True)
    deployed_count = serializers.SerializerMethodField()
    present_today  = serializers.SerializerMethodField()
    vacancy        = serializers.SerializerMethodField()
    fill_pct       = serializers.SerializerMethodField()

    class Meta:
        model  = Site
        fields = "__all__"

    def get_deployed_count(self, obj):
        return obj.employees.filter(status="active").count()

    def get_present_today(self, obj):
        from apps.attendance.models import Attendance
        return Attendance.objects.filter(
            employee__site=obj,
            date=date.today(),
            status__in=["present", "late"],
        ).count()

    def get_vacancy(self, obj):
        deployed = obj.employees.filter(status="active").count()
        return max(obj.sanctioned_strength - deployed, 0)

    def get_fill_pct(self, obj):
        deployed = obj.employees.filter(status="active").count()
        if not obj.sanctioned_strength:
            return 0
        return round(deployed / obj.sanctioned_strength * 100, 1)
