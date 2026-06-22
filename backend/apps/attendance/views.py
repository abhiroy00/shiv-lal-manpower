from datetime import date
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from .models import Attendance
from .serializers import AttendanceSerializer, CheckInSerializer
from .services import process_check_in
from apps.employees.models import Employee


class AttendanceViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Attendance.objects.select_related("employee", "site").all()
    serializer_class = AttendanceSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["employee", "date", "status", "site"]


class CheckInView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CheckInSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            employee = request.user.employee
        except Exception:
            return Response({"detail": "No employee linked to this account."}, status=400)

        selfie = serializer.validated_data.get("selfie")
        attendance, created = process_check_in(
            employee,
            serializer.validated_data["lat"],
            serializer.validated_data["lng"],
            selfie,
        )
        if not created:
            return Response({"detail": "Already checked in today."}, status=400)
        return Response(AttendanceSerializer(attendance).data, status=201)


class TodaySummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = date.today()
        total = Employee.objects.filter(status="active").count()
        present = Attendance.objects.filter(date=today, status__in=["present", "late"]).count()
        absent = total - present
        review = Attendance.objects.filter(date=today, status="review").count()
        return Response({
            "date": today,
            "total_active": total,
            "present": present,
            "absent": absent,
            "under_review": review,
        })
