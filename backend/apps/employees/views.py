import io
from datetime import date
from django.http import HttpResponse
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from .models import Employee, EmployeeDocument
from .serializers import EmployeeSerializer, EmployeeListSerializer, EmployeeDocumentSerializer
from .filters import EmployeeFilter
from apps.common.permissions import IsAdminHR


class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.select_related("site__district__state").all()
    permission_classes = [IsAuthenticated]
    filterset_class = EmployeeFilter
    search_fields = ["emp_code", "full_name", "phone", "designation"]
    ordering_fields = ["full_name", "date_joined", "created_at"]
    ordering = ["-created_at"]

    def get_serializer_class(self):
        if self.action == "list":
            return EmployeeListSerializer
        return EmployeeSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        employee = serializer.save()

        from apps.accounts.models import User
        credentials = None
        if not User.objects.filter(phone=employee.phone).exists():
            User.objects.create_user(
                phone=employee.phone,
                password=employee.phone,
                full_name=employee.full_name,
                role="employee",
                employee=employee,
            )
            credentials = {
                "phone": employee.phone,
                "default_password": employee.phone,
            }

        data = EmployeeSerializer(employee, context={"request": request}).data
        if credentials:
            data["credentials"] = credentials
        return Response(data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="reset-password",
            permission_classes=[IsAdminHR])
    def reset_password(self, request, pk=None):
        employee = self.get_object()
        from apps.accounts.models import User
        try:
            user = employee.user_account
        except Exception:
            return Response({"detail": "No login account found for this employee."}, status=400)
        user.set_password(employee.phone)
        user.save()
        return Response({
            "detail": "Password reset successfully.",
            "phone": employee.phone,
            "default_password": employee.phone,
        })

    @action(detail=True, methods=["post"], url_path="transfer")
    def transfer(self, request, pk=None):
        """Move employee to a different site. Body: { site_id }"""
        employee = self.get_object()
        site_id  = request.data.get("site_id")
        from apps.deployment.models import Site
        if site_id:
            try:
                site = Site.objects.get(pk=site_id)
            except Site.DoesNotExist:
                return Response({"detail": "Site not found."}, status=400)
            employee.site = site
        else:
            employee.site = None
        employee.save()
        return Response(EmployeeSerializer(employee).data)

    @action(detail=False, methods=["post"], url_path="bulk-transfer")
    def bulk_transfer(self, request):
        """Move multiple employees to a site. Body: { employee_ids: [], site_id }"""
        emp_ids = request.data.get("employee_ids", [])
        site_id = request.data.get("site_id")
        from apps.deployment.models import Site
        try:
            site = Site.objects.get(pk=site_id) if site_id else None
        except Site.DoesNotExist:
            return Response({"detail": "Site not found."}, status=400)
        updated = Employee.objects.filter(pk__in=emp_ids).update(site=site)
        return Response({"transferred": updated, "site": site.name if site else None})

    @action(detail=False, methods=["get"], url_path="export")
    def export(self, request):
        qs = self.filter_queryset(
            Employee.objects.select_related("site__district__state").all()
        )

        wb = Workbook()
        ws = wb.active
        ws.title = "Employees"

        # ── Styles ──────────────────────────────────────────────
        hdr_fill  = PatternFill("solid", fgColor="1E3563")
        hdr_font  = Font(name="Calibri", bold=True, color="FFFFFF", size=11)
        hdr_align = Alignment(horizontal="center", vertical="center", wrap_text=True)
        thin      = Side(style="thin", color="D0D7E5")
        cell_border = Border(left=thin, right=thin, top=thin, bottom=thin)
        alt_fill  = PatternFill("solid", fgColor="F4F6FA")
        date_align = Alignment(horizontal="center")

        HEADERS = [
            ("Emp Code",     14),
            ("Full Name",    22),
            ("Designation",  20),
            ("Phone",        14),
            ("Site",         24),
            ("District",     18),
            ("State",        14),
            ("Date Joined",  14),
            ("Status",       12),
            ("UAN",          16),
            ("ESIC No",      16),
            ("Aadhar",       15),
            ("PAN",          13),
            ("Bank Account", 20),
            ("IFSC",         13),
        ]

        # Header row
        ws.row_dimensions[1].height = 30
        for col, (label, width) in enumerate(HEADERS, start=1):
            cell = ws.cell(row=1, column=col, value=label)
            cell.font  = hdr_font
            cell.fill  = hdr_fill
            cell.alignment = hdr_align
            cell.border = cell_border
            ws.column_dimensions[get_column_letter(col)].width = width

        # Data rows
        STATUS_MAP = {"active": "Active", "on_leave": "On Leave", "inactive": "Inactive"}

        for row_idx, emp in enumerate(qs, start=2):
            is_alt = (row_idx % 2 == 0)
            fill   = alt_fill if is_alt else None

            row_data = [
                emp.emp_code,
                emp.full_name,
                emp.designation,
                emp.phone,
                emp.site.name           if emp.site else "",
                emp.site.district.name  if emp.site and emp.site.district else "",
                emp.site.district.state.name if emp.site and emp.site.district and emp.site.district.state else "",
                emp.date_joined,
                STATUS_MAP.get(emp.status, emp.status),
                emp.uan,
                emp.esic_no,
                emp.aadhar,
                emp.pan,
                emp.bank_account,
                emp.ifsc,
            ]

            for col, value in enumerate(row_data, start=1):
                cell = ws.cell(row=row_idx, column=col, value=value)
                cell.border = cell_border
                if fill:
                    cell.fill = fill
                if isinstance(value, date):
                    cell.number_format = "DD-MMM-YYYY"
                    cell.alignment = date_align

        # Freeze header row
        ws.freeze_panes = "A2"

        # Auto-filter
        ws.auto_filter.ref = f"A1:{get_column_letter(len(HEADERS))}1"

        # Summary sheet
        ws2 = wb.create_sheet("Summary")
        ws2["A1"] = "Shiv Lal Manpower – Employee Export"
        ws2["A1"].font = Font(name="Calibri", bold=True, size=14, color="1E3563")
        ws2["A3"] = f"Generated on: {date.today().strftime('%d %b %Y')}"
        ws2["A4"] = f"Total records: {qs.count()}"
        ws2["A5"] = f"Filters applied: {dict(request.query_params) or 'None'}"

        # Stream response
        buf = io.BytesIO()
        wb.save(buf)
        buf.seek(0)

        filename = f"employees_{date.today().strftime('%Y%m%d')}.xlsx"
        response = HttpResponse(
            buf.read(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response

    @action(detail=True, methods=["get", "post"])
    def documents(self, request, pk=None):
        employee = self.get_object()
        if request.method == "POST":
            serializer = EmployeeDocumentSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer.save(employee=employee)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        docs = employee.documents.all()
        return Response(EmployeeDocumentSerializer(docs, many=True).data)
