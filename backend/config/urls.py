from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
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
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
