from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProductConfigurationViewSet, ProductDataViewSet, ProductUploadViewSet

router = DefaultRouter()
router.register(r'config', ProductConfigurationViewSet)
router.register(r'data', ProductDataViewSet)
router.register(r'upload', ProductUploadViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
