from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.utils import timezone
import pandas as pd
import json
import os
from .models import ProductConfiguration, ProductData, ProductUpload
from .serializers import (
    ProductConfigurationSerializer, ProductDataSerializer,
    ProductUploadSerializer, ProductUploadCreateSerializer
)
from tenants.models import Tenant
from tenants.utils import get_tenant_id_from_request


class ProductConfigurationViewSet(viewsets.ModelViewSet):
    queryset = ProductConfiguration.objects.all()
    serializer_class = ProductConfigurationSerializer
    
    def get_queryset(self):
        tenant_id = get_tenant_id_from_request(self.request)
        if tenant_id:
            return ProductConfiguration.objects.filter(tenant_id=tenant_id, is_active=True)
        return ProductConfiguration.objects.filter(is_active=True)
    
    def create(self, request, *args, **kwargs):
        # Get tenant from request
        tenant_id = get_tenant_id_from_request(request)
        if not tenant_id:
            return Response(
                {'error': 'Tenant not found'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create a mutable copy of request.data and add tenant
        data = request.data.copy()
        data['tenant'] = tenant_id
        
        serializer = self.get_serializer(data=data)
        if serializer.is_valid():
            # Deactivate existing configurations
            ProductConfiguration.objects.filter(tenant_id=tenant_id).update(is_active=False)
            
            # Create new configuration
            configuration = serializer.save()
            
            return Response(
                ProductConfigurationSerializer(configuration).data, 
                status=status.HTTP_201_CREATED
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ProductDataViewSet(viewsets.ModelViewSet):
    queryset = ProductData.objects.all()
    serializer_class = ProductDataSerializer
    
    def get_queryset(self):
        tenant_id = get_tenant_id_from_request(self.request)
        if tenant_id:
            return ProductData.objects.filter(tenant_id=tenant_id)
        return ProductData.objects.all()


class ProductUploadViewSet(viewsets.ModelViewSet):
    queryset = ProductUpload.objects.all()
    serializer_class = ProductUploadSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    def get_queryset(self):
        tenant_id = get_tenant_id_from_request(self.request)
        if tenant_id:
            return ProductUpload.objects.filter(tenant_id=tenant_id)
        return ProductUpload.objects.all()
    
    @action(detail=False, methods=['get'])
    def check_existing_files(self, request):
        """Check if tenant has existing product files"""
        tenant_id = get_tenant_id_from_request(request)
        if not tenant_id:
            return Response(
                {'error': 'Tenant not found'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check for existing successful uploads
        existing_uploads = ProductUpload.objects.filter(
            tenant_id=tenant_id,
            status='completed'
        ).order_by('-uploaded_at')
        
        # Check if tenant has product data
        has_product_data = ProductData.objects.filter(tenant_id=tenant_id).exists()
        
        return Response({
            'has_existing_files': existing_uploads.exists(),
            'has_product_data': has_product_data,
            'existing_uploads': ProductUploadSerializer(existing_uploads, many=True).data,
            'can_proceed_without_upload': has_product_data
        })
    
    @action(detail=False, methods=['post'])
    def create_fitment_job_without_upload(self, request):
        """Create fitment job using existing product data without uploading new files"""
        tenant_id = get_tenant_id_from_request(request)
        if not tenant_id:
            return Response(
                {'error': 'Tenant not found'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            tenant = Tenant.objects.get(id=tenant_id)
            
            # Check if tenant has product data
            if not ProductData.objects.filter(tenant_id=tenant_id).exists():
                return Response(
                    {'error': 'No product data found. Please upload product files first.'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get or create product configuration
            configuration, created = ProductConfiguration.objects.get_or_create(
                tenant_id=tenant_id,
                is_active=True,
                defaults={
                    'required_product_fields': tenant.fitment_settings.get('required_product_fields', []),
                    'additional_attributes': tenant.fitment_settings.get('additional_attributes', [])
                }
            )
            
            # Get tenant's fitment configuration from the request
            fitment_settings_str = '{}'
            
            # Try to get from request.data (DRF) first
            if hasattr(request, 'data') and request.data:
                fitment_settings_str = request.data.get('fitment_settings', '{}')
            # Fallback to POST data
            elif hasattr(request, 'POST') and request.POST:
                fitment_settings_str = request.POST.get('fitment_settings', '{}')
            # Try to get from request body for JSON requests
            elif hasattr(request, 'body'):
                try:
                    body_data = json.loads(request.body.decode('utf-8'))
                    fitment_settings_str = body_data.get('fitment_settings', '{}')
                except (json.JSONDecodeError, UnicodeDecodeError):
                    pass
            
            try:
                fitment_settings = json.loads(fitment_settings_str)
            except (json.JSONDecodeError, TypeError):
                fitment_settings = {}
            
            vcdb_categories = fitment_settings.get('vcdb_categories', [])
            default_fitment_method = getattr(tenant, 'default_fitment_method', 'manual')
            ai_instructions = getattr(tenant, 'ai_instructions', '')
            
            # If no fitment_settings in request, try to get from tenant
            if not vcdb_categories:
                fitment_config = getattr(tenant, 'fitment_settings', {})
                vcdb_categories = fitment_config.get('vcdb_categories', [])
            
            if vcdb_categories:
                # Create fitment job
                from vcdb_categories.models import FitmentJob
                fitment_job = FitmentJob.objects.create(
                    tenant=tenant,
                    job_type=default_fitment_method,
                    vcdb_categories=vcdb_categories,
                    product_fields=configuration.required_product_fields,
                    ai_instructions=ai_instructions,
                    status='pending'
                )
                
                # Start the job
                from vcdb_categories.tasks import process_fitment_job
                process_fitment_job.delay(str(fitment_job.id))
                
                return Response({
                    'message': 'Fitment job created successfully using existing product data',
                    'job_id': str(fitment_job.id)
                }, status=status.HTTP_201_CREATED)
            else:
                return Response(
                    {'error': 'No VCDB categories configured for fitment'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
                
        except Exception as e:
            return Response(
                {'error': f'Failed to create fitment job: {str(e)}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def create(self, request, *args, **kwargs):
        # Get tenant from request
        tenant_id = get_tenant_id_from_request(request)
        
        # If not found via header, try to get from form data
        if not tenant_id:
            tenant_id = request.data.get('tenant_id')
            if tenant_id:
                # Validate the tenant exists
                try:
                    tenant = Tenant.objects.get(id=tenant_id, is_active=True)
                    tenant_id = str(tenant.id)
                except Tenant.DoesNotExist:
                    return Response(
                        {'error': 'Invalid tenant ID'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
        
        if not tenant_id:
            return Response(
                {'error': 'Tenant not found'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if files are provided
        files = request.FILES.getlist('files')
        if not files:
            # No files provided, check if we can proceed with existing data
            if ProductData.objects.filter(tenant_id=tenant_id).exists():
                # Use the create_fitment_job_without_upload logic
                return self.create_fitment_job_without_upload(request)
            else:
                return Response(
                    {'error': 'No files uploaded and no existing product data found'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        try:
            # Get tenant to access fitment settings
            tenant = Tenant.objects.get(id=tenant_id)
            
            # Get or create product configuration
            configuration, created = ProductConfiguration.objects.get_or_create(
                tenant_id=tenant_id,
                is_active=True,
                defaults={
                    'required_product_fields': tenant.fitment_settings.get('required_product_fields', []),
                    'additional_attributes': tenant.fitment_settings.get('additional_attributes', [])
                }
            )
            
            # Process uploaded files
            files = request.FILES.getlist('files')
            if not files:
                return Response(
                    {'error': 'No files uploaded'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            uploads = []
            for file in files:
                # Create upload record
                upload = ProductUpload.objects.create(
                    tenant_id=tenant_id,
                    filename=file.name,
                    file_size=file.size,
                    file_path=f"products/{tenant_id}/{file.name}",
                    status='processing'
                )
                uploads.append(upload)
                
                # Process file
                try:
                    file_extension = os.path.splitext(file.name)[1].lower()
                    
                    if file_extension == '.csv':
                        df = pd.read_csv(file)
                    elif file_extension in ['.xlsx', '.xls']:
                        df = pd.read_excel(file)
                    elif file_extension == '.json':
                        # For uploaded files, read from file object directly
                        file.seek(0)  # Reset file pointer
                        data = json.load(file)
                        df = pd.DataFrame(data)
                    else:
                        upload.status = 'failed'
                        upload.error_message = f'Unsupported file format: {file_extension}'
                        upload.save()
                        continue
                    
                    # Validate required columns
                    required_fields = configuration.required_product_fields
                    missing_columns = [col for col in required_fields if col not in df.columns]
                    
                    if missing_columns:
                        upload.status = 'failed'
                        upload.error_message = f'Missing required columns: {", ".join(missing_columns)}'
                        upload.save()
                        continue
                    
                    # Process and save product data
                    with transaction.atomic():
                        # If updating existing data, clear old data for this tenant first
                        ProductData.objects.filter(tenant_id=tenant_id).delete()
                        
                        product_records = []
                        for _, row in df.iterrows():
                            try:
                                # Map required fields
                                product_data = {
                                    'tenant_id': tenant_id,
                                    'configuration': configuration,
                                    'part_number': str(row.get('Part Number', '')),
                                    'part_terminology_name': str(row.get('Part Terminology Name', '')),
                                    'ptid': str(row.get('PTID', '')),
                                    'parent_child': str(row.get('Parent/Child', '')),
                                    'source_file': file.name,
                                }
                                
                                # Add additional attributes
                                additional_attrs = {}
                                for attr in configuration.additional_attributes:
                                    attr_name = attr.get('name', '')
                                    if attr_name in df.columns:
                                        additional_attrs[attr_name] = str(row.get(attr_name, ''))
                                
                                product_data['additional_attributes'] = additional_attrs
                                
                                product_records.append(ProductData(**product_data))
                                upload.records_processed += 1
                                
                            except Exception as e:
                                upload.records_failed += 1
                                print(f"Error processing row: {e}")
                                continue
                        
                        if product_records:
                            ProductData.objects.bulk_create(product_records, ignore_conflicts=True)
                    
                    upload.status = 'completed'
                    upload.processed_at = timezone.now()
                    upload.save()
                    
                except Exception as e:
                    upload.status = 'failed'
                    upload.error_message = str(e)
                    upload.save()
            
            # Create fitment job if products were successfully processed
            if any(upload.status == 'completed' for upload in uploads):
                from vcdb_categories.models import FitmentJob
                
                tenant = Tenant.objects.get(id=tenant_id)
                
                # Get tenant's fitment configuration from the request
                fitment_settings_str = request.data.get('fitment_settings', '{}')
                try:
                    fitment_settings = json.loads(fitment_settings_str)
                except (json.JSONDecodeError, TypeError):
                    fitment_settings = {}
                
                vcdb_categories = fitment_settings.get('vcdb_categories', [])
                default_fitment_method = getattr(tenant, 'default_fitment_method', 'manual')
                ai_instructions = getattr(tenant, 'ai_instructions', '')
                
                print(f"DEBUG: fitment_settings = {fitment_settings}")
                print(f"DEBUG: vcdb_categories = {vcdb_categories}")
                
                # If no fitment_settings in request, try to get from tenant
                if not vcdb_categories:
                    fitment_config = getattr(tenant, 'fitment_settings', {})
                    vcdb_categories = fitment_config.get('vcdb_categories', [])
                    print(f"DEBUG: fallback vcdb_categories = {vcdb_categories}")
                
                print(f"DEBUG: Final vcdb_categories = {vcdb_categories}")
                if vcdb_categories:
                    # Create fitment job
                    fitment_job = FitmentJob.objects.create(
                        tenant=tenant,
                        job_type=default_fitment_method,
                        vcdb_categories=vcdb_categories,
                        product_fields=configuration.required_product_fields,
                        ai_instructions=ai_instructions,
                        status='pending'
                    )
                    
                    # Start the job
                    from vcdb_categories.tasks import process_fitment_job
                    process_fitment_job.delay(str(fitment_job.id))
            
            return Response({
                'message': f'Processed {len(uploads)} files',
                'uploads': ProductUploadSerializer(uploads, many=True).data
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {'error': f'File processing failed: {str(e)}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
