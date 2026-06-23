from datetime import date, timedelta
from django.db.models import Count, Sum, Q, Avg
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.employees.models import Employee
from apps.attendance.models import Attendance
from apps.deployment.models import District, Site, State
from apps.payroll.models import PayrollRun, Payslip
from apps.compliance.models import ChallanRun


class DashboardKPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today     = date.today()
        month_start = today.replace(day=1)
        last_month  = (month_start - timedelta(days=1)).replace(day=1)

        # ── Headcount ─────────────────────────────────────────
        total_active = Employee.objects.filter(status="active").count()
        new_this_month = Employee.objects.filter(
            date_joined__gte=month_start, status="active"
        ).count()
        total_sites  = Site.objects.filter(is_active=True).count()
        total_states = State.objects.count()

        # ── Attendance today ───────────────────────────────────
        present_today = Attendance.objects.filter(
            date=today, status__in=["present", "late"]
        ).count()
        att_pct = round(present_today / total_active * 100, 1) if total_active else 0

        # ── Monthly attendance this month ──────────────────────
        month_att = Attendance.objects.filter(date__gte=month_start)
        month_present = month_att.filter(status__in=["present", "late"]).count()
        month_total   = month_att.count()
        month_att_pct = round(month_present / month_total * 100, 1) if month_total else 0

        # ── 30-day trend ───────────────────────────────────────
        trend = []
        for i in range(29, -1, -1):
            d   = today - timedelta(days=i)
            cnt = Attendance.objects.filter(
                date=d, status__in=["present", "late"]
            ).count()
            trend.append({"date": str(d), "day": d.strftime("%d %b"), "present": cnt})

        # ── Site-wise headcount (top 10 by deployed strength) ──
        sites_qs = (
            Site.objects.filter(is_active=True)
            .annotate(deployed=Count("employees", filter=Q(employees__status="active")))
            .order_by("-deployed")[:10]
        )
        site_chart = []
        for s in sites_qs:
            fill_pct = round(s.deployed / s.sanctioned_strength * 100) if s.sanctioned_strength else 0
            site_chart.append({
                "name":       s.name[:22],
                "deployed":   s.deployed,
                "sanctioned": s.sanctioned_strength,
                "fill_pct":   min(fill_pct, 100),
            })

        # ── Designation breakdown ──────────────────────────────
        categories = list(
            Employee.objects.filter(status="active")
            .values("designation")
            .annotate(count=Count("id"))
            .order_by("-count")[:8]
        )
        max_cat = categories[0]["count"] if categories else 1

        # ── Latest payroll run ─────────────────────────────────
        latest_run = PayrollRun.objects.order_by("-year", "-month").first()
        payroll_summary = None
        if latest_run:
            payroll_summary = {
                "month_label":    f"{_mname(latest_run.month)} {latest_run.year}",
                "run_status":     latest_run.run_status,
                "employees":      latest_run.payslips.count(),
                "total_gross":    float(latest_run.payslips.aggregate(s=Sum("basic") + Sum("hra") + Sum("da") + Sum("other_allowances"))["s"] or 0),
                "total_net":      float(latest_run.payslips.aggregate(s=Sum("net_pay"))["s"] or 0),
                "total_pf_emp":   float(latest_run.payslips.aggregate(s=Sum("pf_employee"))["s"] or 0),
                "total_esi_emp":  float(latest_run.payslips.aggregate(s=Sum("esi_employee"))["s"] or 0),
            }

        # ── Compliance liability (latest challans) ─────────────
        latest_pf = ChallanRun.objects.filter(challan_type="epf").order_by("-id").first()
        latest_esi = ChallanRun.objects.filter(challan_type="esi").order_by("-id").first()
        compliance = {
            "pf_total":  float(latest_pf.total_amount)  if latest_pf  else 0,
            "esi_total": float(latest_esi.total_amount) if latest_esi else 0,
            "pf_filed":  latest_pf.is_filed  if latest_pf  else False,
            "esi_filed": latest_esi.is_filed if latest_esi else False,
        }

        return Response({
            # Headcount KPIs
            "total_manpower":    total_active,
            "new_this_month":    new_this_month,
            "total_sites":       total_sites,
            "total_states":      total_states,
            # Attendance KPIs
            "present_today":     present_today,
            "absent_today":      total_active - present_today,
            "attendance_pct":    att_pct,
            "month_att_pct":     month_att_pct,
            # Charts
            "trend":             trend,
            "site_chart":        site_chart,
            "categories":        categories,
            "max_category":      max_cat,
            # Cards
            "payroll":           payroll_summary,
            "compliance":        compliance,
        })


def _mname(m):
    import calendar
    return calendar.month_name[m]
