from datetime import date, time
from apps.common.utils import is_inside_geofence
from .models import Attendance


def process_check_in(employee, lat, lng, selfie=None):
    site = employee.site
    geofence_ok = False
    if site and site.lat and site.lng:
        geofence_ok = is_inside_geofence(
            float(lat), float(lng),
            float(site.lat), float(site.lng),
            site.geofence_radius,
        )

    today = date.today()
    attendance, created = Attendance.objects.get_or_create(
        employee=employee,
        date=today,
        defaults={
            "site": site,
            "lat": lat,
            "lng": lng,
            "geofence_ok": geofence_ok,
            "selfie": selfie,
        },
    )

    if not created:
        return attendance, False

    from datetime import datetime
    from django.conf import settings
    now = datetime.now().time()
    h, m = getattr(settings, "LATE_THRESHOLD", (9, 30))
    late_threshold = time(h, m)
    # Always mark present/late on check-in regardless of geofence.
    # geofence_ok is saved as an informational flag visible in the admin panel.
    attendance.status = "late" if now > late_threshold else "present"

    attendance.check_in_time = now
    attendance.save()
    return attendance, True
