import io
import zipfile
import calendar
from datetime import date
from django.http import HttpResponse
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from .models import SalaryStructure, PayrollRun, Payslip
from .serializers import SalaryStructureSerializer, PayrollRunSerializer, PayslipSerializer
from .services import run_payroll
from .pdf_service import generate_payslip_pdf
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
        year  = request.data.get("year")
        if not month or not year:
            return Response({"detail": "month and year are required."}, status=400)
        payroll_run, stats = run_payroll(int(month), int(year), request.user)
        data = PayrollRunSerializer(payroll_run).data
        data["stats"] = stats
        return Response(data)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        run = self.get_object()
        if run.run_status != PayrollRun.RunStatus.DRAFT:
            return Response({"detail": "Only draft payrolls can be approved."}, status=400)
        run.run_status = PayrollRun.RunStatus.APPROVED
        run.save()
        return Response(PayrollRunSerializer(run).data)

    @action(detail=True, methods=["post"], url_path="mark-paid")
    def mark_paid(self, request, pk=None):
        run = self.get_object()
        if run.run_status != PayrollRun.RunStatus.APPROVED:
            return Response({"detail": "Only approved payrolls can be marked paid."}, status=400)
        run.run_status = PayrollRun.RunStatus.PAID
        run.save()
        return Response(PayrollRunSerializer(run).data)

    @action(detail=True, methods=["get"], url_path="bank-advice")
    def bank_advice(self, request, pk=None):
        run = self.get_object()
        payslips = run.payslips.select_related(
            "employee__site__district__state"
        ).order_by("employee__emp_code")

        wb = Workbook()
        ws = wb.active
        ws.title = "Bank Advice"

        thin   = Side(style="thin", color="D0D7E5")
        bdr    = Border(left=thin, right=thin, top=thin, bottom=thin)
        ctr    = Alignment(horizontal="center", vertical="center")
        navy   = PatternFill("solid", fgColor="1E3563")
        nfont  = Font(name="Calibri", bold=True, color="FFFFFF", size=10)
        cfont  = Font(name="Calibri", size=10)
        bfont  = Font(name="Calibri", bold=True, size=10)
        mname  = calendar.month_name[run.month]

        # Title
        ws.merge_cells("A1:H1")
        t = ws["A1"]
        t.value     = f"BANK ADVICE – {mname.upper()} {run.year}"
        t.font      = Font(name="Calibri", bold=True, size=14, color="1E3563")
        t.alignment = Alignment(horizontal="center", vertical="center")
        ws.row_dimensions[1].height = 26

        ws.merge_cells("A2:H2")
        ws["A2"].value = f"Status: {run.run_status.upper()}   |   Generated: {date.today().strftime('%d %b %Y')}"
        ws["A2"].font  = Font(name="Calibri", size=9, color="6B7793")
        ws["A2"].alignment = Alignment(horizontal="center")

        HEADERS = [
            ("Sr",            6),
            ("Emp Code",     12),
            ("Employee Name", 26),
            ("Designation",  18),
            ("Site",         20),
            ("Bank Account", 20),
            ("IFSC Code",    14),
            ("Net Pay (₹)",  14),
        ]

        ws.row_dimensions[3].height = 20
        for ci, (label, width) in enumerate(HEADERS, start=1):
            c = ws.cell(row=3, column=ci, value=label)
            c.font = nfont; c.fill = navy; c.alignment = ctr; c.border = bdr
            ws.column_dimensions[get_column_letter(ci)].width = width

        total_net = 0
        for ri, slip in enumerate(payslips, start=4):
            alt  = (ri % 2 == 0)
            fill = PatternFill("solid", fgColor="F4F6FA") if alt else None
            emp  = slip.employee

            row_vals = [
                ri - 3,
                emp.emp_code,
                emp.full_name,
                emp.designation,
                emp.site.name if emp.site else "",
                emp.bank_account or "—",
                emp.ifsc        or "—",
                float(slip.net_pay),
            ]
            for ci, val in enumerate(row_vals, start=1):
                c = ws.cell(row=ri, column=ci, value=val)
                c.font = cfont; c.border = bdr
                if fill: c.fill = fill
                if ci == 1 or ci == 8: c.alignment = ctr
                if ci == 8:
                    c.number_format = '₹#,##0.00'
                    c.font = bfont
            total_net += float(slip.net_pay)

        # Totals row
        tot_row = len(payslips) + 4
        ws.cell(row=tot_row, column=7, value="TOTAL").font = bfont
        tc = ws.cell(row=tot_row, column=8, value=total_net)
        tc.font = Font(name="Calibri", bold=True, size=11, color="15966A")
        tc.number_format = '₹#,##0.00'
        tc.border = bdr; tc.alignment = ctr

        ws.freeze_panes = "A4"
        ws.auto_filter.ref = f"A3:H3"

        buf = io.BytesIO()
        wb.save(buf); buf.seek(0)
        fname = f"bank_advice_{run.year}_{run.month:02d}.xlsx"
        resp = HttpResponse(
            buf.read(),
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        resp["Content-Disposition"] = f'attachment; filename="{fname}"'
        return resp

    @action(detail=True, methods=["get"], url_path="payslips-zip")
    def payslips_zip(self, request, pk=None):
        """Bulk download all payslips for a run as a ZIP of PDFs."""
        run = self.get_object()
        payslips = run.payslips.select_related(
            "employee__site__district__state"
        ).order_by("employee__emp_code")

        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
            for slip in payslips:
                pdf_buf = generate_payslip_pdf(slip)
                fname   = f"{slip.employee.emp_code}_{run.year}_{run.month:02d}.pdf"
                zf.writestr(fname, pdf_buf.read())

        buf.seek(0)
        zip_name = f"payslips_{run.year}_{run.month:02d}.zip"
        resp = HttpResponse(buf.read(), content_type="application/zip")
        resp["Content-Disposition"] = f'attachment; filename="{zip_name}"'
        return resp


class PayslipViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Payslip.objects.select_related(
        "employee__site__district__state", "payroll_run"
    ).all()
    serializer_class = PayslipSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["payroll_run", "employee"]
    ordering = ["employee__emp_code"]

    @action(detail=True, methods=["get"], url_path="pdf")
    def pdf(self, request, pk=None):
        slip     = self.get_object()
        pdf_buf  = generate_payslip_pdf(slip)
        emp_code = slip.employee.emp_code
        fname    = f"payslip_{emp_code}_{slip.payroll_run.year}_{slip.payroll_run.month:02d}.pdf"
        resp = HttpResponse(pdf_buf.read(), content_type="application/pdf")
        resp["Content-Disposition"] = f'attachment; filename="{fname}"'
        # Never allow browser/proxy to cache payslip PDFs — data changes after re-runs
        resp["Cache-Control"] = "no-cache, no-store, must-revalidate"
        resp["Pragma"]        = "no-cache"
        resp["Expires"]       = "0"
        return resp


class MyPayslipsView(APIView):
    """Employee: own payslips list + optional detail."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        emp = request.user.employee
        if emp is None:
            return Response({"detail": "No employee linked."}, status=400)
        # Prefetch site to avoid extra query on emp.site.name
        from apps.employees.models import Employee as EmpModel
        emp = EmpModel.objects.select_related("site").get(pk=emp.pk)
        slips = (
            Payslip.objects
            .filter(employee=emp)
            .select_related("payroll_run")
            .order_by("-payroll_run__year", "-payroll_run__month")
        )
        MONTH_NAMES = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
        data = []
        for s in slips:
            m = s.payroll_run.month
            y = s.payroll_run.year
            data.append({
                "id":               s.id,
                "month":            m,
                "year":             y,
                "run_month":        m,
                "run_year":         y,
                "month_label":      f"{MONTH_NAMES[m]} {y}" if 1 <= m <= 12 else f"{m}/{y}",
                "run_status":       s.payroll_run.run_status,
                "emp_code":         emp.emp_code,
                "employee_name":    emp.full_name,
                "designation":      emp.designation,
                "site_name":        emp.site.name if emp.site else "",
                "bank_account":     emp.bank_account or "",
                "ifsc":             emp.ifsc or "",
                "present_days":     s.present_days,
                "working_days":     s.working_days,
                "basic":            str(s.basic),
                "hra":              str(s.hra),
                "da":               str(s.da),
                "other_allowances": str(s.other_allowances),
                "gross":            str(s.basic + s.hra + s.da + s.other_allowances),
                "bonus":            str(s.bonus),
                "pf_employee":      str(s.pf_employee),
                "esi_employee":     str(s.esi_employee),
                "tds":              str(s.tds),
                "other_deductions": str(s.other_deductions),
                "net_pay":          str(s.net_pay),
                "pdf_url":          request.build_absolute_uri(f"/api/payslips/{s.id}/pdf/"),
            })
        response = Response(data)
        response["Cache-Control"] = "no-cache, no-store, must-revalidate"
        return response
