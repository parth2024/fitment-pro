from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import VCDBCategoryViewSet, FitmentJobViewSet, AIFitmentViewSet

router = DefaultRouter()
router.register(r'categories', VCDBCategoryViewSet)
router.register(r'jobs', FitmentJobViewSet)
router.register(r'ai-fitments', AIFitmentViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
