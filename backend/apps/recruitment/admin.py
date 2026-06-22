from django.contrib import admin
from .models import Requisition, Candidate

admin.site.register(Requisition)

@admin.register(Candidate)
class CandidateAdmin(admin.ModelAdmin):
    list_display = ("full_name", "designation", "stage", "phone")
    list_filter = ("stage",)
    search_fields = ("full_name", "phone")
