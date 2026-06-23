from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import SalaryStructureViewSet, PayrollRunViewSet, PayslipViewSet, MyPayslipsView

router = DefaultRouter()
router.register("salary-structures", SalaryStructureViewSet, basename="salary_structure")
router.register("payroll-runs", PayrollRunViewSet, basename="payroll_run")
router.register("payslips", PayslipViewSet, basename="payslip")

urlpatterns = router.urls + [
    path("my-payslips/", MyPayslipsView.as_view(), name="my_payslips"),
]
