from rest_framework.routers import DefaultRouter
from .views import StateViewSet, DistrictViewSet, SiteViewSet

router = DefaultRouter()
router.register("states", StateViewSet, basename="state")
router.register("districts", DistrictViewSet, basename="district")
router.register("sites", SiteViewSet, basename="site")
urlpatterns = router.urls
