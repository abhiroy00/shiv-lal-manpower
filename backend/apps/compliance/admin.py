from django.contrib import admin
from .models import PFContribution, ESIContribution, ChallanRun

admin.site.register(PFContribution)
admin.site.register(ESIContribution)
admin.site.register(ChallanRun)
