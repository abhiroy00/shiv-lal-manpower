from django.urls import path
from .views import NotificationListView, MarkReadView, MarkAllReadView

urlpatterns = [
    path("notifications/",              NotificationListView.as_view(), name="notifications"),
    path("notifications/read-all/",     MarkAllReadView.as_view(),      name="notifications_read_all"),
    path("notifications/<int:pk>/read/",MarkReadView.as_view(),         name="notification_read"),
]
