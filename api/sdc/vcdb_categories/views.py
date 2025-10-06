from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.utils import timezone
import pandas as pd
import json
import os
from .models import VCDBCategory, VCDBData, FitmentJob, AIFitment
from .serializers import (
    VCDBCategorySerializer, VCDBCategoryCreateSerializer,
    VCDBDataSerializer, FitmentJobSerializer, AIFitmentSerializer,
    AIFitmentUpdateSerializer
)
from tenants.models import Tenant
from tenants.utils import get_tenant_id_from_request


class VCDBCategoryViewSet(viewsets.ModelViewSet):
    queryset = VCDBCategory.objects.filter(is_active=True)
    serializer_class = VCDBCategorySerializer
    parser_classes = [MultiPartParser, FormParser]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return VCDBCategoryCreateSerializer
        return VCDBCategorySerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            category = serializer.save()
            
            # Validate and process the uploaded file
            try:
                if not category.file:
                    return Response(
                        {'error': 'No file uploaded'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                file_path = category.file.path
                file_extension = os.path.splitext(category.filename)[1].lower()
                
                if file_extension == '.csv':
                    df = pd.read_csv(file_path)
                elif file_extension in ['.xlsx', '.xls']:
                    df = pd.read_excel(file_path)
                elif file_extension == '.json':
                    with open(file_path, 'r') as f:
                        data = json.load(f)
                    df = pd.DataFrame(data)
                else:
                    return Response(
                        {'error': f'Unsupported file format: {file_extension}'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Validate required columns
                required_columns = ['year', 'make', 'model']
                missing_columns = [col for col in required_columns if col not in df.columns]
                
                if missing_columns:
                    category.is_valid = False
                    category.validation_errors = {
                        'missing_columns': missing_columns,
                        'message': f'Missing required columns: {", ".join(missing_columns)}'
                    }
                    category.save()
                    return Response(
                        {'error': f'Missing required columns: {", ".join(missing_columns)}'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Process and save VCDB data
                with transaction.atomic():
                    vcdb_records = []
                    for _, row in df.iterrows():
                        try:
                            # Handle year conversion safely
                            year_value = row.get('year', 0)
                            if pd.isna(year_value):
                                year_value = 0
                            else:
                                year_value = int(year_value)
                            
                            # Handle num_doors conversion safely
                            num_doors_value = row.get('num_doors', 0)
                            if pd.isna(num_doors_value):
                                num_doors_value = None
                            else:
                                num_doors_value = int(num_doors_value)
                            
                            vcdb_data = VCDBData(
                                category=category,
                                year=year_value,
                                make=str(row.get('make', '')),
                                model=str(row.get('model', '')),
                                submodel=str(row.get('submodel', '')),
                                drive_type=str(row.get('drive_type', '')),
                                fuel_type=str(row.get('fuel_type', '')),
                                num_doors=num_doors_value,
                                body_type=str(row.get('body_type', '')),
                                engine_type=str(row.get('engine_type', '')),
                                transmission=str(row.get('transmission', '')),
                                trim_level=str(row.get('trim_level', '')),
                                dynamic_fields={k: v for k, v in row.to_dict().items() 
                                             if k not in ['year', 'make', 'model', 'submodel', 
                                                         'drive_type', 'fuel_type', 'num_doors', 
                                                         'body_type', 'engine_type', 'transmission', 
                                                         'trim_level'] and pd.notna(v)}
                            )
                            vcdb_records.append(vcdb_data)
                        except Exception as e:
                            # Log the error but continue processing other rows
                            print(f"Error processing row: {e}")
                            continue
                    
                    if vcdb_records:
                        VCDBData.objects.bulk_create(vcdb_records, ignore_conflicts=True)
                
                # Update category status
                category.is_valid = True
                category.record_count = len(vcdb_records)
                category.validation_errors = {}
                category.save()
                
                return Response(
                    VCDBCategorySerializer(category).data, 
                    status=status.HTTP_201_CREATED
                )
                
            except Exception as e:
                category.is_valid = False
                category.validation_errors = {'error': str(e)}
                category.save()
                return Response(
                    {'error': f'File processing failed: {str(e)}'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def data(self, request, pk=None):
        """Get VCDB data for a specific category"""
        category = self.get_object()
        vcdb_data = VCDBData.objects.filter(category=category)
        
        # Apply filters
        year = request.query_params.get('year')
        make = request.query_params.get('make')
        model = request.query_params.get('model')
        
        if year:
            vcdb_data = vcdb_data.filter(year=year)
        if make:
            vcdb_data = vcdb_data.filter(make__icontains=make)
        if model:
            vcdb_data = vcdb_data.filter(model__icontains=model)
        
        serializer = VCDBDataSerializer(vcdb_data, many=True)
        return Response(serializer.data)


class FitmentJobViewSet(viewsets.ModelViewSet):
    queryset = FitmentJob.objects.all()
    serializer_class = FitmentJobSerializer
    
    def get_queryset(self):
        tenant_id = get_tenant_id_from_request(self.request)
        if tenant_id:
            return FitmentJob.objects.filter(tenant_id=tenant_id)
        return FitmentJob.objects.all()
    
    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        """Start a fitment job"""
        job = self.get_object()
        if job.status != 'pending':
            return Response(
                {'error': 'Job is not in pending status'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update job status
        job.status = 'in_progress'
        job.started_at = timezone.now()
        job.save()
        
        # Start background task
        from .tasks import process_fitment_job
        process_fitment_job.delay(str(job.id))
        
        return Response({'message': 'Job started successfully'})
    
    @action(detail=True, methods=['get'])
    def progress(self, request, pk=None):
        """Get job progress"""
        job = self.get_object()
        return Response({
            'status': job.status,
            'progress_percentage': job.progress_percentage,
            'current_step': job.current_step,
            'completed_steps': job.completed_steps,
            'total_steps': job.total_steps,
            'fitments_created': job.fitments_created,
            'fitments_failed': job.fitments_failed,
            'error_message': job.error_message
        })


class AIFitmentViewSet(viewsets.ModelViewSet):
    queryset = AIFitment.objects.all()
    serializer_class = AIFitmentSerializer
    
    def get_queryset(self):
        tenant_id = get_tenant_id_from_request(self.request)
        status_filter = self.request.query_params.get('status')
        
        queryset = AIFitment.objects.all()
        if tenant_id:
            queryset = queryset.filter(tenant_id=tenant_id)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        return queryset
    
    def get_serializer_class(self):
        if self.action in ['update', 'partial_update']:
            return AIFitmentUpdateSerializer
        return AIFitmentSerializer
    
    @action(detail=False, methods=['post'])
    def bulk_approve(self, request):
        """Bulk approve AI fitments"""
        fitment_ids = request.data.get('fitment_ids', [])
        if not fitment_ids:
            return Response(
                {'error': 'No fitment IDs provided'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        fitments = AIFitment.objects.filter(id__in=fitment_ids, status='pending')
        updated_count = fitments.update(
            status='approved',
            reviewed_by=request.user if request.user.is_authenticated else None,
            reviewed_at=timezone.now()
        )
        
        return Response({
            'message': f'{updated_count} fitments approved successfully'
        })
    
    @action(detail=False, methods=['post'])
    def bulk_reject(self, request):
        """Bulk reject AI fitments"""
        fitment_ids = request.data.get('fitment_ids', [])
        if not fitment_ids:
            return Response(
                {'error': 'No fitment IDs provided'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        fitments = AIFitment.objects.filter(id__in=fitment_ids, status='pending')
        updated_count = fitments.update(
            status='rejected',
            reviewed_by=request.user if request.user.is_authenticated else None,
            reviewed_at=timezone.now()
        )
        
        return Response({
            'message': f'{updated_count} fitments rejected successfully'
        })
