import os
import csv
import json
import pandas as pd
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
from .models import DataUploadSession, FileValidationLog, DataProcessingLog
from .serializers import (
    DataUploadSessionSerializer, 
    DataUploadSessionListSerializer,
    FileUploadSerializer,
    FileInfoSerializer
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
            if not file_name.lower().endswith(('.csv', '.xlsx', '.xls')):
                self._log_validation(session, file_type, 'format', False, 
                                  f"Invalid file format. Expected CSV, XLSX, or XLS")
                return
            
            # Try to read the file
            try:
                if file_name.lower().endswith('.csv'):
                    df = pd.read_csv(file_field)
                else:
                    df = pd.read_excel(file_field)
                
                # Basic validation
                if df.empty:
                    self._log_validation(session, file_type, 'data', False, 
                                      "File is empty")
                    return
                
                # Update record count
                setattr(session, f'{file_type}_records', len(df))
                
                # Mark as valid
                setattr(session, f'{file_type}_valid', True)
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
        
        # Read file data
        file_name = getattr(session, f'{file_type}_filename')
        
        if file_name.lower().endswith('.csv'):
            df = pd.read_csv(file_field)
        else:
            df = pd.read_excel(file_field)
        
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
