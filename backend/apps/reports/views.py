from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.common.permissions import IsAdminHR


class ReportListView(APIView):
    permission_classes = [IsAdminHR]

    def get(self, request):
        return Response({
            "reports": [
                {"key": "attendance", "label": "Monthly Attendance Register", "formats": ["xlsx", "pdf"]},
                {"key": "payroll", "label": "Payroll Statement", "formats": ["xlsx", "pdf"]},
                {"key": "pf_esi", "label": "PF / ESI Compliance", "formats": ["xlsx", "pdf"]},
                {"key": "deployment", "label": "District Deployment", "formats": ["xlsx", "pdf"]},
                {"key": "recruitment", "label": "Recruitment Status", "formats": ["xlsx", "pdf"]},
                {"key": "mis_pack", "label": "MIS Tender Pack", "formats": ["xlsx", "pdf"]},
            ]
        })
