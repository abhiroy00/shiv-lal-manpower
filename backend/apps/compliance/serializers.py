from rest_framework import serializers
from .models import PFContribution, ESIContribution, ChallanRun


class PFContributionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PFContribution
        fields = "__all__"


class ESIContributionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ESIContribution
        fields = "__all__"


class ChallanRunSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChallanRun
        fields = "__all__"
