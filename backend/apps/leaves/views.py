from datetime import datetime, timezone as tz

from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.common.permissions import IsAdminHR
from .models import LeaveRequest
from .serializers import LeaveRequestSerializer


class LeaveViewSet(viewsets.ModelViewSet):
    serializer_class   = LeaveRequestSerializer
    permission_classes = [IsAuthenticated]
    http_method_names  = ["get", "post", "head", "options"]

    def get_queryset(self):
        user = self.request.user
        qs   = LeaveRequest.objects.select_related("employee", "reviewed_by").all()

        if user.role in ("admin", "hr"):
            status_param = self.request.query_params.get("status")
            if status_param:
                qs = qs.filter(status=status_param)
            return qs

        # Employee: own leaves only
        try:
            return qs.filter(employee=user.employee)
        except Exception:
            return LeaveRequest.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        try:
            emp = user.employee
        except Exception:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("No employee profile linked to your account.")
        serializer.save(employee=emp)

    @action(detail=False, methods=["get"], url_path="balance")
    def balance(self, request):
        user = request.user
        try:
            emp = user.employee
        except Exception:
            return Response({"balance": {}, "year": datetime.now().year})

        year = datetime.now().year
        approved = LeaveRequest.objects.filter(
            employee=emp,
            status="approved",
            from_date__year=year,
        )
        pending = LeaveRequest.objects.filter(
            employee=emp,
            status="pending",
            from_date__year=year,
        )

        def used_days(qs, lt):
            total = 0
            for r in qs.filter(leave_type=lt):
                total += r.days
            return total

        leave_types = ["cl", "sl", "el", "unpaid"]
        balance = {}
        for lt in leave_types:
            limit = LeaveRequest.ANNUAL_LIMITS.get(lt)
            balance[lt] = {
                "used":    used_days(approved, lt),
                "pending": used_days(pending,  lt),
                "limit":   limit,
            }

        return Response({"balance": balance, "year": year})

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, pk=None):
        leave = self.get_object()
        if leave.status != "pending":
            return Response(
                {"detail": "Only pending requests can be cancelled."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # Only the employee themselves (or admin/hr) can cancel
        user = request.user
        if user.role not in ("admin", "hr"):
            try:
                if leave.employee != user.employee:
                    return Response({"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)
            except Exception:
                return Response({"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)

        leave.status = "cancelled"
        leave.save()
        return Response(LeaveRequestSerializer(leave).data)

    @action(detail=True, methods=["post"], url_path="approve", permission_classes=[IsAdminHR])
    def approve(self, request, pk=None):
        leave = self.get_object()
        if leave.status != "pending":
            return Response(
                {"detail": "Only pending requests can be approved."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        leave.status      = "approved"
        leave.review_note = request.data.get("note", "")
        leave.reviewed_by = request.user
        leave.reviewed_at = datetime.now(tz.utc)
        leave.save()
        return Response(LeaveRequestSerializer(leave).data)

    @action(detail=True, methods=["post"], url_path="reject", permission_classes=[IsAdminHR])
    def reject(self, request, pk=None):
        leave = self.get_object()
        if leave.status != "pending":
            return Response(
                {"detail": "Only pending requests can be rejected."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        note = request.data.get("note", "").strip()
        if not note:
            return Response({"detail": "Rejection note is required."}, status=status.HTTP_400_BAD_REQUEST)

        leave.status      = "rejected"
        leave.review_note = note
        leave.reviewed_by = request.user
        leave.reviewed_at = datetime.now(tz.utc)
        leave.save()
        return Response(LeaveRequestSerializer(leave).data)

    @action(detail=False, methods=["post"], url_path="approve-all", permission_classes=[IsAdminHR])
    def approve_all(self, request):
        pending = LeaveRequest.objects.filter(status="pending")
        count = pending.count()
        if count == 0:
            return Response({"detail": "No pending leave requests.", "approved": 0})
        now = datetime.now(tz.utc)
        pending.update(
            status="approved",
            review_note=request.data.get("note", "Bulk approved"),
            reviewed_by=request.user,
            reviewed_at=now,
        )
        return Response({"detail": f"{count} leave request(s) approved.", "approved": count})
