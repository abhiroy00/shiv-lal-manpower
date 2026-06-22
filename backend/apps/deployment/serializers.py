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
    district_name = serializers.CharField(source="district.name", read_only=True)
    state_name = serializers.CharField(source="district.state.name", read_only=True)
    deployed_count = serializers.SerializerMethodField()

    class Meta:
        model = Site
        fields = "__all__"

    def get_deployed_count(self, obj):
        return obj.employees.filter(status="active").count()
