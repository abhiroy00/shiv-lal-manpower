from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Notification
        fields = ("id", "title", "body", "notif_type", "is_read", "ref_id", "created_at")
        read_only_fields = fields
