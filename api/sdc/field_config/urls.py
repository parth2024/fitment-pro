from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FieldConfigurationViewSet, FieldConfigurationHistoryViewSet

router = DefaultRouter()
router.register(r'fields', FieldConfigurationViewSet, basename='field-configuration')
router.register(r'history', FieldConfigurationHistoryViewSet, basename='field-configuration-history')

urlpatterns = [
    path('', include(router.urls)),
]
