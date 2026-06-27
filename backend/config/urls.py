from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.views.static import serve
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/", include("apps.accounts.urls")),
    path("api/", include("apps.employees.urls")),
    path("api/", include("apps.deployment.urls")),
    path("api/", include("apps.attendance.urls")),
    path("api/", include("apps.payroll.urls")),
    path("api/", include("apps.compliance.urls")),
    path("api/", include("apps.recruitment.urls")),
    path("api/", include("apps.reports.urls")),
    path("api/", include("apps.dashboard.urls")),
    path("api/", include("apps.notifications.urls")),
    path("api/", include("apps.leaves.urls")),
    # Serve media files in production (nginx proxies /media/ to Django)
    re_path(r"^media/(?P<path>.*)$", serve, {"document_root": settings.MEDIA_ROOT}),
]
