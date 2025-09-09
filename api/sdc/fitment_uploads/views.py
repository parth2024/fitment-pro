from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.views import View
import pandas as pd
import json
import asyncio
from .models import FitmentUploadSession, AIFitmentResult, AppliedFitment
from .serializers import (
    FitmentUploadSessionSerializer, 
    AIFitmentResultSerializer, 
    AppliedFitmentSerializer,
    FileUploadSerializer,
    AIFitmentRequestSerializer,
    ApplyFitmentsRequestSerializer
)
from .azure_ai_service import azure_ai_service


@api_view(['POST'])
@permission_classes([AllowAny])
def upload_fitment_files(request):
    """Upload VCDB and Products files for fitment processing"""
    try:
        # Validate files
        vcdb_file = request.FILES.get('vcdb_file')
        products_file = request.FILES.get('products_file')
        print(f'vcdb_file: {vcdb_file}')
        print(f'products_file: {products_file}')
        
        if not vcdb_file or not products_file:
            return Response(
                {'error': 'Both VCDB and Products files are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate file types
        allowed_extensions = ['.csv', '.xlsx', '.json']
        vcdb_ext = vcdb_file.name.lower().split('.')[-1]
        products_ext = products_file.name.lower().split('.')[-1]
        
        if f'.{vcdb_ext}' not in allowed_extensions or f'.{products_ext}' not in allowed_extensions:
            return Response(
                {'error': 'Only CSV, XLSX, and JSON files are allowed'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create session
        session = FitmentUploadSession.objects.create(
            vcdb_file=vcdb_file,
            products_file=products_file,
            vcdb_filename=vcdb_file.name,
            products_filename=products_file.name,
            status='uploaded'
        )
        
        # Parse and count records
        try:
            vcdb_data = parse_file_data(vcdb_file)
            products_data = parse_file_data(products_file)
            
            session.vcdb_records = len(vcdb_data) if isinstance(vcdb_data, list) else 0
            session.products_records = len(products_data) if isinstance(products_data, list) else 0
            session.save()
            
        except Exception as e:
            session.status = 'error'
            session.save()
            print(f'Failed to parse files: {str(e)}')
            return Response(
                {'error': f'Failed to parse files: {str(e)}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = FitmentUploadSessionSerializer(session)
        return Response({
            'message': 'Files uploaded successfully',
            'session': serializer.data
        })
        
    except Exception as e:
        return Response(
            {'error': f'Upload failed: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def process_ai_fitment(request):
    """Process AI fitment using Azure AI Foundry"""
    try:
        serializer = AIFitmentRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        session_id = serializer.validated_data['session_id']
        
        try:
            session = FitmentUploadSession.objects.get(id=session_id)
        except FitmentUploadSession.DoesNotExist:
            return Response(
                {'error': 'Session not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Update session status
        session.status = 'processing'
        session.save()
        
        # Load data files
        vcdb_data = parse_file_data(session.vcdb_file)
        products_data = parse_file_data(session.products_file)
        
        # Process with AI
        ai_fitments = asyncio.run(azure_ai_service.generate_fitments(vcdb_data, products_data))
        
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
        
        return Response({
            'message': 'AI fitment processing completed',
            'session_id': str(session_id),
            'fitments': results_serializer.data,
            'total_fitments': len(ai_results)
        })
        
    except Exception as e:
        return Response(
            {'error': f'AI processing failed: {str(e)}'}, 
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
            session = FitmentUploadSession.objects.get(id=session_id)
        except FitmentUploadSession.DoesNotExist:
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
                position=ai_result.position,
                quantity=ai_result.quantity,
                title=f"AI Generated Fitment",
                description=ai_result.ai_reasoning
            )
            
            # Mark AI result as applied
            ai_result.is_applied = True
            ai_result.save()
            
            applied_count += 1
        
        return Response({
            'message': f'Successfully applied {applied_count} fitments',
            'applied_count': applied_count,
            'session_id': str(session_id)
        })
        
    except Exception as e:
        return Response(
            {'error': f'Failed to apply fitments: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def get_session_status(request, session_id):
    """Get the status of a fitment session"""
    try:
        session = FitmentUploadSession.objects.get(id=session_id)
        serializer = FitmentUploadSessionSerializer(session)
        
        # Check for AI results
        has_ai_results = AIFitmentResult.objects.filter(session=session).exists()
        has_applied_fitments = AppliedFitment.objects.filter(session=session).exists()
        
        return Response({
            'session': serializer.data,
            'has_ai_results': has_ai_results,
            'has_applied_fitments': has_applied_fitments
        })
        
    except FitmentUploadSession.DoesNotExist:
        return Response(
            {'error': 'Session not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {'error': f'Failed to get session status: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def export_fitments(request):
    """Export fitments in various formats"""
    try:
        format_type = request.GET.get('format', 'csv').lower()
        session_id = request.GET.get('session_id')
        
        if session_id:
            # Export from specific session
            try:
                session = FitmentUploadSession.objects.get(id=session_id)
                fitments = AppliedFitment.objects.filter(session=session)
            except FitmentUploadSession.DoesNotExist:
                return Response(
                    {'error': 'Session not found'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            # Export all fitments
            fitments = AppliedFitment.objects.all()
        
        # Convert to list of dictionaries
        fitments_data = []
        for fitment in fitments:
            fitments_data.append({
                'partId': fitment.part_id,
                'partDescription': fitment.part_description,
                'year': fitment.year,
                'make': fitment.make,
                'model': fitment.model,
                'submodel': fitment.submodel,
                'driveType': fitment.drive_type,
                'position': fitment.position,
                'quantity': fitment.quantity,
                'title': fitment.title,
                'description': fitment.description,
                'notes': fitment.notes,
                'appliedAt': fitment.applied_at.isoformat()
            })
        
        if format_type == 'csv':
            df = pd.DataFrame(fitments_data)
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = 'attachment; filename="fitments.csv"'
            df.to_csv(response, index=False)
            return response
            
        elif format_type == 'xlsx':
            df = pd.DataFrame(fitments_data)
            response = HttpResponse(
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            response['Content-Disposition'] = 'attachment; filename="fitments.xlsx"'
            df.to_excel(response, index=False, engine='openpyxl')
            return response
            
        elif format_type == 'json':
            return JsonResponse(fitments_data, safe=False)
            
        else:
            return Response(
                {'error': 'Unsupported format. Use csv, xlsx, or json'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
    except Exception as e:
        return Response(
            {'error': f'Export failed: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


def parse_file_data(file):
    """Parse uploaded file based on extension"""
    try:
        file_extension = file.name.lower().split('.')[-1]
        
        # Reset file pointer to beginning for all file types
        file.seek(0)
        
        if file_extension == 'csv':
            df = pd.read_csv(file)
            return df.to_dict('records')
        elif file_extension == 'xlsx':
            df = pd.read_excel(file)
            return df.to_dict('records')
        elif file_extension == 'json':
            data = json.load(file)
            if isinstance(data, list):
                return data
            elif isinstance(data, dict):
                return [data]
            else:
                return []
        else:
            raise ValueError(f"Unsupported file type: {file_extension}")
    except Exception as e:
        raise ValueError(f"Failed to parse file: {str(e)}")