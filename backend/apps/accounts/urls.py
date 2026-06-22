from django.urls import path
from .views import MeView, UserListView, ChangePasswordView

urlpatterns = [
    path("auth/me/", MeView.as_view(), name="me"),
    path("auth/change-password/", ChangePasswordView.as_view(), name="change_password"),
    path("users/", UserListView.as_view(), name="user_list"),
]
