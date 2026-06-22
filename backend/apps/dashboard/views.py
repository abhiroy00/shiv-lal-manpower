from datetime import date, timedelta
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.employees.models import Employee
from apps.attendance.models import Attendance
from apps.deployment.models import District, Site


class DashboardKPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = date.today()
        total = Employee.objects.filter(status="active").count()
        present = Attendance.objects.filter(date=today, status__in=["present", "late"]).count()
        absent = total - present
        districts = District.objects.count()

        # Trend: last 7 days
        trend = []
        for i in range(6, -1, -1):
            d = today - timedelta(days=i)
            cnt = Attendance.objects.filter(date=d, status__in=["present", "late"]).count()
            trend.append({"date": str(d), "present": cnt})

        # Category split
        from django.db.models import Count
        categories = (
            Employee.objects.filter(status="active")
            .values("designation")
            .annotate(count=Count("id"))
            .order_by("-count")[:6]
        )

        return Response({
            "total_manpower": total,
            "present_today": present,
            "absent_today": absent,
            "attendance_pct": round(present / total * 100, 1) if total else 0,
            "active_districts": districts,
            "trend": trend,
            "categories": list(categories),
        })
