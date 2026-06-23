from django.db.models import Count, Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from .models import Requisition, Candidate
from .serializers import RequisitionSerializer, CandidateSerializer
from apps.common.permissions import IsAdminHR


class RequisitionViewSet(viewsets.ModelViewSet):
    queryset = Requisition.objects.select_related(
        "site__district"
    ).annotate(
        filled_count=Count("candidates", filter=Q(candidates__stage=Candidate.Stage.SELECTED))
    ).all()
    serializer_class   = RequisitionSerializer
    permission_classes = [IsAdminHR]
    filterset_fields   = ["site", "is_open"]


class CandidateViewSet(viewsets.ModelViewSet):
    queryset = Candidate.objects.select_related(
        "requisition__site"
    ).all()
    serializer_class   = CandidateSerializer
    permission_classes = [IsAdminHR]
    filterset_fields   = ["stage", "requisition"]
    search_fields      = ["full_name", "phone", "designation"]
    ordering_fields    = ["created_at", "full_name"]
    ordering           = ["-created_at"]

    @action(detail=True, methods=["post"])
    def move(self, request, pk=None):
        candidate = self.get_object()
        new_stage = request.data.get("stage")
        if new_stage not in dict(Candidate.Stage.choices):
            return Response({"detail": "Invalid stage."}, status=400)
        candidate.stage = new_stage
        candidate.save()
        return Response(CandidateSerializer(candidate).data)

    @action(detail=False, methods=["get"])
    def stats(self, request):
        """Per-stage count + total."""
        counts = dict(
            Candidate.objects.values_list("stage").annotate(n=Count("id"))
        )
        total = sum(counts.values())
        return Response({
            "total":     total,
            "applied":   counts.get("applied",   0),
            "screened":  counts.get("screened",  0),
            "interview": counts.get("interview", 0),
            "selected":  counts.get("selected",  0),
            "rejected":  counts.get("rejected",  0),
        })
