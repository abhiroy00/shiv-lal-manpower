from django.contrib import admin
from .models import LeaveRequest


@admin.register(LeaveRequest)
class LeaveRequestAdmin(admin.ModelAdmin):
    list_display  = ("employee", "leave_type", "from_date", "to_date", "days", "status", "reviewed_by", "created_at")
    list_filter   = ("status", "leave_type", "from_date")
    search_fields = ("employee__emp_code", "employee__full_name", "reason")
    readonly_fields = ("reviewed_at", "created_at", "updated_at")
    ordering      = ("-created_at",)
