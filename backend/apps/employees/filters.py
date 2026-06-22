import django_filters
from .models import Employee


class EmployeeFilter(django_filters.FilterSet):
    district = django_filters.NumberFilter(field_name="site__district__id")
    state = django_filters.NumberFilter(field_name="site__district__state__id")

    class Meta:
        model = Employee
        fields = ["status", "designation", "site", "district", "state"]
