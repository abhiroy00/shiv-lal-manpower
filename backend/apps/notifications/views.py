from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Notification
from .serializers import NotificationSerializer


class NotificationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs      = Notification.objects.filter(user=request.user)
        unread  = qs.filter(is_read=False).count()
        data    = NotificationSerializer(qs[:50], many=True).data
        return Response({"unread": unread, "results": data})


class MarkReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        updated = Notification.objects.filter(pk=pk, user=request.user).update(is_read=True)
        if not updated:
            return Response({"detail": "Not found."}, status=404)
        return Response({"detail": "Marked as read."})


class MarkAllReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({"detail": "All notifications marked as read."})
