from django.contrib import admin
from .models import State, District, Site

admin.site.register(State)
admin.site.register(District)

@admin.register(Site)
class SiteAdmin(admin.ModelAdmin):
    list_display = ("name", "district", "sanctioned_strength", "geofence_radius", "is_active")
    list_filter = ("is_active", "district__state")
    search_fields = ("name",)
