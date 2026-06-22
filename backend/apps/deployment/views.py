from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import State, District, Site
from .serializers import StateSerializer, DistrictSerializer, SiteSerializer
from apps.common.permissions import IsAdminHR


class StateViewSet(viewsets.ModelViewSet):
    queryset = State.objects.all()
    serializer_class = StateSerializer
    permission_classes = [IsAuthenticated]


class DistrictViewSet(viewsets.ModelViewSet):
    queryset = District.objects.select_related("state").all()
    serializer_class = DistrictSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["state"]


class SiteViewSet(viewsets.ModelViewSet):
    queryset = Site.objects.select_related("district__state").prefetch_related("employees").all()
    serializer_class = SiteSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["district", "is_active"]
    search_fields = ["name", "address"]
