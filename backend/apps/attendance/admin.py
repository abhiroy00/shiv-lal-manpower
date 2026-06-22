from django.contrib import admin
from .models import Attendance


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ("employee", "date", "check_in_time", "status", "geofence_ok")
    list_filter = ("status", "geofence_ok", "date")
    search_fields = ("employee__emp_code", "employee__full_name")
    ordering = ("-date",)
