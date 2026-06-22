from rest_framework.routers import DefaultRouter
from .views import PFContributionViewSet, ESIContributionViewSet, ChallanRunViewSet

router = DefaultRouter()
router.register("compliance/pf", PFContributionViewSet, basename="pf")
router.register("compliance/esi", ESIContributionViewSet, basename="esi")
router.register("compliance/challans", ChallanRunViewSet, basename="challan")
urlpatterns = router.urls
