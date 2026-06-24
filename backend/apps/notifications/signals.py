from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from apps.attendance.models import LeaveRequest
from apps.accounts.models import User
from .models import Notification


def _notify(user, title, body, notif_type, ref_id=None):
    Notification.objects.create(user=user, title=title, body=body,
                                 notif_type=notif_type, ref_id=ref_id)


# ── Track previous leave status so we only fire on actual change ──────────────

@receiver(pre_save, sender=LeaveRequest)
def _cache_leave_status(sender, instance, **kwargs):
    if instance.pk:
        try:
            instance._prev_status = LeaveRequest.objects.values_list(
                "status", flat=True
            ).get(pk=instance.pk)
        except LeaveRequest.DoesNotExist:
            instance._prev_status = None
    else:
        instance._prev_status = None


@receiver(post_save, sender=LeaveRequest)
def _on_leave_save(sender, instance, created, **kwargs):
    LEAVE_LABELS = {"cl": "Casual", "sl": "Sick", "el": "Earned", "unpaid": "Unpaid"}
    lt    = LEAVE_LABELS.get(instance.leave_type, instance.leave_type.upper())
    emp   = instance.employee
    dates = f"{instance.from_date} → {instance.to_date}"

    if created:
        # Notify all admin/HR users about the new leave application
        hr_users = User.objects.filter(role__in=("admin", "hr"), is_active=True)
        for u in hr_users:
            _notify(
                u,
                title=f"New leave request: {emp.full_name}",
                body=f"{emp.emp_code} applied for {lt} Leave ({dates}). Reason: {instance.reason[:80]}",
                notif_type="leave",
                ref_id=instance.pk,
            )
        return

    prev = getattr(instance, "_prev_status", None)
    if prev == instance.status:
        return

    # Notify the employee when their leave status changes
    try:
        employee_user = emp.user_account
    except Exception:
        return

    if instance.status == "approved":
        _notify(
            employee_user,
            title="Leave Approved",
            body=f"Your {lt} Leave ({dates}) has been approved.{' Note: ' + instance.review_note if instance.review_note else ''}",
            notif_type="leave",
            ref_id=instance.pk,
        )
    elif instance.status == "rejected":
        _notify(
            employee_user,
            title="Leave Rejected",
            body=f"Your {lt} Leave ({dates}) was rejected.{' Reason: ' + instance.review_note if instance.review_note else ''}",
            notif_type="leave",
            ref_id=instance.pk,
        )


# ── Payslip generated → notify employee ──────────────────────────────────────

def _connect_payslip_signal():
    try:
        from apps.payroll.models import Payslip
        import calendar

        @receiver(post_save, sender=Payslip)
        def _on_payslip_save(sender, instance, created, **kwargs):
            if not created:
                return
            try:
                emp_user = instance.employee.user_account
            except Exception:
                return
            month_name = calendar.month_name[instance.payroll_run.month]
            _notify(
                emp_user,
                title="Payslip Generated",
                body=f"Your payslip for {month_name} {instance.payroll_run.year} is ready. Net pay: ₹{instance.net_pay:,.0f}",
                notif_type="payslip",
                ref_id=instance.pk,
            )
    except Exception:
        pass  # payroll app may not be installed


_connect_payslip_signal()
