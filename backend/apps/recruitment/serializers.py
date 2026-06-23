from rest_framework import serializers
from .models import Requisition, Candidate


class RequisitionSerializer(serializers.ModelSerializer):
    site_name    = serializers.CharField(source="site.name", read_only=True)
    district     = serializers.CharField(source="site.district.name", read_only=True)
    filled_count = serializers.SerializerMethodField()

    class Meta:
        model  = Requisition
        fields = "__all__"

    def get_filled_count(self, obj):
        return obj.candidates.filter(stage=Candidate.Stage.SELECTED).count()


class CandidateSerializer(serializers.ModelSerializer):
    requisition_label = serializers.SerializerMethodField()

    class Meta:
        model  = Candidate
        fields = "__all__"

    def get_requisition_label(self, obj):
        if not obj.requisition:
            return None
        r = obj.requisition
        return f"{r.designation} – {r.site.name}"
