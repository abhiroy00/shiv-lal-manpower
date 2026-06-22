from rest_framework.permissions import BasePermission


class IsAdminHR(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in ("admin", "hr")
        )


class IsSupervisor(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in ("admin", "hr", "supervisor")
        )


class IsSelf(BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj == request.user or request.user.role in ("admin", "hr")
