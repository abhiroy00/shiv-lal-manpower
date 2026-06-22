from rest_framework.routers import DefaultRouter
from .views import RequisitionViewSet, CandidateViewSet

router = DefaultRouter()
router.register("requisitions", RequisitionViewSet, basename="requisition")
router.register("candidates", CandidateViewSet, basename="candidate")
urlpatterns = router.urls
