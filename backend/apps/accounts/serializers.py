from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()


class EmployeeDetailSerializer(serializers.Serializer):
    emp_code      = serializers.CharField()
    designation   = serializers.CharField()
    site_name     = serializers.SerializerMethodField()
    district_name = serializers.SerializerMethodField()
    state_name    = serializers.SerializerMethodField()
    date_joined   = serializers.DateField()
    date_of_birth = serializers.DateField()
    status        = serializers.CharField()
    uan           = serializers.CharField()
    esic_no       = serializers.CharField()
    pan           = serializers.CharField()
    aadhar        = serializers.CharField()
    bank_account  = serializers.CharField()
    ifsc          = serializers.CharField()
    address       = serializers.CharField()
    photo         = serializers.SerializerMethodField()

    def get_site_name(self, obj):
        return obj.site.name if obj.site else None

    def get_district_name(self, obj):
        try:
            return obj.site.district.name
        except Exception:
            return None

    def get_state_name(self, obj):
        try:
            return obj.site.district.state.name
        except Exception:
            return None

    def get_photo(self, obj):
        request = self.context.get("request")
        if obj.photo and request:
            return request.build_absolute_uri(obj.photo.url)
        return None


class UserSerializer(serializers.ModelSerializer):
    employee_detail = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "phone", "email", "full_name", "role", "is_active", "created_at", "employee_detail")
        read_only_fields = ("id", "created_at")

    def get_employee_detail(self, obj):
        if not obj.employee_id:
            return None
        try:
            return EmployeeDetailSerializer(obj.employee, context=self.context).data
        except Exception:
            return None


class UpdateProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("email", "full_name")

    def validate_email(self, value):
        qs = User.objects.filter(email=value).exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("This email is already in use.")
        return value


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate_old_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Old password is incorrect.")
        return value

    def save(self):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.save()


class PasswordResetRequestSerializer(serializers.Serializer):
    """Step 1 — user submits their registered email to receive a reset link."""
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Step 2 — user submits the uid+token from the email link plus a new password."""
    uid          = serializers.CharField()
    token        = serializers.CharField()
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate(self, attrs):
        from django.contrib.auth.tokens import default_token_generator
        from django.utils.http import urlsafe_base64_decode
        from django.utils.encoding import force_str

        try:
            uid  = force_str(urlsafe_base64_decode(attrs["uid"]))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            raise serializers.ValidationError({"uid": "Invalid reset link."})

        if not default_token_generator.check_token(user, attrs["token"]):
            raise serializers.ValidationError(
                {"token": "This reset link is invalid or has expired. Please request a new one."}
            )
        attrs["user"] = user
        return attrs

    def save(self):
        from django.utils import timezone
        user = self.validated_data["user"]
        user.set_password(self.validated_data["new_password"])
        user.password_changed_at = timezone.now()
        user.save(update_fields=["password", "password_changed_at"])
        return user
