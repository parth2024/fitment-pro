import os
import csv
import json
import pandas as pd
import requests
import uuid
from django.conf import settings
from django.db.models import Q
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils.decorators import method_decorator
from django.utils import timezone
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from fitment_uploads.azure_ai_service import azure_ai_service
from .models import (
    DataUploadSession, 
    FileValidationLog, 
    DataProcessingLog, 
    AIFitmentResult, 
    AppliedFitment,
    VCDBData,
    ProductData,
    LiftHeight,
    WheelType,
    TireDiameter,
    WheelDiameter,
    Backspacing,
)
from fitments.models import Fitment
from .serializers import (
    DataUploadSessionSerializer, 
    DataUploadSessionListSerializer,
    FileUploadSerializer,
    FileInfoSerializer,
    AIFitmentResultSerializer,
    AppliedFitmentSerializer,
    ApplyFitmentsRequestSerializer
)
from .utils import FileParser, VCDBValidator, ProductValidator, DataProcessor
from .dynamic_field_validator import DynamicFieldValidator
from .job_manager import FitmentJobManager
import logging

logger = logging.getLogger(__name__)


class DataUploadSessionView(APIView):
    """API view for managing data upload sessions"""
    
    def get(self, request):
        """Get all data upload sessions"""
        # Get tenant ID from header
        tenant_id = request.headers.get('X-Tenant-ID')
        
        # Build base queryset
        sessions = DataUploadSession.objects.all()
        
        # Filter by tenant if provided
        if tenant_id:
            try:
                from tenants.models import Tenant
                tenant = Tenant.objects.get(id=tenant_id)
                sessions = sessions.filter(tenant=tenant)
            except Tenant.DoesNotExist:
                return Response(
                    {"error": "Invalid tenant ID"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        serializer = DataUploadSessionListSerializer(sessions, many=True)
        return Response(serializer.data)
    
    def post(self, request):
        """Create a new data upload session"""
        # Get tenant ID from header
        tenant_id = request.headers.get('X-Tenant-ID')
        tenant = None
        
        if tenant_id:
            try:
                from tenants.models import Tenant
                tenant = Tenant.objects.get(id=tenant_id)
            except Tenant.DoesNotExist:
                return Response(
                    {"error": "Invalid tenant ID"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        serializer = FileUploadSerializer(data=request.data)
        if serializer.is_valid():
            # Create new session with tenant
            session = DataUploadSession.objects.create(tenant=tenant)
            
            # Handle file uploads
            vcdb_file = request.FILES.get('vcdb_file')
            products_file = request.FILES.get('products_file')
            
            # Check if at least one file is provided
            if not vcdb_file and not products_file:
                session.delete()
                return Response(
                    {"error": "At least one file (VCDB or Products) must be provided"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if vcdb_file:
                session.vcdb_file = vcdb_file
                session.vcdb_filename = vcdb_file.name
                session.vcdb_file_size = vcdb_file.size
                
            if products_file:
                session.products_file = products_file
                session.products_filename = products_file.name
                session.products_file_size = products_file.size
            
            session.save()
            
            # Validate files
            self._validate_files(session, tenant)
            
            response_serializer = DataUploadSessionSerializer(session)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def _validate_files(self, session, tenant=None):
        """Validate uploaded files"""
        if session.vcdb_file:
            self._validate_file(session, 'vcdb', tenant)
        if session.products_file:
            self._validate_file(session, 'products', tenant)
    
    def _validate_file(self, session, file_type, tenant=None):
        """Validate a specific file"""
        try:
            file_field = getattr(session, f'{file_type}_file')
            if not file_field:
                return
            
            # Check file extension
            file_name = getattr(session, f'{file_type}_filename')
            if not file_name.lower().endswith(('.csv', '.xlsx', '.xls', '.json')):
                self._log_validation(session, file_type, 'format', False, 
                                  f"Invalid file format. Expected CSV, XLSX, XLS, or JSON")
                return
            
            # Get file path for parsing
            file_path = os.path.join(settings.MEDIA_ROOT, file_field.name)
            
            try:
                # Parse the file using our utility
                df = FileParser.parse_file(file_path, file_name)
                
                # Basic validation
                if df.empty:
                    self._log_validation(session, file_type, 'data', False, 
                                      "File is empty")
                    return
                
                # Normalize and validate data based on file type
                if file_type == 'vcdb':
                    # Normalize VCDB data
                    normalized_df = VCDBValidator.normalize_dataframe(df)
                    is_valid, validation_errors = VCDBValidator.validate_data(normalized_df)
                    
                    # Add dynamic field validation for VCDB
                    try:
                        dynamic_validator = DynamicFieldValidator('vcdb')
                        dynamic_is_valid, dynamic_errors = dynamic_validator.validate_dataframe(normalized_df)
                        
                        if not dynamic_is_valid:
                            is_valid = False
                            validation_errors.extend(dynamic_errors)
                            
                        # Log dynamic validation summary
                        validation_summary = dynamic_validator.get_validation_summary(normalized_df)
                        logger.info(f"VCDB Dynamic validation summary: {validation_summary}")
                        
                    except Exception as e:
                        logger.error(f"Dynamic field validation error for VCDB: {str(e)}")
                        validation_errors.append(f"Dynamic field validation failed: {str(e)}")
                        is_valid = False
                        
                elif file_type == 'products':
                    # Normalize Product data
                    normalized_df = ProductValidator.normalize_dataframe(df)
                    is_valid, validation_errors = ProductValidator.validate_data(normalized_df)
                    
                    # Add dynamic field validation for Products
                    try:
                        dynamic_validator = DynamicFieldValidator('product')
                        dynamic_is_valid, dynamic_errors = dynamic_validator.validate_dataframe(normalized_df)
                        
                        if not dynamic_is_valid:
                            is_valid = False
                            validation_errors.extend(dynamic_errors)
                            
                        # Log dynamic validation summary
                        validation_summary = dynamic_validator.get_validation_summary(normalized_df)
                        logger.info(f"Product Dynamic validation summary: {validation_summary}")
                        
                    except Exception as e:
                        logger.error(f"Dynamic field validation error for Products: {str(e)}")
                        validation_errors.append(f"Dynamic field validation failed: {str(e)}")
                        is_valid = False
                else:
                    is_valid = True
                    validation_errors = []
                
                if not is_valid:
                    error_message = f"Data validation failed: {'; '.join(validation_errors)}"
                    self._log_validation(session, file_type, 'data', False, error_message)
                    
                    # Update session status to indicate validation failure
                    session.status = 'validation_failed'
                    session.save()
                    return
                
                # Process and store the data
                if file_type == 'vcdb':
                    created_count, processing_errors = DataProcessor.process_vcdb_data(normalized_df, str(session.id), tenant)
                elif file_type == 'products':
                    created_count, processing_errors = DataProcessor.process_product_data(normalized_df, str(session.id), tenant)
                else:
                    created_count = len(df)
                    processing_errors = []
                
                # Update record count
                setattr(session, f'{file_type}_records', created_count)
                
                # Mark as valid
                setattr(session, f'{file_type}_valid', True)
                session.save()  # Save the changes
                
                success_message = f"File validated and processed successfully. {created_count} records created."
                if processing_errors:
                    success_message += f" Warnings: {'; '.join(processing_errors[:3])}"  # Show first 3 errors
                
                self._log_validation(session, file_type, 'data', True, success_message)
                
            except Exception as e:
                self._log_validation(session, file_type, 'data', False, 
                                  f"Error reading file: {str(e)}")
                return
                
        except Exception as e:
            logger.error(f"Error validating {file_type} file: {str(e)}")
            self._log_validation(session, file_type, 'system', False, 
                              f"System error: {str(e)}")
    
    def _log_validation(self, session, file_type, validation_type, is_valid, message):
        """Log validation result"""
        FileValidationLog.objects.create(
            session=session,
            file_type=file_type,
            validation_type=validation_type,
            is_valid=is_valid,
            message=message
        )


class DataUploadSessionDetailView(APIView):
    """API view for individual data upload session details"""
    
    def get(self, request, session_id):
        """Get specific session details"""
        try:
            session = DataUploadSession.objects.get(id=session_id)
            serializer = DataUploadSessionSerializer(session)
            return Response(serializer.data)
        except DataUploadSession.DoesNotExist:
            return Response(
                {"error": "Session not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    def delete(self, request, session_id):
        """Delete a session and its files"""
        try:
            session = DataUploadSession.objects.get(id=session_id)
            
            # Delete files from storage
            if session.vcdb_file:
                session.vcdb_file.delete()
            if session.products_file:
                session.products_file.delete()
            
            # Delete session
            session.delete()
            
            return Response(status=status.HTTP_204_NO_CONTENT)
        except DataUploadSession.DoesNotExist:
            return Response(
                {"error": "Session not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )


@api_view(['GET'])
@permission_classes([AllowAny])
def get_current_data_status(request):
    """Get the current status of uploaded data files"""
    try:
        # Get the most recent session
        latest_session = DataUploadSession.objects.filter(
            status='uploaded'
        ).order_by('-created_at').first()
        
        if not latest_session:
            return Response({
                'vcdb': {'exists': False},
                'products': {'exists': False}
            })
        
        response_data = {
            'vcdb': {
                'exists': bool(latest_session.vcdb_file),
                'filename': latest_session.vcdb_filename or '',
                'uploaded_at': latest_session.created_at.isoformat() if latest_session.vcdb_file else None,
                'record_count': latest_session.vcdb_records,
                'valid': latest_session.vcdb_valid,
            },
            'products': {
                'exists': bool(latest_session.products_file),
                'filename': latest_session.products_filename or '',
                'uploaded_at': latest_session.created_at.isoformat() if latest_session.products_file else None,
                'record_count': latest_session.products_records,
                'valid': latest_session.products_valid,
            }
        }
        
        return Response(response_data)
    
    except Exception as e:
        logger.error(f"Error getting data status: {str(e)}")
        return Response(
            {"error": "Failed to get data status"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def replace_file(request):
    """Replace an existing file in the current session"""
    try:
        # Get the most recent session
        latest_session = DataUploadSession.objects.filter(
            status='uploaded'
        ).order_by('-created_at').first()
        
        if not latest_session:
            return Response(
                {"error": "No active session found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        file_type = request.data.get('file_type')  # 'vcdb' or 'products'
        new_file = request.FILES.get('file')
        
        if not file_type or not new_file:
            return Response(
                {"error": "file_type and file are required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if file_type not in ['vcdb', 'products']:
            return Response(
                {"error": "file_type must be 'vcdb' or 'products'"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Delete old file
        old_file_field = getattr(latest_session, f'{file_type}_file')
        if old_file_field:
            old_file_field.delete()
        
        # Set new file
        setattr(latest_session, f'{file_type}_file', new_file)
        setattr(latest_session, f'{file_type}_filename', new_file.name)
        setattr(latest_session, f'{file_type}_file_size', new_file.size)
        setattr(latest_session, f'{file_type}_valid', False)
        setattr(latest_session, f'{file_type}_records', 0)
        
        latest_session.save()
        
        # Validate new file
        view = DataUploadSessionView()
        view._validate_file(latest_session, file_type)
        
        serializer = DataUploadSessionSerializer(latest_session)
        return Response(serializer.data)
    
    except Exception as e:
        logger.error(f"Error replacing file: {str(e)}")
        return Response(
            {"error": "Failed to replace file"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def get_file_data(request, session_id, file_type):
    """Get data from uploaded files for processing"""
    try:
        session = DataUploadSession.objects.get(id=session_id)
        
        if file_type not in ['vcdb', 'products']:
            return Response(
                {"error": "file_type must be 'vcdb' or 'products'"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        file_field = getattr(session, f'{file_type}_file')
        if not file_field:
            return Response(
                {"error": f"No {file_type} file found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Read file data with robust error handling
        file_name = getattr(session, f'{file_type}_filename')
        
        try:
            if file_name.lower().endswith('.csv'):
                # Try different CSV reading approaches
                try:
                    df = pd.read_csv(file_field)
                except pd.errors.ParserError:
                    try:
                        df = pd.read_csv(file_field, sep=';')
                    except pd.errors.ParserError:
                        try:
                            df = pd.read_csv(file_field, sep='\t')
                        except pd.errors.ParserError:
                            try:
                                df = pd.read_csv(file_field, error_bad_lines=False, warn_bad_lines=True)
                            except:
                                df = pd.read_csv(file_field, low_memory=False)
            elif file_name.lower().endswith('.json'):
                import json
                data = json.load(file_field)
                if isinstance(data, list):
                    df = pd.DataFrame(data)
                elif isinstance(data, dict):
                    df = pd.DataFrame([data])
                else:
                    df = pd.DataFrame()
            elif file_name.lower().endswith('.xlsx'):
                df = pd.read_excel(file_field, engine='openpyxl')
            elif file_name.lower().endswith('.xls'):
                df = pd.read_excel(file_field, engine='xlrd')
            else:
                # Try to read as Excel with openpyxl engine
                df = pd.read_excel(file_field, engine='openpyxl')
        except Exception as e:
            logger.error(f"Failed to read {file_type} file: {str(e)}")
            return Response(
                {"error": f"Failed to read {file_type} file: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Convert to JSON
        data = df.to_dict('records')
        
        return Response({
            'data': data,
            'columns': list(df.columns),
            'record_count': len(df),
            'filename': file_name
        })
    
    except DataUploadSession.DoesNotExist:
        return Response(
            {"error": "Session not found"}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Error getting file data: {str(e)}")
        return Response(
            {"error": "Failed to read file data"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def process_ai_fitment(request):
    """Process AI fitment using VCDB and Product data tables directly"""
    try:
        logger.info(f"AI fitment processing request: {request.data}")
        
        # Get data directly from VCDB and Product data tables
        vcdb_queryset = VCDBData.objects.all()
        products_queryset = ProductData.objects.all()
        
        # Check if we have data
        if not vcdb_queryset.exists():
            return Response(
                {"error": "No VCDB data available. Please upload VCDB data first."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not products_queryset.exists():
            return Response(
                {"error": "No Product data available. Please upload Product data first."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Convert querysets to dictionaries for AI processing
        vcdb_data = []
        for vcdb in vcdb_queryset:
            vcdb_data.append({
                'id': vcdb.id,
                'year': vcdb.year,
                'make': vcdb.make,
                'model': vcdb.model,
                'submodel': vcdb.submodel,
                'driveType': vcdb.drive_type,
                'fuelType': vcdb.fuel_type,
                'numDoors': vcdb.num_doors,
                'bodyType': vcdb.body_type,
                'engineType': vcdb.engine_type,
                'transmission': vcdb.transmission,
                'trimLevel': vcdb.trim_level,
            })
        
        products_data = []
        for product in products_queryset:
            products_data.append({
                'id': product.part_id,
                'partId': product.part_id,
                'description': product.description,
                'category': product.category,
                'partType': product.part_type,
                'compatibility': product.compatibility,
                'brand': product.brand,
                'sku': product.sku,
                'price': float(product.price) if product.price else None,
                'weight': float(product.weight) if product.weight else None,
                'dimensions': product.dimensions,
                'specifications': product.specifications,
            })
        
        logger.info(f"Processing AI fitment with {len(vcdb_data)} vehicles and {len(products_data)} products")
        
        # Process with AI
        ai_fitments = azure_ai_service.generate_fitments(vcdb_data, products_data)
        
        # Create a temporary session for tracking AI results (optional)
        # This allows us to maintain the existing data structure
        temp_session = DataUploadSession.objects.create(
            status='completed',
            vcdb_valid=True,
            products_valid=True,
            vcdb_records=len(vcdb_data),
            products_records=len(products_data)
        )
        
        # Save AI results
        ai_results = []
        for fitment_data in ai_fitments:
            ai_result = AIFitmentResult.objects.create(
                session=temp_session,
                part_id=fitment_data['partId'],
                part_description=fitment_data['partDescription'],
                year=fitment_data['year'],
                make=fitment_data['make'],
                model=fitment_data['model'],
                submodel=fitment_data['submodel'],
                drive_type=fitment_data['driveType'],
                position=fitment_data['position'],
                quantity=fitment_data['quantity'],
                confidence=fitment_data['confidence'],
                confidence_explanation=fitment_data.get('confidence_explanation', ''),
                ai_reasoning=fitment_data['ai_reasoning']
            )
            ai_results.append(ai_result)
        
        # Log the processing
        DataProcessingLog.objects.create(
            session=temp_session,
            step='ai_fitment_direct',
            status='completed',
            message=f"Generated {len(ai_fitments)} AI fitments",
            details={'records_processed': len(ai_fitments)}
        )
        
        # Serialize results
        results_serializer = AIFitmentResultSerializer(ai_results, many=True)
        
        return Response({
            'message': 'AI fitment processing completed',
            'fitments': results_serializer.data,
            'session_id': str(temp_session.id),
            'total_count': len(ai_fitments)
        })
        
    except Exception as e:
        logger.error(f"Error processing AI fitment: {str(e)}", exc_info=True)
        
        # Handle specific error types
        error_message = str(e)
        if "duplicate key value violates unique constraint" in error_message:
            return Response(
                {"error": "Duplicate fitment detected. Some fitments may already exist in the database."}, 
                status=status.HTTP_409_CONFLICT
            )
        elif "Missing required columns" in error_message:
            return Response(
                {"error": f"Data validation error: {error_message}"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        elif "No VCDB data available" in error_message:
            return Response(
                {"error": "No VCDB data available. Please upload VCDB data first."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        elif "No Product data available" in error_message:
            return Response(
                {"error": "No Product data available. Please upload Product data first."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        else:
            return Response(
                {"error": f"Failed to process AI fitment: {error_message}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


def _generate_mock_fitments(vcdb_df, products_df):
    """Generate mock fitments for testing when AI Foundry is not available"""
    import random
    
    # Sample some vehicles and products
    vehicles = vcdb_df.head(10).to_dict('records')
    products = products_df.head(5).to_dict('records')
    
    fitments = []
    for i, vehicle in enumerate(vehicles):
        for j, product in enumerate(products):
            # Generate a mock fitment
            fitment = {
                'id': f"mock_fitment_{i}_{j}",
                'part_id': product.get('id', f"PART_{j:03d}"),
                'part_name': product.get('name', f"Product {j+1}"),
                'part_description': product.get('description', f"Mock product description {j+1}"),
                'year': vehicle.get('year', 2020),
                'make': vehicle.get('make', 'Toyota'),
                'model': vehicle.get('model', 'Camry'),
                'submodel': vehicle.get('submodel', 'LE'),
                'position': random.choice(['Front', 'Rear', 'All']),
                'confidence': round(random.uniform(0.6, 0.95), 2),
                'quantity': random.randint(1, 4),
                'notes': f"Mock AI-generated fitment for {vehicle.get('make', 'Vehicle')} {vehicle.get('model', 'Model')}"
            }
            fitments.append(fitment)
    
    return fitments


@api_view(['POST'])
@permission_classes([AllowAny])
def apply_manual_fitment(request):
    """Apply manual fitment to selected vehicles using VCDBData and ProductData"""
    try:
        # Extract data from request
        session_id = request.data.get('sessionId')
        vehicle_ids = request.data.get('vehicleIds', [])
        part_id = request.data.get('partId')
        position = request.data.get('position', '')
        quantity = request.data.get('quantity', 1)
        title = request.data.get('title', '')
        description = request.data.get('description', '')
        notes = request.data.get('notes', '')
        selected_columns = request.data.get('selectedColumns', [])
        tenant_id = request.data.get('tenantId')
        
        # Validate required fields
        if not session_id:
            return Response(
                {'error': 'Session ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not vehicle_ids:
            return Response(
                {'error': 'At least one vehicle must be selected'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not part_id:
            return Response(
                {'error': 'Part ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get tenant if provided
        tenant = None
        if tenant_id:
            from tenants.models import Tenant
            try:
                tenant = Tenant.objects.get(id=tenant_id)
            except Tenant.DoesNotExist:
                return Response(
                    {'error': f'Tenant with ID {tenant_id} not found'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            # Try to get tenant from header
            tenant_id = request.headers.get('X-Tenant-ID')
            if tenant_id:
                from tenants.models import Tenant
                try:
                    tenant = Tenant.objects.get(id=tenant_id)
                except Tenant.DoesNotExist:
                    return Response(
                        {'error': f'Tenant with ID {tenant_id} not found'}, 
                        status=status.HTTP_404_NOT_FOUND
                    )
            else:
                # Get default tenant
                from tenants.models import Tenant
                tenant = Tenant.objects.filter(is_default=True).first()
                if not tenant:
                    tenant = Tenant.objects.first()
                
                if not tenant:
                    return Response(
                        {'error': 'No tenant available'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
        
        # Prepare fitment data
        fitment_data = {
            'position': position,
            'quantity': quantity,
            'title': title,
            'description': description,
            'notes': notes,
            'selected_columns': selected_columns
        }
        
        # Process manual fitment job
        job, applied_fitments = FitmentJobManager.process_manual_fitment_job(
            tenant=tenant,
            session_id=session_id,
            vehicle_ids=vehicle_ids,
            part_id=part_id,
            fitment_data=fitment_data
        )
        
        # Log the processing activity
        try:
            session = DataUploadSession.objects.get(id=session_id)
            DataProcessingLog.objects.create(
                session=session,
                step='manual_fitment',
                status='completed',
                message=f"Applied manual fitment to {len(applied_fitments)} vehicles",
                details={
                    'records_processed': len(applied_fitments), 
                    'part_id': part_id,
                    'selected_columns': selected_columns,
                    'job_id': str(job.id)
                }
            )
        except Exception as e:
            logger.error(f"Failed to create processing log: {str(e)}", exc_info=True)
        
        return Response({
            'message': f'Successfully applied fitment to {len(applied_fitments)} vehicles',
            'applied_count': len(applied_fitments),
            'applied_fitments': applied_fitments,
            'session_id': str(session_id),
            'part_id': part_id,
            'selected_columns': selected_columns,
            'job_id': str(job.id),
            'job_status': job.status
        })
        
    except Exception as e:
        logger.error(f"Failed to apply manual fitment: {str(e)}", exc_info=True)
        return Response(
            {'error': f'Failed to apply manual fitment: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def apply_ai_fitments(request):
    """Apply selected AI fitments to the database"""
    try:
        serializer = ApplyFitmentsRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        session_id = serializer.validated_data['session_id']
        fitment_ids = serializer.validated_data['fitment_ids']
        tenant_id = serializer.validated_data.get('tenant_id')
        
        # Get tenant if provided
        tenant = None
        if tenant_id:
            from tenants.models import Tenant
            try:
                tenant = Tenant.objects.get(id=tenant_id)
            except Tenant.DoesNotExist:
                return Response(
                    {'error': f'Tenant with ID {tenant_id} not found'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            # Try to get tenant from header
            tenant_id = request.headers.get('X-Tenant-ID')
            if tenant_id:
                from tenants.models import Tenant
                try:
                    tenant = Tenant.objects.get(id=tenant_id)
                except Tenant.DoesNotExist:
                    return Response(
                        {'error': f'Tenant with ID {tenant_id} not found'}, 
                        status=status.HTTP_404_NOT_FOUND
                    )
            else:
                # Get default tenant
                from tenants.models import Tenant
                tenant = Tenant.objects.filter(is_default=True).first()
                if not tenant:
                    tenant = Tenant.objects.first()
                
                if not tenant:
                    return Response(
                        {'error': 'No tenant available'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
        
        try:
            session = DataUploadSession.objects.get(id=session_id)
        except DataUploadSession.DoesNotExist:
            return Response(
                {'error': 'Session not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Create job for AI fitment application
        job = FitmentJobManager.create_job(
            tenant=tenant,
            job_type='apply_ai_fitments',
            params={
                'session_id': session_id,
                'fitment_ids': fitment_ids
            }
        )
        
        # Update job to processing
        FitmentJobManager.update_job_status(job.id, 'processing')
        
        # Get selected AI results
        ai_results = AIFitmentResult.objects.filter(
            session=session,
            id__in=fitment_ids
        )
        
        if not ai_results.exists():
            return Response(
                {'error': 'No valid fitments found'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Apply fitments
        applied_count = 0
        for ai_result in ai_results:
            # Create AppliedFitment record
            applied_fitment = AppliedFitment.objects.create(
                session=session,
                ai_result=ai_result,
                part_id=ai_result.part_id,
                part_description=ai_result.part_description,
                year=ai_result.year,
                make=ai_result.make,
                model=ai_result.model,
                submodel=ai_result.submodel,
                drive_type=ai_result.drive_type,
                position=ai_result.position or 'Universal',  # Provide default if null
                quantity=ai_result.quantity,
                title=f"AI Generated Fitment",
                description=ai_result.ai_reasoning
            )
            
            # Check for existing fitment to avoid duplicates
            existing_fitment = Fitment.objects.filter(
                tenant=tenant,
                partId=ai_result.part_id,
                year=ai_result.year,
                makeName=ai_result.make,
                modelName=ai_result.model,
                subModelName=ai_result.submodel,
                isDeleted=False
            ).first()
            
            if existing_fitment:
                logger.warning(f"AI Fitment already exists for {ai_result.part_id} and {ai_result.year} {ai_result.make} {ai_result.model}")
                continue
            
            # Create Fitment record
            fitment = Fitment.objects.create(
                hash=f"{tenant.id}_{uuid.uuid4().hex}",  # Include tenant ID in hash for uniqueness
                tenant=tenant,  # Associate with tenant
                partId=ai_result.part_id,
                itemStatus='Active',
                itemStatusCode=0,
                baseVehicleId=str(ai_result.id),  # Using AI result ID as base vehicle ID
                year=ai_result.year,
                makeName=ai_result.make,
                modelName=ai_result.model,
                subModelName=ai_result.submodel,
                driveTypeName=ai_result.drive_type,
                fuelTypeName='Gas',  # Default value
                bodyNumDoors=4,  # Default value
                bodyTypeName='Sedan',  # Default value
                ptid='PT-22',  # Default part type ID
                partTypeDescriptor=ai_result.part_description,
                uom='EA',  # Each
                quantity=ai_result.quantity,
                fitmentTitle=f"AI Generated Fitment - {ai_result.part_id}",
                fitmentDescription=ai_result.ai_reasoning,
                fitmentNotes=f"Generated from AI fitment result ID: {ai_result.id}",
                position=ai_result.position or 'Front',
                positionId=1,  # Default position ID
                liftHeight='Stock',  # Default value
                wheelType='Alloy',  # Default value
                fitmentType='ai_fitment',  # Set as AI fitment type
                createdBy='ai_system',
                updatedBy='ai_system'
            )
            
            # Mark AI result as applied
            ai_result.is_applied = True
            ai_result.save()
            
            applied_count += 1
        
        # Update job status to completed
        FitmentJobManager.update_job_status(
            job.id, 
            'completed', 
            result={
                'applied_count': applied_count,
                'session_id': session_id,
                'fitment_ids': fitment_ids
            }
        )
        
        # Log the processing activity
        try:
            DataProcessingLog.objects.create(
                session=session,
                step='apply_ai_fitments',
                status='completed',
                message=f"Applied {applied_count} AI fitments to database",
                details={
                    'records_processed': applied_count, 
                    'fitment_ids': fitment_ids,
                    'job_id': str(job.id)
                }
            )
        except Exception as e:
            logger.error(f"Failed to create processing log: {str(e)}", exc_info=True)
        
        return Response({
            'message': f'Successfully applied {applied_count} fitments',
            'applied_count': applied_count,
            'session_id': str(session_id),
            'job_id': str(job.id),
            'job_status': job.status
        })
        
    except Exception as e:
        logger.error(f"Failed to apply fitments: {str(e)}", exc_info=True)
        return Response(
            {'error': f'Failed to apply fitments: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def apply_ai_fitments_direct(request):
    """Apply selected AI fitments directly without session requirement"""
    try:
        fitments_data = request.data.get('fitments', [])
        
        if not fitments_data:
            return Response(
                {'error': 'fitments data is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get tenant from first fitment item
        tenant_id = fitments_data[0].get('tenant_id') if fitments_data else None
        tenant = None
        if tenant_id:
            from tenants.models import Tenant
            try:
                tenant = Tenant.objects.get(id=tenant_id)
            except Tenant.DoesNotExist:
                return Response(
                    {'error': f'Tenant with ID {tenant_id} not found'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
        print("tenant", tenant)
        
        # Get selected AI results from the most recent session
        latest_session = DataUploadSession.objects.filter(
            status='completed'
        ).order_by('-created_at').first()
        
        if not latest_session:
            return Response(
                {'error': 'No completed AI fitment session found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Apply fitments
        applied_count = 0
        for fitment_data in fitments_data:
            # Create AppliedFitment record
            applied_fitment = AppliedFitment.objects.create(
                session=latest_session,
                ai_result=None,  # No AI result reference for direct application
                part_id=fitment_data.get('part_id'),
                part_description=fitment_data.get('part_description'),
                year=fitment_data.get('year'),
                make=fitment_data.get('make'),
                model=fitment_data.get('model'),
                submodel=fitment_data.get('submodel'),
                drive_type=fitment_data.get('drive_type'),
                position=fitment_data.get('position', 'Universal'),  # Provide default if null
                quantity=fitment_data.get('quantity', 1),
                title=f"AI Generated Fitment",
                description=fitment_data.get('ai_reasoning', '')
            )
            
            # Create Fitment record
            fitment = Fitment.objects.create(
                hash=f"{tenant.id}_{uuid.uuid4().hex}",  # Include tenant ID in hash for uniqueness
                tenant=tenant,  # Associate with tenant
                partId=fitment_data.get('part_id'),
                itemStatus='Active',
                itemStatusCode=0,
                baseVehicleId=str(fitment_data.get('id', uuid.uuid4().hex)),  # Using fitment ID
                year=fitment_data.get('year'),
                makeName=fitment_data.get('make'),
                modelName=fitment_data.get('model'),
                subModelName=fitment_data.get('submodel'),
                driveTypeName=fitment_data.get('drive_type'),
                fuelTypeName='Gas',  # Default value
                bodyNumDoors=4,  # Default value
                bodyTypeName='Sedan',  # Default value
                ptid='PT-22',  # Default part type ID
                partTypeDescriptor=fitment_data.get('part_description'),
                uom='EA',  # Each
                quantity=fitment_data.get('quantity', 1),
                fitmentTitle=f"AI Generated Fitment - {fitment_data.get('part_id')}",
                fitmentDescription=fitment_data.get('ai_reasoning', ''),
                fitmentNotes=f"Generated from AI fitment ID: {fitment_data.get('id')}",
                position=fitment_data.get('position', 'Front'),
                positionId=1,  # Default position ID
                liftHeight='Stock',  # Default value
                wheelType='Alloy',  # Default value
                fitmentType='ai_fitment',  # Set as AI fitment type
                createdBy='ai_system',
                updatedBy='ai_system',
                aiDescription=fitment_data.get('ai_reasoning', ''),
                confidenceScore=fitment_data.get('confidence', 0),
                # Include dynamic fields
                dynamicFields=fitment_data.get('dynamicFields', {})
            )
            
            applied_count += 1
        
        return Response({
            'message': f'Successfully applied {applied_count} fitments',
            'applied_count': applied_count,
            'session_id': str(latest_session.id)
        })
        
    except Exception as e:
        logger.error(f"Failed to apply fitments: {str(e)}", exc_info=True)
        return Response(
            {'error': f'Failed to apply fitments: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def get_vcdb_data(request):
    """Get all VCDB data from the database"""
    try:
        # Get tenant ID from header
        tenant_id = request.headers.get('X-Tenant-ID')
        
        # Get query parameters for filtering
        year = request.GET.get('year')
        make = request.GET.get('make')
        model = request.GET.get('model')
        limit = request.GET.get('limit', 1000)  # Default limit
        
        # Build query
        queryset = VCDBData.objects.all()
        
        # Filter by tenant if provided
        if tenant_id:
            try:
                from tenants.models import Tenant
                tenant = Tenant.objects.get(id=tenant_id)
                queryset = queryset.filter(tenant=tenant)
            except Tenant.DoesNotExist:
                return Response(
                    {"error": "Invalid tenant ID"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        if year:
            queryset = queryset.filter(year=year)
        if make:
            queryset = queryset.filter(make__icontains=make)
        if model:
            queryset = queryset.filter(model__icontains=model)
        
        # Apply limit
        try:
            limit = int(limit)
            queryset = queryset[:limit]
        except ValueError:
            queryset = queryset[:1000]
        
        # Serialize data
        data = []
        for record in queryset:
            data.append({
                'id': record.id,
                'year': record.year,
                'make': record.make,
                'model': record.model,
                'submodel': record.submodel,
                'drive_type': record.drive_type,
                'fuel_type': record.fuel_type,
                'num_doors': record.num_doors,
                'body_type': record.body_type,
                'engine_type': record.engine_type,
                'transmission': record.transmission,
                'trim_level': record.trim_level,
                'created_at': record.created_at.isoformat(),
                'updated_at': record.updated_at.isoformat(),
            })
        
        return Response({
            'data': data,
            'total_count': VCDBData.objects.count(),
            'returned_count': len(data)
        })
        
    except Exception as e:
        logger.error(f"Error getting VCDB data: {str(e)}")
        return Response(
            {"error": "Failed to get VCDB data"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def get_product_data(request):
    """Get all Product data from the database"""
    try:
        # Get tenant ID from header
        tenant_id = request.headers.get('X-Tenant-ID')
        
        # Get query parameters for filtering
        category = request.GET.get('category')
        part_type = request.GET.get('part_type')
        search = request.GET.get('search')  # Search in description
        limit = request.GET.get('limit', 1000)  # Default limit
        
        # Build query
        queryset = ProductData.objects.all()
        
        # Filter by tenant if provided
        if tenant_id:
            try:
                from tenants.models import Tenant
                tenant = Tenant.objects.get(id=tenant_id)
                queryset = queryset.filter(tenant=tenant)
            except Tenant.DoesNotExist:
                return Response(
                    {"error": "Invalid tenant ID"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        if category:
            queryset = queryset.filter(category__icontains=category)
        if part_type:
            queryset = queryset.filter(part_type__icontains=part_type)
        if search:
            queryset = queryset.filter(description__icontains=search)
        
        # Apply limit
        try:
            limit = int(limit)
            queryset = queryset[:limit]
        except ValueError:
            queryset = queryset[:1000]
        
        # Serialize data
        data = []
        for record in queryset:
            data.append({
                'id': record.id,
                'part_id': record.part_id,
                'description': record.description,
                'category': record.category,
                'part_type': record.part_type,
                'compatibility': record.compatibility,
                'specifications': record.specifications,
                'brand': record.brand,
                'sku': record.sku,
                'price': float(record.price) if record.price else None,
                'weight': float(record.weight) if record.weight else None,
                'dimensions': record.dimensions,
                'created_at': record.created_at.isoformat(),
                'updated_at': record.updated_at.isoformat(),
            })
        
        return Response({
            'data': data,
            'total_count': ProductData.objects.count(),
            'returned_count': len(data)
        })
        
    except Exception as e:
        logger.error(f"Error getting Product data: {str(e)}")
        return Response(
            {"error": "Failed to get Product data"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def get_data_status(request):
    """Get the current status of uploaded and processed data"""
    try:
        # Get tenant ID from header
        tenant_id = request.headers.get('X-Tenant-ID')
        
        # Build base querysets
        vcdb_queryset = VCDBData.objects.all()
        product_queryset = ProductData.objects.all()
        session_queryset = DataUploadSession.objects.all()
        
        # Filter by tenant if provided
        if tenant_id:
            try:
                from tenants.models import Tenant
                tenant = Tenant.objects.get(id=tenant_id)
                vcdb_queryset = vcdb_queryset.filter(tenant=tenant)
                product_queryset = product_queryset.filter(tenant=tenant)
                session_queryset = session_queryset.filter(tenant=tenant)
            except Tenant.DoesNotExist:
                return Response(
                    {"error": "Invalid tenant ID"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Get counts from database tables
        vcdb_count = vcdb_queryset.count()
        product_count = product_queryset.count()
        
        # Get latest session info (any session with valid files)
        latest_session = session_queryset.filter(
            Q(vcdb_valid=True) | Q(products_valid=True)
        ).order_by('-created_at').first()
        
        response_data = {
            'vcdb': {
                'exists': vcdb_count > 0,
                'record_count': vcdb_count,
                'filename': latest_session.vcdb_filename if latest_session else None,
                'uploaded_at': latest_session.created_at.isoformat() if latest_session and latest_session.vcdb_file else None,
                'valid': latest_session.vcdb_valid if latest_session else False,
            },
            'products': {
                'exists': product_count > 0,
                'record_count': product_count,
                'filename': latest_session.products_filename if latest_session else None,
                'uploaded_at': latest_session.created_at.isoformat() if latest_session and latest_session.products_file else None,
                'valid': latest_session.products_valid if latest_session else False,
            },
            'ready_for_fitment': (
                vcdb_count > 0 and 
                product_count > 0
            )
        }
        
        return Response(response_data)
        
    except Exception as e:
        logger.error(f"Error getting data status: {str(e)}")
        return Response(
            {"error": "Failed to get data status"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([AllowAny])
def get_dropdown_data(request):
    """Get dropdown data from VCDBData and ProductData tables"""
    try:
        # Get tenant ID from header
        tenant_id = request.headers.get('X-Tenant-ID')
        
        # Build base querysets
        vcdb_queryset = VCDBData.objects.all()
        product_queryset = ProductData.objects.all()
        
        # Filter by tenant if provided
        if tenant_id:
            try:
                from tenants.models import Tenant
                tenant = Tenant.objects.get(id=tenant_id)
                vcdb_queryset = vcdb_queryset.filter(tenant=tenant)
                product_queryset = product_queryset.filter(tenant=tenant)
            except Tenant.DoesNotExist:
                return Response(
                    {"error": "Invalid tenant ID"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Get unique values from VCDBData
        vcdb_years = vcdb_queryset.values_list('year', flat=True).distinct().order_by('year')
        vcdb_makes = vcdb_queryset.values_list('make', flat=True).distinct().order_by('make')
        vcdb_models = vcdb_queryset.values_list('model', flat=True).distinct().order_by('model')
        vcdb_submodels = vcdb_queryset.values_list('submodel', flat=True).distinct().order_by('submodel')
        vcdb_fuel_types = vcdb_queryset.values_list('fuel_type', flat=True).distinct().order_by('fuel_type')
        vcdb_body_types = vcdb_queryset.values_list('body_type', flat=True).distinct().order_by('body_type')
        vcdb_drive_types = vcdb_queryset.values_list('drive_type', flat=True).distinct().order_by('drive_type')
        vcdb_num_doors = vcdb_queryset.values_list('num_doors', flat=True).distinct().order_by('num_doors')
        vcdb_engine_types = vcdb_queryset.values_list('engine_type', flat=True).distinct().order_by('engine_type')
        vcdb_transmissions = vcdb_queryset.values_list('transmission', flat=True).distinct().order_by('transmission')
        vcdb_trim_levels = vcdb_queryset.values_list('trim_level', flat=True).distinct().order_by('trim_level')

        # Get unique values from ProductData
        product_ids = product_queryset.values_list('part_id', flat=True).distinct().order_by('part_id')
        product_categories = product_queryset.values_list('category', flat=True).distinct().order_by('category')
        product_brands = product_queryset.values_list('brand', flat=True).distinct().order_by('brand')
        positions = product_queryset.values_list('compatibility', flat=True).distinct().order_by('compatibility')

        response_data = {
            'years': [str(year) for year in vcdb_years if year],
            'makes': [make for make in vcdb_makes if make],
            'models': [model for model in vcdb_models if model],
            'submodels': [submodel for submodel in vcdb_submodels if submodel],
            'fuel_types': [fuel_type for fuel_type in vcdb_fuel_types if fuel_type],
            'body_types': [body_type for body_type in vcdb_body_types if body_type],
            'drive_types': [drive_type for drive_type in vcdb_drive_types if drive_type],
            'num_doors': [str(num_doors) for num_doors in vcdb_num_doors if num_doors],
            'engine_types': [engine_type for engine_type in vcdb_engine_types if engine_type],
            'transmissions': [transmission for transmission in vcdb_transmissions if transmission],
            'trim_levels': [trim_level for trim_level in vcdb_trim_levels if trim_level],
            'parts': [part_id for part_id in product_ids if part_id],
            'categories': [category for category in product_categories if category],
            'brands': [brand for brand in product_brands if brand],
            'positions': positions,
        }
        
        return Response(response_data)
        
    except Exception as e:
        print(f"Error in get_dropdown_data: {e}")
        return Response(
            {"error": "Failed to get dropdown data"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def get_filtered_vehicles(request):
    """Get filtered vehicles from VCDBData table based on provided filters"""
    try:
        # Get tenant ID from header
        tenant_id = request.headers.get('X-Tenant-ID')
        
        # Extract filters from request data
        filters = request.data.get('filters', {})
        
        # Build query for VCDBData
        queryset = VCDBData.objects.all()
        
        # Filter by tenant if provided
        if tenant_id:
            try:
                from tenants.models import Tenant
                tenant = Tenant.objects.get(id=tenant_id)
                queryset = queryset.filter(tenant=tenant)
            except Tenant.DoesNotExist:
                return Response(
                    {"error": "Invalid tenant ID"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Apply filters
        if filters.get('yearFrom'):
            try:
                year_from = int(filters['yearFrom'])
                queryset = queryset.filter(year__gte=year_from)
            except (ValueError, TypeError):
                pass
        
        if filters.get('yearTo'):
            try:
                year_to = int(filters['yearTo'])
                queryset = queryset.filter(year__lte=year_to)
            except (ValueError, TypeError):
                pass
        
        if filters.get('make'):
            queryset = queryset.filter(make__icontains=filters['make'])
        
        if filters.get('model'):
            queryset = queryset.filter(model__icontains=filters['model'])
        
        if filters.get('submodel'):
            queryset = queryset.filter(submodel__icontains=filters['submodel'])
        
        if filters.get('fuelType'):
            queryset = queryset.filter(fuel_type__icontains=filters['fuelType'])
        
        if filters.get('numDoors'):
            try:
                num_doors = int(filters['numDoors'])
                queryset = queryset.filter(num_doors=num_doors)
            except (ValueError, TypeError):
                pass
        
        if filters.get('driveType'):
            queryset = queryset.filter(drive_type__icontains=filters['driveType'])
        
        if filters.get('bodyType'):
            queryset = queryset.filter(body_type__icontains=filters['bodyType'])
        
        # Apply limit to prevent too many results
        limit = 1000  # Maximum 1000 vehicles
        queryset = queryset[:limit]
        
        # Serialize the results
        vehicles = []
        for vehicle in queryset:
            vehicles.append({
                'id': str(vehicle.id),
                'year': vehicle.year,
                'make': vehicle.make,
                'model': vehicle.model,
                'submodel': vehicle.submodel or '',
                'driveType': vehicle.drive_type or '',
                'fuelType': vehicle.fuel_type or '',
                'numDoors': vehicle.num_doors,
                'bodyType': vehicle.body_type or '',
                'engineType': vehicle.engine_type or '',
                'transmission': vehicle.transmission or '',
                'trimLevel': vehicle.trim_level or '',
            })
        
        return Response({
            'vehicles': vehicles,
            'total_count': len(vehicles),
            'filters_applied': filters
        })
        
    except Exception as e:
        logger.error(f"Error getting filtered vehicles: {str(e)}")
        return Response(
            {"error": "Failed to get filtered vehicles"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def get_lookup_data(request):
    """Get lookup data for fitment filters"""
    try:
        # Get all lookup data
        lift_heights = list(LiftHeight.objects.values('id', 'value'))
        wheel_types = list(WheelType.objects.values('id', 'value'))
        tire_diameters = list(TireDiameter.objects.values('id', 'value'))
        wheel_diameters = list(WheelDiameter.objects.values('id', 'value'))
        backspacing = list(Backspacing.objects.values('id', 'value'))
        
        return Response({
            'lift_heights': lift_heights,
            'wheel_types': wheel_types,
            'tire_diameters': tire_diameters,
            'wheel_diameters': wheel_diameters,
            'backspacing': backspacing,
        })
        
    except Exception as e:
        logger.error(f"Error getting lookup data: {str(e)}")
        return Response(
            {"error": "Failed to get lookup data"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def get_field_configuration(request):
    """Get field configuration for validation purposes"""
    try:
        from field_config.models import FieldConfiguration
        
        reference_type = request.GET.get('reference_type', 'both')
        
        # Get field configurations
        if reference_type == 'both':
            field_configs = FieldConfiguration.objects.filter(is_enabled=True)
        else:
            field_configs = FieldConfiguration.objects.filter(
                is_enabled=True
            ).filter(
                Q(reference_type=reference_type) | Q(reference_type='both')
            )
        
        # Serialize field configurations
        configs = []
        for config in field_configs.order_by('display_order'):
            configs.append({
                'name': config.name,
                'display_name': config.display_name,
                'description': config.description,
                'field_type': config.field_type,
                'reference_type': config.reference_type,
                'requirement_level': config.requirement_level,
                'is_enabled': config.is_enabled,
                'is_unique': config.is_unique,
                'min_length': config.min_length,
                'max_length': config.max_length,
                'min_value': float(config.min_value) if config.min_value else None,
                'max_value': float(config.max_value) if config.max_value else None,
                'enum_options': config.enum_options,
                'default_value': config.default_value,
                'display_order': config.display_order,
                'show_in_filters': config.show_in_filters,
                'show_in_forms': config.show_in_forms,
            })
        
        return Response({
            'field_configurations': configs,
            'reference_type': reference_type,
            'total_count': len(configs)
        })
        
    except Exception as e:
        logger.error(f"Error getting field configuration: {str(e)}")
        return Response(
            {"error": "Failed to get field configuration"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def validate_file_with_dynamic_fields(request):
    """Validate file data against dynamic field configurations"""
    try:
        file_type = request.data.get('file_type')  # 'vcdb' or 'product'
        file_data = request.data.get('file_data')  # Array of objects
        
        if not file_type or not file_data:
            return Response(
                {"error": "file_type and file_data are required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if file_type not in ['vcdb', 'product']:
            return Response(
                {"error": "file_type must be 'vcdb' or 'product'"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Convert file data to DataFrame
        df = pd.DataFrame(file_data)
        
        if df.empty:
            return Response({
                'is_valid': False,
                'errors': ['File is empty'],
                'validation_summary': {}
            })
        
        # Create dynamic validator
        dynamic_validator = DynamicFieldValidator(file_type)
        
        # Validate the data
        is_valid, errors = dynamic_validator.validate_dataframe(df)
        validation_summary = dynamic_validator.get_validation_summary(df)
        
        return Response({
            'is_valid': is_valid,
            'errors': errors,
            'validation_summary': validation_summary,
            'file_type': file_type,
            'total_records': len(df)
        })
        
    except Exception as e:
        logger.error(f"Error validating file with dynamic fields: {str(e)}")
        return Response(
            {"error": f"Validation failed: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def get_job_history(request):
    """Get job history for fitment processing"""
    try:
        # Get tenant from header or request
        tenant_id = request.headers.get('X-Tenant-ID') or request.GET.get('tenant_id')
        
        if not tenant_id:
            return Response(
                {'error': 'Tenant ID is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate tenant exists
        from tenants.models import Tenant
        try:
            tenant_obj = Tenant.objects.get(id=tenant_id)
        except Tenant.DoesNotExist:
            return Response(
                {'error': f'Tenant with ID {tenant_id} not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Get job history from both Job and FitmentJob models
        from workflow.models import Job
        from vcdb_categories.models import FitmentJob
        
        # Get jobs from workflow.Job
        workflow_jobs = Job.objects.filter(tenant_id=tenant_id).order_by('-created_at')
        
        # Get jobs from vcdb_categories.FitmentJob
        fitment_jobs = FitmentJob.objects.filter(tenant_id=tenant_id).order_by('-created_at')
        
        # Combine and format job history
        job_history = []
        
        # Add workflow jobs
        for job in workflow_jobs:
            duration = None
            if job.started_at and job.finished_at:
                duration = (job.finished_at - job.started_at).total_seconds()
            elif job.started_at:
                duration = (timezone.now() - job.started_at).total_seconds()

            job_history.append({
                'id': str(job.id),
                'job_type': job.job_type,
                'status': job.status,
                'created_at': job.created_at.isoformat(),
                'started_at': job.started_at.isoformat() if job.started_at else None,
                'finished_at': job.finished_at.isoformat() if job.finished_at else None,
                'result': job.result,
                'params': job.params,
                'progress': getattr(job, 'progress', 0),
                'duration': f"{int(duration)}s" if duration is not None else "Pending"
            })
        
        # Add fitment jobs
        for job in fitment_jobs:
            duration = None
            if job.started_at and job.completed_at:
                duration = (job.completed_at - job.started_at).total_seconds()
            elif job.started_at:
                duration = (timezone.now() - job.started_at).total_seconds()

            # Prepare result data
            result_data = {
                'fitments_created': job.fitments_created,
                'fitments_failed': job.fitments_failed,
                'error_message': job.error_message
            }
            
            # Add duplicate messages if available
            if hasattr(job, 'result') and job.result:
                result_data.update(job.result)
            
            job_history.append({
                'id': str(job.id),
                'job_type': job.job_type,
                'status': job.status,
                'created_at': job.created_at.isoformat(),
                'started_at': job.started_at.isoformat() if job.started_at else None,
                'finished_at': job.completed_at.isoformat() if job.completed_at else None,
                'result': result_data,
                'params': {
                    'vcdb_categories': job.vcdb_categories,
                    'product_fields': job.product_fields
                },
                'progress': job.progress_percentage or 0,
                'duration': f"{int(duration)}s" if duration is not None else "Pending"
            })
        
        # Sort by created_at descending
        job_history.sort(key=lambda x: x['created_at'], reverse=True)

        return Response({
            'job_history': job_history,
            'total_count': len(job_history)
        })

    except Exception as e:
        logger.error(f"Failed to get job history: {str(e)}", exc_info=True)
        return Response(
            {'error': f'Failed to get job history: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def get_job_status(request, job_id):
    """Get status of a specific job"""
    try:
        job_status = FitmentJobManager.get_job_status(job_id)
        
        if not job_status:
            return Response(
                {'error': 'Job not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        return Response(job_status)
        
    except Exception as e:
        logger.error(f"Failed to get job status: {str(e)}", exc_info=True)
        return Response(
            {'error': f'Failed to get job status: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


