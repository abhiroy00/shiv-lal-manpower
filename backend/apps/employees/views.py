from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Employee, EmployeeDocument
from .serializers import EmployeeSerializer, EmployeeListSerializer, EmployeeDocumentSerializer
from .filters import EmployeeFilter
from apps.common.permissions import IsAdminHR


class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.select_related("site__district__state").all()
    permission_classes = [IsAuthenticated]
    filterset_class = EmployeeFilter
    search_fields = ["emp_code", "full_name", "phone", "designation"]
    ordering_fields = ["full_name", "date_joined", "created_at"]
    ordering = ["-created_at"]

    def get_serializer_class(self):
        if self.action == "list":
            return EmployeeListSerializer
        return EmployeeSerializer

    @action(detail=True, methods=["get", "post"])
    def documents(self, request, pk=None):
        employee = self.get_object()
        if request.method == "POST":
            serializer = EmployeeDocumentSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer.save(employee=employee)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        docs = employee.documents.all()
        return Response(EmployeeDocumentSerializer(docs, many=True).data)
