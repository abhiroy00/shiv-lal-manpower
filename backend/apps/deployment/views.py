from django.db.models import Count, Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import State, District, Site
from .serializers import StateSerializer, DistrictSerializer, SiteSerializer
from apps.common.permissions import IsAdminHR


class StateViewSet(viewsets.ModelViewSet):
    queryset           = State.objects.all()
    serializer_class   = StateSerializer
    permission_classes = [IsAuthenticated]


class DistrictViewSet(viewsets.ModelViewSet):
    queryset           = District.objects.select_related("state").all()
    serializer_class   = DistrictSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields   = ["state"]


class SiteViewSet(viewsets.ModelViewSet):
    queryset = Site.objects.select_related("district__state").all()
    serializer_class   = SiteSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields   = ["district", "is_active"]
    search_fields      = ["name", "address"]

    @action(detail=True, methods=["get"], url_path="employees")
    def site_employees(self, request, pk=None):
        """Return active employees assigned to this site."""
        site = self.get_object()
        from apps.employees.models import Employee
        from apps.employees.serializers import EmployeeSerializer
        emps = Employee.objects.filter(
            site=site, status="active"
        ).order_by("designation", "full_name")
        serializer = EmployeeSerializer(emps, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="summary")
    def summary(self, request):
        """Aggregate totals across all sites."""
        from apps.attendance.models import Attendance
        from datetime import date
        sites = Site.objects.filter(is_active=True).annotate(
            dep=Count("employees", filter=Q(employees__status="active"))
        )
        total_sanctioned = sum(s.sanctioned_strength for s in sites)
        total_deployed   = sum(s.dep for s in sites)
        total_present    = Attendance.objects.filter(
            date=date.today(), status__in=["present", "late"]
        ).count()
        return Response({
            "total_sanctioned": total_sanctioned,
            "total_deployed":   total_deployed,
            "total_vacancy":    total_sanctioned - total_deployed,
            "total_present":    total_present,
            "fill_pct":         round(total_deployed / total_sanctioned * 100, 1) if total_sanctioned else 0,
            "att_pct":          round(total_present / total_deployed * 100, 1) if total_deployed else 0,
        })
