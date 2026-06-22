from rest_framework.routers import DefaultRouter
from .views import SalaryStructureViewSet, PayrollRunViewSet, PayslipViewSet

router = DefaultRouter()
router.register("salary-structures", SalaryStructureViewSet, basename="salary_structure")
router.register("payroll-runs", PayrollRunViewSet, basename="payroll_run")
router.register("payslips", PayslipViewSet, basename="payslip")
urlpatterns = router.urls
