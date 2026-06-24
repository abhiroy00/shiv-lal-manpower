from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (
    AttendanceViewSet, CheckInView, CheckOutView,
    TodaySummaryView, MyTodayView, MyAttendanceView,
    AttendanceMapView, LeaveRequestViewSet, LeaveBalanceView,
)

router = DefaultRouter()
router.register("attendance", AttendanceViewSet, basename="attendance")
router.register("leaves",     LeaveRequestViewSet, basename="leave")

urlpatterns = [
    # Custom views MUST come before router.urls so the router's
    # attendance/{pk}/ pattern doesn't swallow these named paths.
    path("attendance/check-in/",     CheckInView.as_view(),       name="check_in"),
    path("attendance/check-out/",    CheckOutView.as_view(),      name="check_out"),
    path("attendance/today-summary/",TodaySummaryView.as_view(), name="today_summary"),
    path("attendance/my-today/",     MyTodayView.as_view(),       name="my_today"),
    path("attendance/my/",           MyAttendanceView.as_view(),  name="my_attendance"),
    path("attendance/map/",          AttendanceMapView.as_view(), name="attendance_map"),
    path("leaves/balance/",          LeaveBalanceView.as_view(),  name="leave_balance"),
] + router.urls
