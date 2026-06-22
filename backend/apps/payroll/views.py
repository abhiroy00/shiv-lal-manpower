from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import SalaryStructure, PayrollRun, Payslip
from .serializers import SalaryStructureSerializer, PayrollRunSerializer, PayslipSerializer
from .services import run_payroll
from apps.common.permissions import IsAdminHR


class SalaryStructureViewSet(viewsets.ModelViewSet):
    queryset = SalaryStructure.objects.select_related("employee").all()
    serializer_class = SalaryStructureSerializer
    permission_classes = [IsAdminHR]


class PayrollRunViewSet(viewsets.ModelViewSet):
    queryset = PayrollRun.objects.all()
    serializer_class = PayrollRunSerializer
    permission_classes = [IsAdminHR]

    @action(detail=False, methods=["post"])
    def run(self, request):
        month = request.data.get("month")
        year = request.data.get("year")
        if not month or not year:
            return Response({"detail": "month and year are required."}, status=400)
        payroll_run = run_payroll(int(month), int(year), request.user)
        return Response(PayrollRunSerializer(payroll_run).data)


class PayslipViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Payslip.objects.select_related("employee", "payroll_run").all()
    serializer_class = PayslipSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["payroll_run", "employee"]
