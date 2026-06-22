from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import PFContribution, ESIContribution, ChallanRun
from .serializers import PFContributionSerializer, ESIContributionSerializer, ChallanRunSerializer
from apps.common.permissions import IsAdminHR


class PFContributionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = PFContribution.objects.all()
    serializer_class = PFContributionSerializer
    permission_classes = [IsAdminHR]
    filterset_fields = ["payslip__payroll_run"]


class ESIContributionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ESIContribution.objects.all()
    serializer_class = ESIContributionSerializer
    permission_classes = [IsAdminHR]
    filterset_fields = ["payslip__payroll_run"]


class ChallanRunViewSet(viewsets.ModelViewSet):
    queryset = ChallanRun.objects.all()
    serializer_class = ChallanRunSerializer
    permission_classes = [IsAdminHR]
    filterset_fields = ["payroll_run", "challan_type", "is_filed"]
