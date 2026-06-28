from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import get_user_model
from django.conf import settings
from django.utils import timezone
import logging
from .serializers import (
    UserSerializer, UpdateProfileSerializer, ChangePasswordSerializer,
    PasswordResetRequestSerializer, PasswordResetConfirmSerializer,
)
from apps.common.permissions import IsAdminHR

User = get_user_model()
logger = logging.getLogger("accounts.password_reset")


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user, context={"request": request}).data)

    def patch(self, request):
        serializer = UpdateProfileSerializer(
            request.user, data=request.data, partial=True,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(request.user, context={"request": request}).data)


class UserListView(generics.ListCreateAPIView):
    queryset = User.objects.all().order_by("-created_at")
    serializer_class = UserSerializer
    permission_classes = [IsAdminHR]


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        request.user.password_changed_at = timezone.now()
        request.user.save(update_fields=["password_changed_at"])
        return Response({"detail": "Password updated."}, status=status.HTTP_200_OK)


class PasswordResetRequestView(APIView):
    """Public: send a password-reset email containing a tokenized link.
    Always returns a generic success message so the endpoint can't be used to
    enumerate which emails are registered.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].strip()

        generic = {"detail": "If an account with that email exists, a password reset link has been sent."}

        users = list(User.objects.filter(email__iexact=email, is_active=True))
        if not users:
            logger.info("[reset] requested for unknown/inactive email=%s", email)
            return Response(generic)

        from django.contrib.auth.tokens import default_token_generator
        from django.utils.http import urlsafe_base64_encode
        from django.utils.encoding import force_bytes
        from django.core.mail import send_mail

        frontend = getattr(settings, "FRONTEND_URL", "").rstrip("/")
        sent = 0
        for user in users:
            uid   = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            link  = f"{frontend}/reset-password?uid={uid}&token={token}"
            subject = "Reset your Shiv Lal Manpower password"
            message = (
                f"Hello {user.full_name or 'there'},\n\n"
                f"We received a request to reset the password for your Shiv Lal Manpower "
                f"account ({user.role}).\n\n"
                f"Click the link below to set a new password:\n{link}\n\n"
                f"This link will expire in {getattr(settings, 'PASSWORD_RESET_TIMEOUT', 7200) // 3600} hour(s). "
                f"If you did not request this, you can safely ignore this email — your password will not change.\n\n"
                f"— Shiv Lal Manpower Portal"
            )
            try:
                send_mail(
                    subject, message,
                    getattr(settings, "DEFAULT_FROM_EMAIL", None),
                    [user.email],
                    fail_silently=False,
                )
                sent += 1
                logger.info("[reset] email sent to user_id=%s email=%s", user.id, user.email)
            except Exception:
                import traceback
                logger.error("[reset] FAILED to send to user_id=%s:\n%s", user.id, traceback.format_exc())

        return Response(generic)


class PasswordResetConfirmView(APIView):
    """Public: validate the uid+token and set the new password."""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        logger.info("[reset] password changed for user_id=%s", user.id)
        return Response({"detail": "Your password has been reset. You can now sign in."})
