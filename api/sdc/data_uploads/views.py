import os
import csv
import json
import pandas as pd
import requests
import uuid
from django.conf import settings
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils.decorators import method_decorator
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from fitment_uploads.azure_ai_service import azure_ai_service
from .models import DataUploadSession, FileValidationLog, DataProcessingLog, AIFitmentResult, AppliedFitment
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
import logging

logger = logging.getLogger(__name__)


class DataUploadSessionView(APIView):
    """API view for managing data upload sessions"""
    
    def get(self, request):
        """Get all data upload sessions"""
        sessions = DataUploadSession.objects.all()
        serializer = DataUploadSessionListSerializer(sessions, many=True)
        return Response(serializer.data)
    
    def post(self, request):
        """Create a new data upload session"""
        serializer = FileUploadSerializer(data=request.data)
        if serializer.is_valid():
            # Create new session
            session = DataUploadSession.objects.create()
            
            # Handle file uploads
            vcdb_file = request.FILES.get('vcdb_file')
            products_file = request.FILES.get('products_file')
            
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
            self._validate_files(session)
            
            response_serializer = DataUploadSessionSerializer(session)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def _validate_files(self, session):
        """Validate uploaded files"""
        if session.vcdb_file:
            self._validate_file(session, 'vcdb')
        if session.products_file:
            self._validate_file(session, 'products')
    
    def _validate_file(self, session, file_type):
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
            
            # Try to read the file with robust error handling
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
                
                # Basic validation
                if df.empty:
                    self._log_validation(session, file_type, 'data', False, 
                                      "File is empty")
                    return
                
                # Update record count
                setattr(session, f'{file_type}_records', len(df))
                
                # Mark as valid
                setattr(session, f'{file_type}_valid', True)
                session.save()  # Save the changes
                self._log_validation(session, file_type, 'data', True, 
                                  f"File validated successfully. {len(df)} records found")
                
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
    """Process AI fitment using uploaded session data"""
    try:
        logger.info(f"AI fitment processing request: {request.data}")
        session_id = request.data.get('session_id')
        if not session_id:
            return Response(
                {"error": "session_id is required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get the session
        try:
            session = DataUploadSession.objects.get(id=session_id)
        except DataUploadSession.DoesNotExist:
            return Response(
                {"error": "Session not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if both files are available and valid
        if not session.vcdb_file or not session.products_file:
            return Response(
                {"error": "Both VCDB and Products files are required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not session.vcdb_valid or not session.products_valid:
            return Response(
                {"error": "Files must be valid before processing"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Read the uploaded files
        # Construct full file paths
        vcdb_file_path = os.path.join(settings.MEDIA_ROOT, session.vcdb_file.name) if hasattr(session.vcdb_file, 'name') else session.vcdb_file
        products_file_path = os.path.join(settings.MEDIA_ROOT, session.products_file.name) if hasattr(session.products_file, 'name') else session.products_file
        
        # Read the files with robust error handling
        def read_file_robustly(file_path, filename):
            """Read file with multiple fallback strategies"""
            try:
                if filename.lower().endswith('.csv'):
                    # Try different CSV reading approaches
                    try:
                        return pd.read_csv(file_path)
                    except pd.errors.ParserError:
                        try:
                            return pd.read_csv(file_path, sep=';')
                        except pd.errors.ParserError:
                            try:
                                return pd.read_csv(file_path, sep='\t')
                            except pd.errors.ParserError:
                                try:
                                    return pd.read_csv(file_path, error_bad_lines=False, warn_bad_lines=True)
                                except:
                                    return pd.read_csv(file_path, low_memory=False)
                elif filename.lower().endswith('.json'):
                    import json
                    with open(file_path, 'r') as f:
                        data = json.load(f)
                    if isinstance(data, list):
                        return pd.DataFrame(data)
                    elif isinstance(data, dict):
                        return pd.DataFrame([data])
                    else:
                        return pd.DataFrame()
                elif filename.lower().endswith('.xlsx'):
                    return pd.read_excel(file_path, engine='openpyxl')
                elif filename.lower().endswith('.xls'):
                    return pd.read_excel(file_path, engine='xlrd')
                else:
                    # Default to CSV with error handling
                    return pd.read_csv(file_path, error_bad_lines=False, warn_bad_lines=True)
            except Exception as e:
                logger.error(f"Failed to read file {filename}: {str(e)}")
                raise e

        # Read VCDB file
        try:
            vcdb_df = read_file_robustly(vcdb_file_path, session.vcdb_filename)
        except Exception as e:
            logger.error(f"Failed to read VCDB file: {str(e)}")
            return Response(
                {"error": f"Failed to read VCDB file: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
        # Read Products file
        try:
            products_df = read_file_robustly(products_file_path, session.products_filename)
        except Exception as e:
            logger.error(f"Failed to read Products file: {str(e)}")
            return Response(
                {"error": f"Failed to read Products file: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Convert to temporary files for AI processing
        temp_dir = os.path.join(settings.MEDIA_ROOT, 'temp')
        os.makedirs(temp_dir, exist_ok=True)
        
        vcdb_temp_path = os.path.join(temp_dir, f"vcdb_{uuid.uuid4().hex}.csv")
        products_temp_path = os.path.join(temp_dir, f"products_{uuid.uuid4().hex}.csv")
        
        # Save as CSV for AI processing
        vcdb_df.to_csv(vcdb_temp_path, index=False)
        products_df.to_csv(products_temp_path, index=False)

         # Process with AI
        # Convert DataFrames to lists of dictionaries for AI processing
        vcdb_data = vcdb_df.to_dict('records')
        products_data = products_df.to_dict('records')
        ai_fitments = azure_ai_service.generate_fitments(vcdb_data, products_data)
        
        # Save AI results
        ai_results = []
        for fitment_data in ai_fitments:
            ai_result = AIFitmentResult.objects.create(
                session=session,
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
                ai_reasoning=fitment_data['ai_reasoning']
            )
            ai_results.append(ai_result)
        
        # Update session status
        session.status = 'completed'
        session.save()
        
        # Serialize results
        results_serializer = AIFitmentResultSerializer(ai_results, many=True)
        try:
            os.remove(vcdb_temp_path)
            os.remove(products_temp_path)
        except:
            pass
        
        # Log the processing
        DataProcessingLog.objects.create(
            session=session,
            step='ai_fitment',
            status='completed',
            message=f"Generated {len(ai_fitments)} AI fitments",
            details={'records_processed': len(ai_fitments)}
        )
        
        return Response({
             'message': 'AI fitment processing completed',
            'fitments': results_serializer.data,
            'session_id': str(session.id),
            'total_count': len(ai_fitments)
        })
        
    except Exception as e:
        logger.error(f"Error processing AI fitment: {str(e)}", exc_info=True)
        return Response(
            {"error": f"Failed to process AI fitment: {str(e)}"}, 
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
    """Apply manual fitment to selected vehicles"""
    try:
        # Extract data from request
        session_id = request.data.get('session_id')
        vehicle_ids = request.data.get('vehicle_ids', [])
        part_id = request.data.get('part_id')
        part_type = request.data.get('part_type')
        position = request.data.get('position', '')
        quantity = request.data.get('quantity', 1)
        title = request.data.get('title', '')
        description = request.data.get('description', '')
        notes = request.data.get('notes', '')
        
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
        
        # Get session
        try:
            session = DataUploadSession.objects.get(id=session_id)
        except DataUploadSession.DoesNotExist:
            return Response(
                {'error': 'Session not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Validate session has valid files
        if not session.vcdb_valid or not session.products_valid:
            return Response(
                {'error': 'Files must be valid before applying fitments'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get vehicle data from session
        try:
            vcdb_file_path = os.path.join(settings.MEDIA_ROOT, session.vcdb_file.name)
            
            # Try to read the file with different methods based on extension
            if session.vcdb_filename.lower().endswith('.csv'):
                # Try different CSV reading approaches
                try:
                    # First try with default settings
                    vehicles_df = pd.read_csv(vcdb_file_path)
                except pd.errors.ParserError:
                    try:
                        # Try with different separators
                        vehicles_df = pd.read_csv(vcdb_file_path, sep=';')
                    except pd.errors.ParserError:
                        try:
                            # Try with tab separator
                            vehicles_df = pd.read_csv(vcdb_file_path, sep='\t')
                        except pd.errors.ParserError:
                            try:
                                # Try with error handling
                                vehicles_df = pd.read_csv(vcdb_file_path, error_bad_lines=False, warn_bad_lines=True)
                            except:
                                # Last resort: try with low_memory=False
                                vehicles_df = pd.read_csv(vcdb_file_path, low_memory=False)
            elif session.vcdb_filename.lower().endswith('.json'):
                import json
                with open(vcdb_file_path, 'r') as f:
                    data = json.load(f)
                if isinstance(data, list):
                    vehicles_df = pd.DataFrame(data)
                elif isinstance(data, dict):
                    vehicles_df = pd.DataFrame([data])
                else:
                    vehicles_df = pd.DataFrame()
            elif session.vcdb_filename.lower().endswith('.xlsx'):
                vehicles_df = pd.read_excel(vcdb_file_path, engine='openpyxl')
            elif session.vcdb_filename.lower().endswith('.xls'):
                vehicles_df = pd.read_excel(vcdb_file_path, engine='xlrd')
            else:
                # Default to CSV with error handling
                vehicles_df = pd.read_csv(vcdb_file_path, error_bad_lines=False, warn_bad_lines=True)
            
            # Check if DataFrame is empty
            if vehicles_df.empty:
                return Response(
                    {'error': 'No data found in VCDB file'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check if 'id' column exists, if not try common alternatives
            if 'id' not in vehicles_df.columns:
                # Try common ID column names
                id_columns = ['ID', 'Id', 'vehicle_id', 'VehicleID', 'vehicleId', 'index']
                for col in id_columns:
                    if col in vehicles_df.columns:
                        vehicles_df = vehicles_df.rename(columns={col: 'id'})
                        break
                else:
                    # If no ID column found, create one from index
                    vehicles_df['id'] = vehicles_df.index.astype(str)
            
            # Filter vehicles by IDs
            selected_vehicles = vehicles_df[vehicles_df['id'].isin(vehicle_ids)]
            
            if selected_vehicles.empty:
                return Response(
                    {'error': 'No matching vehicles found'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
        except Exception as e:
            logger.error(f"Failed to read vehicle data: {str(e)}", exc_info=True)
            return Response(
                {'error': f'Failed to read vehicle data: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Create fitments for each selected vehicle
        applied_fitments = []
        
        for _, vehicle in selected_vehicles.iterrows():
            try:
                # Create Fitment record
                fitment = Fitment.objects.create(
                    hash=uuid.uuid4().hex,
                    partId=part_id,
                    itemStatus='Active',
                    itemStatusCode=0,
                    baseVehicleId=str(vehicle.get('id', '')),
                    year=int(vehicle.get('year', 2025)),
                    makeName=str(vehicle.get('make', '')),
                    modelName=str(vehicle.get('model', '')),
                    subModelName=str(vehicle.get('submodel', '')),
                    driveTypeName=str(vehicle.get('driveType', '')),
                    fuelTypeName=str(vehicle.get('fuelType', 'Gas')),
                    bodyNumDoors=int(vehicle.get('numDoors', 4)),
                    bodyTypeName=str(vehicle.get('bodyType', 'Sedan')),
                    ptid=part_type or 'PT-22',
                    partTypeDescriptor=part_type or 'Manual Fitment',
                    uom='EA',
                    quantity=int(quantity),
                    fitmentTitle=title or f"Manual Fitment - {part_id}",
                    fitmentDescription=description or f"Manual fitment for {vehicle.get('make', '')} {vehicle.get('model', '')}",
                    fitmentNotes=notes or f"Applied manually from session {session_id}",
                    position=position or 'Front',
                    positionId=1,
                    liftHeight='Stock',
                    wheelType='Alloy',
                    createdBy='manual_user',
                    updatedBy='manual_user'
                )
                
                applied_fitments.append({
                    'vehicle_id': vehicle.get('id'),
                    'vehicle_info': f"{vehicle.get('year', '')} {vehicle.get('make', '')} {vehicle.get('model', '')}",
                    'fitment_hash': fitment.hash
                })
                
            except Exception as e:
                logger.error(f"Failed to create fitment for vehicle {vehicle.get('id', '')}: {str(e)}", exc_info=True)
                continue
        
        # Log the processing activity
        try:
            DataProcessingLog.objects.create(
                session=session,
                step='manual_fitment',
                status='completed',
                message=f"Applied manual fitment to {len(applied_fitments)} vehicles",
                details={'records_processed': len(applied_fitments), 'part_id': part_id}
            )
        except Exception as e:
            logger.error(f"Failed to create processing log: {str(e)}", exc_info=True)
        
        return Response({
            'message': f'Successfully applied fitment to {len(applied_fitments)} vehicles',
            'applied_fitments': applied_fitments,
            'session_id': str(session_id),
            'part_id': part_id
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
        
        try:
            session = DataUploadSession.objects.get(id=session_id)
        except DataUploadSession.DoesNotExist:
            return Response(
                {'error': 'Session not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
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
            
            # Create Fitment record
            fitment = Fitment.objects.create(
                hash=uuid.uuid4().hex,
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
                createdBy='ai_system',
                updatedBy='ai_system'
            )
            
            # Mark AI result as applied
            ai_result.is_applied = True
            ai_result.save()
            
            applied_count += 1
        
        # Log the processing activity
        try:
            DataProcessingLog.objects.create(
                session=session,
                step='apply_ai_fitments',
                status='completed',
                message=f"Applied {applied_count} AI fitments to database",
                details={'records_processed': applied_count, 'fitment_ids': fitment_ids}
            )
        except Exception as e:
            logger.error(f"Failed to create processing log: {str(e)}", exc_info=True)
        
        return Response({
            'message': f'Successfully applied {applied_count} fitments',
            'applied_count': applied_count,
            'session_id': str(session_id)
        })
        
    except Exception as e:
        logger.error(f"Failed to apply fitments: {str(e)}", exc_info=True)
        return Response(
            {'error': f'Failed to apply fitments: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
