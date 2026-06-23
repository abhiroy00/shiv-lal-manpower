from django.urls import path
from .views import (
    ReportListView,
    PayrollStatementView,
    AttendanceSummaryView,
    DeploymentStrengthView,
    DeductionRegisterView,
    RecruitmentStatusView,
    MISPackView,
)

urlpatterns = [
    path("reports/",                   ReportListView.as_view(),         name="report_list"),
    path("reports/payroll-statement/", PayrollStatementView.as_view(),   name="report_payroll"),
    path("reports/attendance-summary/",AttendanceSummaryView.as_view(),  name="report_attendance"),
    path("reports/deployment-strength/",DeploymentStrengthView.as_view(),name="report_deployment"),
    path("reports/deduction-register/",DeductionRegisterView.as_view(),  name="report_deduction"),
    path("reports/recruitment-status/",RecruitmentStatusView.as_view(),  name="report_recruitment"),
    path("reports/mis-pack/",          MISPackView.as_view(),             name="report_mis"),
]
