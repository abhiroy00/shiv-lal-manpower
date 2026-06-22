from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Requisition, Candidate
from .serializers import RequisitionSerializer, CandidateSerializer
from apps.common.permissions import IsAdminHR


class RequisitionViewSet(viewsets.ModelViewSet):
    queryset = Requisition.objects.select_related("site").all()
    serializer_class = RequisitionSerializer
    permission_classes = [IsAdminHR]
    filterset_fields = ["site", "is_open"]


class CandidateViewSet(viewsets.ModelViewSet):
    queryset = Candidate.objects.all()
    serializer_class = CandidateSerializer
    permission_classes = [IsAdminHR]
    filterset_fields = ["stage", "requisition"]
    search_fields = ["full_name", "phone"]

    @action(detail=True, methods=["post"])
    def move(self, request, pk=None):
        candidate = self.get_object()
        new_stage = request.data.get("stage")
        if new_stage not in dict(Candidate.Stage.choices):
            return Response({"detail": "Invalid stage."}, status=400)
        candidate.stage = new_stage
        candidate.save()
        return Response(CandidateSerializer(candidate).data)
