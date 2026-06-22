from django.contrib import admin
from .models import Employee, EmployeeDocument


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ("emp_code", "full_name", "designation", "site", "status", "date_joined")
    list_filter = ("status", "designation", "site__district__state")
    search_fields = ("emp_code", "full_name", "phone")
    ordering = ("-created_at",)


admin.site.register(EmployeeDocument)
