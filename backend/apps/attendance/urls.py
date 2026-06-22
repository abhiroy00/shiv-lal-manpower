from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import AttendanceViewSet, CheckInView, TodaySummaryView

router = DefaultRouter()
router.register("attendance", AttendanceViewSet, basename="attendance")

urlpatterns = router.urls + [
    path("attendance/check-in/", CheckInView.as_view(), name="check_in"),
    path("attendance/today-summary/", TodaySummaryView.as_view(), name="today_summary"),
]
