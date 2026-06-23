from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (
    PFContributionViewSet, ESIContributionViewSet, ChallanRunViewSet,
    ComplianceSummaryView, GenerateChallanView, MarkFiledView,
    EPFChallanExportView, ESIChallanExportView,
)

router = DefaultRouter()
router.register("compliance/pf",       PFContributionViewSet, basename="pf")
router.register("compliance/esi",      ESIContributionViewSet, basename="esi")
router.register("compliance/challans", ChallanRunViewSet,      basename="challan")

urlpatterns = router.urls + [
    path("compliance/summary/",  ComplianceSummaryView.as_view(), name="compliance_summary"),
    path("compliance/generate/", GenerateChallanView.as_view(),   name="compliance_generate"),
    path("compliance/challans/<int:pk>/mark-filed/", MarkFiledView.as_view(), name="mark_filed"),
    path("compliance/epf-challan/", EPFChallanExportView.as_view(), name="epf_challan"),
    path("compliance/esi-challan/", ESIChallanExportView.as_view(), name="esi_challan"),
]
