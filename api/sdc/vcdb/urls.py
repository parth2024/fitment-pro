from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'makes', views.MakeViewSet)
router.register(r'models', views.ModelViewSet)
router.register(r'submodels', views.SubModelViewSet)
router.register(r'regions', views.RegionViewSet)
router.register(r'publication-stages', views.PublicationStageViewSet)
router.register(r'years', views.YearViewSet)
router.register(r'vehicle-type-groups', views.VehicleTypeGroupViewSet)
router.register(r'base-vehicles', views.BaseVehicleViewSet)
router.register(r'drive-types', views.DriveTypeViewSet)
router.register(r'fuel-types', views.FuelTypeViewSet)
router.register(r'body-num-doors', views.BodyNumDoorsViewSet)
router.register(r'body-types', views.BodyTypeViewSet)
router.register(r'body-style-configs', views.BodyStyleConfigViewSet)
router.register(r'engine-configs', views.EngineConfigViewSet)
router.register(r'vehicles', views.VehicleViewSet)
router.register(r'vehicle-to-drive-types', views.VehicleToDriveTypeViewSet)
router.register(r'vehicle-to-body-style-configs', views.VehicleToBodyStyleConfigViewSet)
router.register(r'vehicle-to-engine-configs', views.VehicleToEngineConfigViewSet)
router.register(r'sync-logs', views.VCDBSyncLogViewSet)

urlpatterns = [
    path('', include(router.urls)),
    # Legacy VCDB endpoints for backward compatibility
    path('version', views.version, name='vcdb-version'),
    path('year-range', views.year_range, name='vcdb-year-range'),
    path('configurations', views.configurations, name='vcdb-configurations'),
    path('property/<str:property_name>', views.property_values, name='vcdb-property'),
    # New VCDB endpoints for manual fitments
    path('vehicle-search', views.vehicle_search, name='vcdb-vehicle-search'),
    path('vehicle-dropdown-data', views.vehicle_dropdown_data, name='vcdb-vehicle-dropdown-data'),
]
