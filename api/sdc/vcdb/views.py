from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db.models import Q, Prefetch
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)

from .models import (
    Make, Model, SubModel, Region, PublicationStage, Year, BaseVehicle, DriveType, FuelType,
    BodyNumDoors, BodyType, BodyStyleConfig, EngineConfig, Vehicle,
    VehicleToDriveType, VehicleToBodyStyleConfig, VehicleToEngineConfig,
    VCDBSyncLog
)
from .serializers import (
    MakeSerializer, ModelSerializer, SubModelSerializer, RegionSerializer, PublicationStageSerializer, YearSerializer,
    BaseVehicleSerializer, DriveTypeSerializer, FuelTypeSerializer, BodyNumDoorsSerializer, BodyTypeSerializer,
    BodyStyleConfigSerializer, EngineConfigSerializer, VehicleSerializer,
    VehicleToDriveTypeSerializer, VehicleToBodyStyleConfigSerializer, VehicleToEngineConfigSerializer,
    VCDBSyncLogSerializer, VehicleSearchSerializer, VehicleSearchResultSerializer
)
from .tasks import sync_vcdb_data_task, check_vcdb_sync_status
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator


class MakeViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Make.objects.all()
    serializer_class = MakeSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['culture_id']
    search_fields = ['make_name']
    ordering_fields = ['make_name', 'make_id']
    ordering = ['make_name']


class ModelViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Model.objects.all()
    serializer_class = ModelSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['vehicle_type_id', 'culture_id']
    search_fields = ['model_name']
    ordering_fields = ['model_name', 'model_id']
    ordering = ['model_name']


class SubModelViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SubModel.objects.all()
    serializer_class = SubModelSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['culture_id']
    search_fields = ['sub_model_name']
    ordering_fields = ['sub_model_name', 'sub_model_id']
    ordering = ['sub_model_name']


class RegionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Region.objects.all()
    serializer_class = RegionSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['culture_id', 'parent_id']
    search_fields = ['region_name', 'region_abbr']
    ordering_fields = ['region_name', 'region_id']
    ordering = ['region_name']


class PublicationStageViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = PublicationStage.objects.all()
    serializer_class = PublicationStageSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['culture_id']
    search_fields = ['publication_stage_name']
    ordering_fields = ['publication_stage_name', 'publication_stage_id']
    ordering = ['publication_stage_name']


class YearViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Year.objects.all()
    serializer_class = YearSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['year_id']
    ordering_fields = ['year_id']
    ordering = ['year_id']


class DriveTypeViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = DriveType.objects.all()
    serializer_class = DriveTypeSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['culture_id']
    search_fields = ['drive_type_name']
    ordering_fields = ['drive_type_name', 'drive_type_id']
    ordering = ['drive_type_name']


class FuelTypeViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = FuelType.objects.all()
    serializer_class = FuelTypeSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['culture_id']
    search_fields = ['fuel_type_name']
    ordering_fields = ['fuel_type_name', 'fuel_type_id']
    ordering = ['fuel_type_name']


class BodyNumDoorsViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = BodyNumDoors.objects.all()
    serializer_class = BodyNumDoorsSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['culture_id']
    search_fields = ['body_num_doors']
    ordering_fields = ['body_num_doors', 'body_num_doors_id']
    ordering = ['body_num_doors']


class BodyTypeViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = BodyType.objects.all()
    serializer_class = BodyTypeSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['culture_id']
    search_fields = ['body_type_name']
    ordering_fields = ['body_type_name', 'body_type_id']
    ordering = ['body_type_name']


class BaseVehicleViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = BaseVehicle.objects.select_related('make_id', 'model_id').all()
    serializer_class = BaseVehicleSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['year_id', 'make_id', 'model_id']
    search_fields = ['make_id__make_name', 'model_id__model_name']
    ordering_fields = ['year_id', 'make_id__make_name', 'model_id__model_name']
    ordering = ['year_id', 'make_id__make_name', 'model_id__model_name']


class BodyStyleConfigViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = BodyStyleConfig.objects.select_related('body_type_id', 'body_num_doors_id').all()
    serializer_class = BodyStyleConfigSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['body_type_id', 'body_num_doors_id']
    search_fields = ['body_type_id__body_type_name', 'body_num_doors_id__body_num_doors']
    ordering_fields = ['body_style_config_id']
    ordering = ['body_style_config_id']


class EngineConfigViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = EngineConfig.objects.select_related('fuel_type_id').all()
    serializer_class = EngineConfigSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['fuel_type_id']
    search_fields = ['fuel_type_id__fuel_type_name']
    ordering_fields = ['engine_config_id']
    ordering = ['engine_config_id']


class VehicleViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Vehicle.objects.select_related(
        'base_vehicle_id__make_id',
        'base_vehicle_id__model_id',
        'sub_model_id'
    ).all()
    serializer_class = VehicleSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['region_id', 'source', 'base_vehicle_id__year_id', 'base_vehicle_id__make_id', 'base_vehicle_id__model_id']
    search_fields = [
        'base_vehicle_id__make_id__make_name',
        'base_vehicle_id__model_id__model_name',
        'sub_model_id__sub_model_name'
    ]
    ordering_fields = ['vehicle_id', 'base_vehicle_id__year_id']
    ordering = ['base_vehicle_id__year_id', 'base_vehicle_id__make_id__make_name', 'base_vehicle_id__model_id__model_name']
    
    @action(detail=False, methods=['post'])
    def search(self, request):
        """Advanced vehicle search with multiple criteria"""
        serializer = VehicleSearchSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        queryset = self.get_queryset()
        
        # Apply filters
        if data.get('make'):
            queryset = queryset.filter(
                base_vehicle_id__make_id__make_name__icontains=data['make']
            )
        
        if data.get('model'):
            queryset = queryset.filter(
                base_vehicle_id__model_id__model_name__icontains=data['model']
            )
        
        if data.get('year'):
            queryset = queryset.filter(base_vehicle_id__year_id=data['year'])
        
        if data.get('sub_model'):
            queryset = queryset.filter(
                sub_model_id__sub_model_name__icontains=data['sub_model']
            )
        
        # Get related data for each vehicle
        results = []
        for vehicle in queryset[:100]:  # Limit to 100 results
            # Get drive types
            drive_types = VehicleToDriveType.objects.filter(
                vehicle_id=vehicle
            ).select_related('drive_type_id').values_list(
                'drive_type_id__drive_type_name', flat=True
            ).distinct()
            
            # Get fuel types through engine configs
            fuel_types = VehicleToEngineConfig.objects.filter(
                vehicle_id=vehicle
            ).select_related('engine_config_id__fuel_type_id').values_list(
                'engine_config_id__fuel_type_id__fuel_type_name', flat=True
            ).distinct()
            
            # Get body types and num doors
            body_style_configs = VehicleToBodyStyleConfig.objects.filter(
                vehicle_id=vehicle
            ).select_related('body_style_config_id__body_type_id', 'body_style_config_id__body_num_doors_id')
            
            body_types = []
            num_doors = []
            for config in body_style_configs:
                body_types.append(config.body_style_config_id.body_type_id.body_type_name)
                num_doors.append(config.body_style_config_id.body_num_doors_id.body_num_doors)
            
            result_data = {
                'vehicle_id': vehicle.vehicle_id,
                'make': vehicle.base_vehicle_id.make_id.make_name,
                'model': vehicle.base_vehicle_id.model_id.model_name,
                'year': vehicle.base_vehicle_id.year_id,
                'sub_model': vehicle.sub_model_id.sub_model_name,
                'drive_types': list(drive_types),
                'fuel_types': list(fuel_types),
                'body_types': list(set(body_types)),
                'num_doors': list(set(num_doors)),
            }
            
            # Apply additional filters if specified
            if data.get('drive_type') and data['drive_type'] not in result_data['drive_types']:
                continue
            if data.get('fuel_type') and data['fuel_type'] not in result_data['fuel_types']:
                continue
            if data.get('body_type') and data['body_type'] not in result_data['body_types']:
                continue
            if data.get('num_doors') and str(data['num_doors']) not in result_data['num_doors']:
                continue
            
            results.append(result_data)
        
        result_serializer = VehicleSearchResultSerializer(results, many=True)
        return Response(result_serializer.data)


class VehicleToDriveTypeViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = VehicleToDriveType.objects.select_related(
        'vehicle_id__base_vehicle_id__make_id',
        'vehicle_id__base_vehicle_id__model_id',
        'vehicle_id__sub_model_id',
        'drive_type_id'
    ).all()
    serializer_class = VehicleToDriveTypeSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['vehicle_id', 'drive_type_id', 'source']
    search_fields = [
        'vehicle_id__base_vehicle_id__make_id__make_name',
        'vehicle_id__base_vehicle_id__model_id__model_name',
        'drive_type_id__drive_type_name'
    ]
    ordering_fields = ['vehicle_to_drive_type_id']
    ordering = ['vehicle_to_drive_type_id']


class VehicleToBodyStyleConfigViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = VehicleToBodyStyleConfig.objects.select_related(
        'vehicle_id__base_vehicle_id__make_id',
        'vehicle_id__base_vehicle_id__model_id',
        'vehicle_id__sub_model_id',
        'body_style_config_id__body_type_id',
        'body_style_config_id__body_num_doors_id'
    ).all()
    serializer_class = VehicleToBodyStyleConfigSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['vehicle_id', 'body_style_config_id', 'source']
    search_fields = [
        'vehicle_id__base_vehicle_id__make_id__make_name',
        'vehicle_id__base_vehicle_id__model_id__model_name',
        'body_style_config_id__body_type_id__body_type_name'
    ]
    ordering_fields = ['vehicle_to_body_style_config_id']
    ordering = ['vehicle_to_body_style_config_id']


class VehicleToEngineConfigViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = VehicleToEngineConfig.objects.select_related(
        'vehicle_id__base_vehicle_id__make_id',
        'vehicle_id__base_vehicle_id__model_id',
        'vehicle_id__sub_model_id',
        'engine_config_id__fuel_type_id'
    ).all()
    serializer_class = VehicleToEngineConfigSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['vehicle_id', 'engine_config_id', 'source']
    search_fields = [
        'vehicle_id__base_vehicle_id__make_id__make_name',
        'vehicle_id__base_vehicle_id__model_id__model_name',
        'engine_config_id__fuel_type_id__fuel_type_name'
    ]
    ordering_fields = ['vehicle_to_engine_config_id']
    ordering = ['vehicle_to_engine_config_id']


class VCDBSyncLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = VCDBSyncLog.objects.all()
    serializer_class = VCDBSyncLogSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['status']
    ordering_fields = ['started_at', 'completed_at']
    ordering = ['-started_at']
    
    @action(detail=False, methods=['post'])
    def trigger_sync(self, request):
        """Trigger a manual VCDB data sync"""
        try:
            # Start the sync task
            task = sync_vcdb_data_task.delay(force=True)
            
            return Response({
                'status': 'success',
                'message': 'VCDB sync task started',
                'task_id': task.id
            }, status=status.HTTP_202_ACCEPTED)
            
        except Exception as e:
            return Response({
                'status': 'error',
                'message': f'Failed to start VCDB sync: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def status(self, request):
        """Get VCDB sync status and data counts"""
        try:
            # Get sync status from Celery task
            status_task = check_vcdb_sync_status.delay()
            status_result = status_task.get(timeout=10)
            
            return Response(status_result)
            
        except Exception as e:
            return Response({
                'status': 'error',
                'message': f'Failed to get VCDB status: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Legacy VCDB endpoints for backward compatibility
@require_http_methods(["GET"])
def version(request):
    """Legacy VCDB version endpoint"""
    return JsonResponse({
        'version': '2.0',
        'source': 'AutoCare API',
        'last_updated': timezone.now().isoformat()
    })


@require_http_methods(["GET"])
def year_range(request):
    """Legacy VCDB year range endpoint"""
    try:
        # Get year range from BaseVehicle data
        years = BaseVehicle.objects.values_list('year_id', flat=True).distinct().order_by('year_id')
        
        if years:
            min_year = min(years)
            max_year = max(years)
        else:
            # Fallback to default range if no data
            min_year = 2010
            max_year = 2025
        
        return JsonResponse({
            'min': min_year,
            'max': max_year,
            'total_years': len(years) if years else 0
        })
    except Exception as e:
        logger.error(f'Error getting year range: {str(e)}')
        return JsonResponse({
            'min': 2010,
            'max': 2025,
            'error': str(e)
        })


@require_http_methods(["GET"])
def configurations(request):
    """Legacy VCDB configurations endpoint"""
    try:
        # Get configuration data from various VCDB tables
        makes = Make.objects.values_list('make_name', flat=True).distinct().order_by('make_name')
        models = Model.objects.values_list('model_name', flat=True).distinct().order_by('model_name')
        drive_types = DriveType.objects.values_list('drive_type_name', flat=True).distinct().order_by('drive_type_name')
        fuel_types = FuelType.objects.values_list('fuel_type_name', flat=True).distinct().order_by('fuel_type_name')
        body_types = BodyType.objects.values_list('body_type_name', flat=True).distinct().order_by('body_type_name')
        
        return JsonResponse({
            'makes': list(makes),
            'models': list(models),
            'drive_types': list(drive_types),
            'fuel_types': list(fuel_types),
            'body_types': list(body_types),
            'total_makes': len(makes),
            'total_models': len(models),
            'total_drive_types': len(drive_types),
            'total_fuel_types': len(fuel_types),
            'total_body_types': len(body_types)
        })
    except Exception as e:
        logger.error(f'Error getting configurations: {str(e)}')
        return JsonResponse({
            'error': str(e),
            'makes': [],
            'models': [],
            'drive_types': [],
            'fuel_types': [],
            'body_types': []
        })


@require_http_methods(["GET"])
def property_values(request, property_name):
    """Legacy VCDB property endpoint"""
    try:
        # Map property names to model fields
        property_mapping = {
            'make': ('Make', 'make_name'),
            'model': ('Model', 'model_name'),
            'year': ('BaseVehicle', 'year_id'),
            'submodel': ('SubModel', 'sub_model_name'),
            'drive_type': ('DriveType', 'drive_type_name'),
            'fuel_type': ('FuelType', 'fuel_type_name'),
            'body_type': ('BodyType', 'body_type_name'),
            'num_doors': ('BodyNumDoors', 'body_num_doors'),
        }
        
        if property_name not in property_mapping:
            return JsonResponse({
                'error': f'Unknown property: {property_name}',
                'values': []
            }, status=400)
        
        model_name, field_name = property_mapping[property_name]
        
        # Get the model class dynamically
        model_class = globals().get(model_name)
        if not model_class:
            return JsonResponse({
                'error': f'Model not found: {model_name}',
                'values': []
            }, status=500)
        
        # Get distinct values for the property
        values = model_class.objects.values_list(field_name, flat=True).distinct().order_by(field_name)
        
        return JsonResponse({
            'property': property_name,
            'values': list(values),
            'count': len(values)
        })
        
    except Exception as e:
        logger.error(f'Error getting property values for {property_name}: {str(e)}')
        return JsonResponse({
            'error': str(e),
            'property': property_name,
            'values': []
        }, status=500)


@require_http_methods(["GET"])
def vehicle_search(request):
    """New VCDB vehicle search endpoint for manual fitments"""
    try:
        # Get query parameters
        year_from = request.GET.get('yearFrom')
        year_to = request.GET.get('yearTo')
        make = request.GET.get('make')
        model = request.GET.get('model')
        submodel = request.GET.get('submodel')
        fuel_type = request.GET.get('fuelType')
        num_doors = request.GET.get('numDoors')
        drive_type = request.GET.get('driveType')
        body_type = request.GET.get('bodyType')
        
        # Build query
        vehicles_query = Vehicle.objects.select_related(
            'base_vehicle_id__make_id',
            'base_vehicle_id__model_id', 
            'base_vehicle_id__year_id',
            'sub_model_id',
            'region_id',
            'publication_stage_id'
        ).prefetch_related(
            'vehicletodrivetype_set__drive_type_id',
            'vehicletobodystyleconfig_set__body_style_config_id__body_num_doors_id',
            'vehicletobodystyleconfig_set__body_style_config_id__body_type_id',
            'vehicletoengineconfig_set__engine_config_id__fuel_type_id'
        )
        
        # Apply filters
        if year_from:
            vehicles_query = vehicles_query.filter(
                base_vehicle_id__year_id__year_id__gte=int(year_from)
            )
        
        if year_to:
            vehicles_query = vehicles_query.filter(
                base_vehicle_id__year_id__year_id__lte=int(year_to)
            )
        
        if make:
            vehicles_query = vehicles_query.filter(base_vehicle_id__make_id__make_name=make)
        
        if model:
            vehicles_query = vehicles_query.filter(base_vehicle_id__model_id__model_name=model)
        
        if submodel:
            vehicles_query = vehicles_query.filter(sub_model_id__sub_model_name__icontains=submodel)
        
        # Advanced filters - now enabled with populated relationship tables
        if fuel_type:
            # VehicleToEngineConfig table now has data, so enable fuel type filtering
            vehicles_query = vehicles_query.filter(
                vehicletoengineconfig__engine_config_id__fuel_type_id__fuel_type_name__icontains=fuel_type
            )
        
        if num_doors:
            # Handle num_doors filtering - database values have trailing spaces
            clean_num_doors_str = str(num_doors).strip()
            vehicles_query = vehicles_query.filter(
                vehicletobodystyleconfig__body_style_config_id__body_num_doors_id__body_num_doors__icontains=clean_num_doors_str
            )
        
        if drive_type:
            vehicles_query = vehicles_query.filter(
                vehicletodrivetype__drive_type_id__drive_type_name__icontains=drive_type
            )
        
        if body_type:
            vehicles_query = vehicles_query.filter(
                vehicletobodystyleconfig__body_style_config_id__body_type_id__body_type_name__icontains=body_type
            )
        
        # Execute query and format results
        vehicles = vehicles_query.distinct()[:1000]  # Limit to 1000 results
        
        results = []
        for vehicle in vehicles:
            # Get drive types for this vehicle
            drive_types = []
            for vtd in vehicle.vehicletodrivetype_set.all():
                if vtd.drive_type_id:
                    drive_types.append(vtd.drive_type_id.drive_type_name)
            
            # Get body style configs for this vehicle
            body_style_configs = []
            num_doors_list = []
            body_types_list = []
            for vtbs in vehicle.vehicletobodystyleconfig_set.all():
                if vtbs.body_style_config_id:
                    body_style_configs.append(vtbs.body_style_config_id)
                    if vtbs.body_style_config_id.body_num_doors_id:
                        num_doors_list.append(vtbs.body_style_config_id.body_num_doors_id.body_num_doors)
                    if vtbs.body_style_config_id.body_type_id:
                        body_types_list.append(vtbs.body_style_config_id.body_type_id.body_type_name)
            
            # Get engine configs for this vehicle
            fuel_types_list = []
            for vtec in vehicle.vehicletoengineconfig_set.all():
                if vtec.engine_config_id and vtec.engine_config_id.fuel_type_id:
                    fuel_types_list.append(vtec.engine_config_id.fuel_type_id.fuel_type_name)
            
            vehicle_data = {
                'id': vehicle.vehicle_id,
                'year': vehicle.base_vehicle_id.year_id.year_id,
                'make': vehicle.base_vehicle_id.make_id.make_name,
                'model': vehicle.base_vehicle_id.model_id.model_name,
                'submodel': vehicle.sub_model_id.sub_model_name if vehicle.sub_model_id else '',
                'region': vehicle.region_id.region_name if vehicle.region_id else '',
                'publication_stage': vehicle.publication_stage_id.publication_stage_name if vehicle.publication_stage_id else '',
                'source': vehicle.source,
                'driveTypes': list(set(drive_types)),
                'fuelTypes': list(set(fuel_types_list)),
                'numDoors': list(set(num_doors_list)),
                'bodyTypes': list(set(body_types_list)),
                'effectiveDateTime': vehicle.effective_date_time.isoformat() if vehicle.effective_date_time else None,
                'endDateTime': vehicle.end_date_time.isoformat() if vehicle.end_date_time else None,
            }
            results.append(vehicle_data)
        
        return JsonResponse({
            'vehicles': results,
            'total': len(results),
            'filters_applied': {
                'yearFrom': year_from,
                'yearTo': year_to,
                'make': make,
                'model': model,
                'submodel': submodel,
                'fuelType': fuel_type,
                'numDoors': num_doors,
                'driveType': drive_type,
                'bodyType': body_type,
            }
        })
        
    except Exception as e:
        logger.error(f'Error in vehicle search: {str(e)}')
        return JsonResponse({'error': str(e), 'vehicles': []}, status=500)


@require_http_methods(["GET"])
def vehicle_dropdown_data(request):
    """Get dropdown data for vehicle search filters"""
    try:
        # Get all unique values for dropdowns and format for Mantine Combobox
        # Only get models/makes that are actually used by vehicles
        years = Year.objects.values_list('year_id', flat=True).distinct().order_by('-year_id')
        makes = Make.objects.filter(basevehicle__vehicle__isnull=False).values_list('make_name', flat=True).distinct().order_by('make_name')
        models = Model.objects.filter(basevehicle__vehicle__isnull=False).values_list('model_name', flat=True).distinct().order_by('model_name')
        submodels = SubModel.objects.filter(vehicle__isnull=False).values_list('sub_model_name', flat=True).distinct().order_by('sub_model_name')
        drive_types = DriveType.objects.filter(vehicletodrivetype__isnull=False).values_list('drive_type_name', flat=True).distinct().order_by('drive_type_name')
        # Show all fuel types, not just those used by vehicles
        fuel_types = FuelType.objects.values_list('fuel_type_name', flat=True).distinct().order_by('fuel_type_name')
        body_num_doors = BodyNumDoors.objects.filter(bodystyleconfig__vehicletobodystyleconfig__isnull=False).values_list('body_num_doors', flat=True).distinct().order_by('body_num_doors')
        body_types = BodyType.objects.filter(bodystyleconfig__vehicletobodystyleconfig__isnull=False).values_list('body_type_name', flat=True).distinct().order_by('body_type_name')

        # Format data for Mantine Combobox (value/label pairs)
        def format_for_combobox(values):
            return [{'value': str(val), 'label': str(val)} for val in values]

        return JsonResponse({
            'years': format_for_combobox(years),
            'makes': format_for_combobox(makes),
            'models': format_for_combobox(models),
            'submodels': format_for_combobox(submodels),
            'drive_types': format_for_combobox(drive_types),
            'fuel_types': format_for_combobox(fuel_types),
            'num_doors': format_for_combobox(body_num_doors),
            'body_types': format_for_combobox(body_types),
        })

    except Exception as e:
        logger.error(f'Error getting vehicle dropdown data: {str(e)}')
        return JsonResponse({'error': str(e)}, status=500)