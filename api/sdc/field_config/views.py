from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from .models import FieldConfiguration, FieldConfigurationHistory
from .serializers import (
    FieldConfigurationSerializer,
    FieldConfigurationCreateSerializer,
    FieldConfigurationUpdateSerializer,
    FieldConfigurationListSerializer,
    FieldConfigurationHistorySerializer
)
from .filters import FieldConfigurationFilter


class FieldConfigurationViewSet(viewsets.ModelViewSet):
    """ViewSet for FieldConfiguration CRUD operations"""
    
    queryset = FieldConfiguration.objects.all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = FieldConfigurationFilter
    search_fields = ['name', 'display_name', 'description']
    ordering_fields = ['name', 'display_name', 'display_order', 'created_at', 'updated_at']
    ordering = ['reference_type', 'display_order', 'name']
    
    def get_tenant(self):
        """Get tenant from request headers"""
        tenant_id = self.request.headers.get('X-Tenant-ID')
        if tenant_id:
            try:
                from tenants.models import Tenant
                return Tenant.objects.get(id=tenant_id)
            except Tenant.DoesNotExist:
                return None
        return None
    
    def get_queryset(self):
        """Filter queryset based on tenant and query parameters"""
        queryset = super().get_queryset()
        
        # Filter by tenant if provided
        tenant = self.get_tenant()
        if tenant:
            queryset = queryset.filter(tenant=tenant)
        
        # Apply existing filters
        params = self.request.query_params
        
        # Filter by reference type
        reference_type = params.get('reference_type')
        if reference_type:
            queryset = queryset.filter(reference_type=reference_type)
        
        # Filter by requirement level
        requirement_level = params.get('requirement_level')
        if requirement_level:
            queryset = queryset.filter(requirement_level=requirement_level)
        
        # Filter by enabled status
        is_enabled = params.get('is_enabled')
        if is_enabled is not None:
            queryset = queryset.filter(is_enabled=is_enabled.lower() == 'true')
        
        # Filter by field type
        field_type = params.get('field_type')
        if field_type:
            queryset = queryset.filter(field_type=field_type)
        
        return queryset
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'create':
            return FieldConfigurationCreateSerializer
        elif self.action == 'update' or self.action == 'partial_update':
            return FieldConfigurationUpdateSerializer
        elif self.action == 'list':
            return FieldConfigurationListSerializer
        return FieldConfigurationSerializer
    
    
    def perform_create(self, serializer):
        """Create a new field configuration"""
        tenant = self.get_tenant()
        serializer.save(
            created_by=self.request.user.username if hasattr(self.request, 'user') else 'system',
            tenant=tenant
        )
    
    def perform_update(self, serializer):
        """Update field configuration and create history record"""
        instance = self.get_object()

        old_values = {
            'display_name': instance.display_name,
            'description': instance.description,
            'field_type': instance.field_type,
            'requirement_level': instance.requirement_level,
            'is_enabled': instance.is_enabled,
            'is_unique': instance.is_unique,
        }
        
        # Save the updated instance
        tenant = self.get_tenant()
        updated_instance = serializer.save(
            updated_by=self.request.user.username if hasattr(self.request, 'user') else 'system',
            tenant=tenant
        )
        
        # Create history record
        new_values = {
            'display_name': updated_instance.display_name,
            'description': updated_instance.description,
            'field_type': updated_instance.field_type,
            'requirement_level': updated_instance.requirement_level,
            'is_enabled': updated_instance.is_enabled,
            'is_unique': updated_instance.is_unique,
        }

        
        # Only create history record if there were actual changes
        if old_values != new_values:
            FieldConfigurationHistory.objects.create(
                field_config=updated_instance,
                tenant=tenant,
                action='updated',
                changed_by=self.request.user.username if hasattr(self.request, 'user') else 'system',
                old_values=old_values,
                new_values=new_values,
                reason=self.request.data.get('reason', '')
            )
    
    def destroy(self, request, *args, **kwargs):
        """Hard delete field configuration"""
        instance = self.get_object()
        
        # Store field configuration data for history before deletion
        field_data = {
            'display_name': instance.display_name,
            'description': instance.description,
            'field_type': instance.field_type,
            'requirement_level': instance.requirement_level,
            'reference_type': instance.reference_type,
            'name': instance.name,
            'is_enabled': instance.is_enabled,
            'is_unique': instance.is_unique,
            'show_in_filters': instance.show_in_filters,
            'show_in_forms': instance.show_in_forms,
            'display_order': instance.display_order,
            'min_length': instance.min_length,
            'max_length': instance.max_length,
            'min_value': float(instance.min_value) if instance.min_value else None,
            'max_value': float(instance.max_value) if instance.max_value else None,
            'enum_options': instance.enum_options,
            'default_value': instance.default_value,
            'created_at': instance.created_at.isoformat() if instance.created_at else None,
            'updated_at': instance.updated_at.isoformat() if instance.updated_at else None,
            'created_by': instance.created_by,
            'updated_by': instance.updated_by,
        }
        
        # Create history record before deletion
        tenant = self.get_tenant()
        history_record = FieldConfigurationHistory.objects.create(
            field_config=instance,
            tenant=tenant,
            field_name=instance.name,  # Store field name for deleted records
            action='deleted',
            changed_by=request.user.username if hasattr(request, 'user') else 'system',
            old_values=field_data,
            new_values={},
            reason=request.data.get('reason', '')
        )
        
        # Hard delete - completely remove from database
        # The history record will remain with field_config set to NULL
        instance.delete()
        
        return Response(
            {'message': 'Field configuration deleted successfully'},
            status=status.HTTP_204_NO_CONTENT
        )
    
    @action(detail=True, methods=['post'])
    def toggle_enabled(self, request, pk=None):
        """Toggle enabled status of a field configuration"""
        field_config = self.get_object()
        old_enabled = field_config.is_enabled
        field_config.is_enabled = not field_config.is_enabled
        field_config.save(update_fields=['is_enabled'])
        
        # Create history record
        tenant = self.get_tenant()
        FieldConfigurationHistory.objects.create(
            field_config=field_config,
            tenant=tenant,
            action='enabled' if field_config.is_enabled else 'disabled',
            changed_by=request.user.username if hasattr(request, 'user') else 'system',
            old_values={'is_enabled': old_enabled},
            new_values={'is_enabled': field_config.is_enabled},
            reason=request.data.get('reason', '')
        )
        
        return Response({
            'message': f'Field {"enabled" if field_config.is_enabled else "disabled"} successfully',
            'is_enabled': field_config.is_enabled
        })
    
    @action(detail=False, methods=['get'])
    def by_reference_type(self, request):
        """Get fields grouped by reference type"""
        reference_type = request.query_params.get('reference_type')
        if not reference_type:
            return Response(
                {'error': 'reference_type parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        fields = self.get_queryset().filter(reference_type=reference_type)
        serializer = self.get_serializer(fields, many=True)
        
        return Response({
            'reference_type': reference_type,
            'fields': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def validation_rules(self, request):
        """Get validation rules for all enabled fields"""
        reference_type = request.query_params.get('reference_type')
        queryset = self.get_queryset().filter(is_enabled=True)
        
        if reference_type:
            queryset = queryset.filter(
                Q(reference_type=reference_type) | Q(reference_type='both')
            )
        
        rules = {}
        for field in queryset:
            rules[field.name] = field.get_validation_rules()
        
        return Response(rules)
    
    @action(detail=False, methods=['get'])
    def form_fields(self, request):
        """Get fields for form rendering"""
        reference_type = request.query_params.get('reference_type')
        if not reference_type:
            return Response(
                {'error': 'reference_type parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        fields = self.get_queryset().filter(
            Q(reference_type=reference_type) | Q(reference_type='both'),
            is_enabled=True,
            show_in_forms=True
        ).order_by('display_order', 'name')
        
        serializer = self.get_serializer(fields, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def filter_fields(self, request):
        """Get fields for filter rendering"""
        reference_type = request.query_params.get('reference_type')
        if not reference_type:
            return Response(
                {'error': 'reference_type parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        fields = self.get_queryset().filter(
            Q(reference_type=reference_type) | Q(reference_type='both'),
            is_enabled=True,
            show_in_filters=True
        ).order_by('display_order', 'name')
        
        serializer = self.get_serializer(fields, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def validate_data(self, request):
        """Validate field data against configuration"""
        reference_type = request.data.get('reference_type')
        data = request.data.get('data', {})
        
        if not reference_type:
            return Response(
                {'error': 'reference_type is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Get validation rules for the reference type
            queryset = self.get_queryset().filter(
                Q(reference_type=reference_type) | Q(reference_type='both'),
                is_enabled=True
            )
            
            errors = {}
            is_valid = True
            
            for field_config in queryset:
                field_name = field_config.name
                field_value = data.get(field_name)
                
                # Skip validation if field is not required and value is empty
                if field_config.requirement_level == 'optional' and not field_value:
                    continue
                
                # Check required fields
                if field_config.requirement_level == 'required' and not field_value:
                    errors[field_name] = f'{field_config.display_name} is required'
                    is_valid = False
                    continue
                
                # Validate field value if present
                if field_value:
                    validation_result = field_config.validate_value(field_value)
                    if not validation_result['is_valid']:
                        errors[field_name] = validation_result['error']
                        is_valid = False
            
            return Response({
                'is_valid': is_valid,
                'errors': errors
            })
        
        except Exception as e:
            return Response(
                {'error': f'Validation failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class FieldConfigurationHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for FieldConfigurationHistory (read-only)"""
    
    serializer_class = FieldConfigurationHistorySerializer
    
    def get_tenant(self):
        """Get tenant from request headers"""
        tenant_id = self.request.headers.get('X-Tenant-ID')
        if tenant_id:
            try:
                from tenants.models import Tenant
                return Tenant.objects.get(id=tenant_id)
            except Tenant.DoesNotExist:
                return None
        return None
    
    def get_queryset(self):
        """Get history for a specific field configuration"""
        queryset = FieldConfigurationHistory.objects.all()
        
        # Filter by tenant if provided
        tenant = self.get_tenant()
        if tenant:
            queryset = queryset.filter(tenant=tenant)
        
        field_config_id = self.request.query_params.get('field_config_id')
        if field_config_id:
            queryset = queryset.filter(field_config_id=field_config_id)
        
        return queryset
