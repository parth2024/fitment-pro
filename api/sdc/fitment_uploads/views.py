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
import uuid
from .models import FitmentUploadSession, AIFitmentResult, AppliedFitment
from fitments.models import Fitment
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
def get_ai_fitments(request):
    """Get AI-generated fitments for a session"""
    try:
        session_id = request.GET.get('session_id')
        
        if not session_id:
            return Response(
                {'error': 'Session ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            session = FitmentUploadSession.objects.get(id=session_id)
        except FitmentUploadSession.DoesNotExist:
            return Response(
                {'error': 'Session not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get AI results for this session
        ai_results = AIFitmentResult.objects.filter(session=session)
        results_serializer = AIFitmentResultSerializer(ai_results, many=True)
        
        return Response({
            'session_id': str(session_id),
            'fitments': results_serializer.data,
            'total_fitments': len(ai_results)
        })
        
    except Exception as e:
        return Response(
            {'error': f'Failed to get AI fitments: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def get_applied_fitments(request):
    """Get all applied fitments"""
    try:
        session_id = request.GET.get('session_id')
        
        if session_id:
            # Get fitments from specific session
            try:
                session = FitmentUploadSession.objects.get(id=session_id)
                fitments = AppliedFitment.objects.filter(session=session)
            except FitmentUploadSession.DoesNotExist:
                return Response(
                    {'error': 'Session not found'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            # Get all applied fitments
            fitments = AppliedFitment.objects.all()
        
        # Serialize results
        fitments_serializer = AppliedFitmentSerializer(fitments, many=True)
        
        return Response({
            'fitments': fitments_serializer.data,
            'total_fitments': len(fitments)
        })
        
    except Exception as e:
        return Response(
            {'error': f'Failed to get applied fitments: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def export_fitments(request):
    """Export fitments in various formats"""
    try:
        format_type = request.GET.get('format', 'csv').lower()
        session_id = request.GET.get('session_id')
        export_type = request.GET.get('type', 'ai_fitments').lower()  # 'ai_fitments' or 'applied_fitments'
        fitment_ids = request.GET.get('fitment_ids')  # Comma-separated list of fitment IDs
        
        # Validate required parameters
        if export_type == 'ai_fitments' and not session_id:
            return Response(
                {'error': 'Session ID is required for AI fitments export'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get session if provided
        session = None
        if session_id:
            try:
                session = FitmentUploadSession.objects.get(id=session_id)
            except FitmentUploadSession.DoesNotExist:
                return Response(
                    {'error': 'Session not found'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
        
        # Get fitments data
        fitments_data = []
        
        if export_type == 'ai_fitments':
            # Export AI-generated fitments
            if not session:
                return Response(
                    {'error': 'Session is required for AI fitments export'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            fitments = AIFitmentResult.objects.filter(session=session)
            
            # Filter by specific fitment IDs if provided
            if fitment_ids:
                try:
                    fitment_id_list = [int(id.strip()) for id in fitment_ids.split(',') if id.strip()]
                    fitments = fitments.filter(id__in=fitment_id_list)
                except ValueError:
                    return Response(
                        {'error': 'Invalid fitment IDs provided'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Convert to list of dictionaries
            for fitment in fitments:
                fitments_data.append({
                    'id': str(fitment.id),
                    'partId': fitment.part_id,
                    'partDescription': fitment.part_description,
                    'year': fitment.year,
                    'make': fitment.make,
                    'model': fitment.model,
                    'submodel': fitment.submodel,
                    'driveType': fitment.drive_type,
                    'position': fitment.position or 'N/A',
                    'quantity': fitment.quantity,
                    'confidence': fitment.confidence,
                    'aiReasoning': fitment.ai_reasoning,
                    'isSelected': fitment.is_selected,
                    'isApplied': fitment.is_applied,
                    'createdAt': fitment.created_at.isoformat()
                })
        else:
            # Export applied fitments
            if session:
                fitments = AppliedFitment.objects.filter(session=session)
            else:
                fitments = AppliedFitment.objects.all()
            
            # Convert to list of dictionaries
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
        
        # Check if we have data to export
        if not fitments_data:
            return Response(
                {'error': 'No fitments found to export'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Generate filename based on export type and selection
        if export_type == 'ai_fitments':
            if fitment_ids:
                filename_prefix = f"ai_fitments_selected_{len(fitments_data)}"
            else:
                filename_prefix = f"ai_fitments_all_{len(fitments_data)}"
        else:
            filename_prefix = f"applied_fitments_{len(fitments_data)}"
        
        # Return data in requested format
        if format_type == 'csv':
            df = pd.DataFrame(fitments_data)
            response = HttpResponse(content_type='text/csv; charset=utf-8')
            response['Content-Disposition'] = f'attachment; filename="{filename_prefix}.csv"'
            df.to_csv(response, index=False, encoding='utf-8')
            return response
            
        elif format_type == 'xlsx':
            df = pd.DataFrame(fitments_data)
            response = HttpResponse(
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            response['Content-Disposition'] = f'attachment; filename="{filename_prefix}.xlsx"'
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
        print(f"Export error: {str(e)}")
        return Response(
            {'error': f'Export failed: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def export_ai_fitments(request):
    """Export AI-generated fitments in various formats"""
    try:
        format_type = request.GET.get('format', 'csv').lower()
        session_id = request.GET.get('session_id')
        fitment_ids = request.GET.get('fitment_ids')  # Comma-separated list of fitment IDs
        
        # Validate required parameters
        if not session_id:
            return Response(
                {'error': 'Session ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get session
        try:
            session = FitmentUploadSession.objects.get(id=session_id)
        except FitmentUploadSession.DoesNotExist:
            return Response(
                {'error': 'Session not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get AI fitments
        fitments = AIFitmentResult.objects.filter(session=session)
        
        # Filter by specific fitment IDs if provided
        if fitment_ids:
            try:
                fitment_id_list = [int(id.strip()) for id in fitment_ids.split(',') if id.strip()]
                fitments = fitments.filter(id__in=fitment_id_list)
            except ValueError:
                return Response(
                    {'error': 'Invalid fitment IDs provided'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Convert to list of dictionaries
        fitments_data = []
        for fitment in fitments:
            fitments_data.append({
                'id': str(fitment.id),
                'partId': fitment.part_id,
                'partDescription': fitment.part_description,
                'year': fitment.year,
                'make': fitment.make,
                'model': fitment.model,
                'submodel': fitment.submodel,
                'driveType': fitment.drive_type,
                'position': fitment.position or 'N/A',
                'quantity': fitment.quantity,
                'confidence': fitment.confidence,
                'aiReasoning': fitment.ai_reasoning,
                'isSelected': fitment.is_selected,
                'isApplied': fitment.is_applied,
                'createdAt': fitment.created_at.isoformat()
            })
        
        # Check if we have data to export
        if not fitments_data:
            return Response(
                {'error': 'No AI fitments found to export'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Generate filename
        if fitment_ids:
            filename_prefix = f"ai_fitments_selected_{len(fitments_data)}"
        else:
            filename_prefix = f"ai_fitments_all_{len(fitments_data)}"
        
        # Return data in requested format
        if format_type == 'csv':
            # Create CSV manually to avoid pandas dependency issues
            import csv
            import io
            
            output = io.StringIO()
            if fitments_data:
                writer = csv.DictWriter(output, fieldnames=fitments_data[0].keys())
                writer.writeheader()
                writer.writerows(fitments_data)
            
            response = HttpResponse(output.getvalue(), content_type='text/csv; charset=utf-8')
            response['Content-Disposition'] = f'attachment; filename="{filename_prefix}.csv"'
            return response
            
        elif format_type == 'xlsx':
            try:
                df = pd.DataFrame(fitments_data)
                response = HttpResponse(
                    content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                )
                response['Content-Disposition'] = f'attachment; filename="{filename_prefix}.xlsx"'
                df.to_excel(response, index=False, engine='openpyxl')
                return response
            except Exception as e:
                print(f"XLSX export error: {str(e)}")
                return Response(
                    {'error': f'XLSX export failed: {str(e)}'}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
        elif format_type == 'json':
            return JsonResponse(fitments_data, safe=False)
            
        else:
            return Response(
                {'error': 'Unsupported format. Use csv, xlsx, or json'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
    except Exception as e:
        print(f"AI fitments export error: {str(e)}")
        return Response(
            {'error': f'Export failed: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def get_session_dropdown_data(request, session_id):
    """Get dropdown data for manual fitment based on session files"""
    try:
        # Get session
        try:
            session = FitmentUploadSession.objects.get(id=session_id)
        except FitmentUploadSession.DoesNotExist:
            return Response(
                {'error': 'Session not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Parse VCDB data to get unique values for dropdowns
        vcdb_data = parse_file_data(session.vcdb_file)
        
        # Extract unique values for each field
        years = sorted(list(set([item.get('year') for item in vcdb_data if item.get('year')])))
        makes = sorted(list(set([item.get('make') for item in vcdb_data if item.get('make')])))
        models = sorted(list(set([item.get('model') for item in vcdb_data if item.get('model')])))
        submodels = sorted(list(set([item.get('submodel') for item in vcdb_data if item.get('submodel')])))
        drive_types = sorted(list(set([item.get('driveType') for item in vcdb_data if item.get('driveType')])))
        fuel_types = sorted(list(set([item.get('fuelType') for item in vcdb_data if item.get('fuelType')])))
        num_doors = sorted(list(set([item.get('numDoors') for item in vcdb_data if item.get('numDoors')])))
        body_types = sorted(list(set([item.get('bodyType') for item in vcdb_data if item.get('bodyType')])))
        
        # Parse Products data to get unique part information
        products_data = parse_file_data(session.products_file)
        
        # Extract unique part information with better structure
        parts = []
        for item in products_data:
            part_id = item.get('id') or item.get('partId') or item.get('part_id')
            description = item.get('description') or item.get('partDescription') or item.get('part_description')
            if part_id and description:
                parts.append({
                    'value': part_id,
                    'label': f"{part_id} - {description}",
                    'description': description,
                    'category': item.get('category', ''),
                    'partType': item.get('partType', ''),
                    'compatibility': item.get('compatibility', 'Universal')
                })
        
        # Extract unique compatibility positions from products
        compatibility_positions = sorted(list(set([item.get('compatibility', 'Universal') for item in products_data if item.get('compatibility')])))
        
        # Create dropdown options
        dropdown_data = {
            'years': [{'value': str(year), 'label': str(year)} for year in years],
            'makes': [{'value': make, 'label': make} for make in makes],
            'models': [{'value': model, 'label': model} for model in models],
            'submodels': [{'value': submodel, 'label': submodel} for submodel in submodels],
            'drive_types': [{'value': drive_type, 'label': drive_type} for drive_type in drive_types],
            'fuel_types': [{'value': fuel_type, 'label': fuel_type} for fuel_type in fuel_types],
            'num_doors': [{'value': str(num_door), 'label': f"{num_door} Doors"} for num_door in num_doors],
            'body_types': [{'value': body_type, 'label': body_type} for body_type in body_types],
            'parts': parts,
            'positions': [{'value': pos, 'label': pos} for pos in compatibility_positions]
        }
        
        return Response({
            'session_id': str(session_id),
            'dropdown_data': dropdown_data,
            'total_vcdb_records': len(vcdb_data),
            'total_products_records': len(products_data)
        })
        
    except Exception as e:
        return Response(
            {'error': f'Failed to get dropdown data: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def get_filtered_vehicles(request):
    """Get filtered vehicles based on criteria from session data"""
    try:
        session_id = request.data.get('session_id')
        filters = request.data.get('filters', {})
        
        if not session_id:
            return Response(
                {'error': 'Session ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get session
        try:
            session = FitmentUploadSession.objects.get(id=session_id)
        except FitmentUploadSession.DoesNotExist:
            return Response(
                {'error': 'Session not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Parse VCDB data
        vcdb_data = parse_file_data(session.vcdb_file)
        
        # Apply filters
        filtered_vehicles = []
        for vehicle in vcdb_data:
            # Check each filter
            matches = True
            
            if filters.get('yearFrom') and vehicle.get('year', 0) < int(filters['yearFrom']):
                matches = False
            if filters.get('yearTo') and vehicle.get('year', 0) > int(filters['yearTo']):
                matches = False
            if filters.get('make') and filters['make'].lower() not in vehicle.get('make', '').lower():
                matches = False
            if filters.get('model') and filters['model'].lower() not in vehicle.get('model', '').lower():
                matches = False
            if filters.get('submodel') and filters['submodel'].lower() not in vehicle.get('submodel', '').lower():
                matches = False
            if filters.get('driveType') and vehicle.get('driveType') != filters['driveType']:
                matches = False
            if filters.get('fuelType') and vehicle.get('fuelType') != filters['fuelType']:
                matches = False
            if filters.get('numDoors') and str(vehicle.get('numDoors', '')) != filters['numDoors']:
                matches = False
            if filters.get('bodyType') and vehicle.get('bodyType') != filters['bodyType']:
                matches = False
            
            if matches:
                filtered_vehicles.append({
                    'id': vehicle.get('id'),
                    'year': vehicle.get('year'),
                    'make': vehicle.get('make'),
                    'model': vehicle.get('model'),
                    'submodel': vehicle.get('submodel'),
                    'driveType': vehicle.get('driveType'),
                    'fuelType': vehicle.get('fuelType'),
                    'numDoors': vehicle.get('numDoors'),
                    'bodyType': vehicle.get('bodyType'),
                })
        
        return Response({
            'session_id': str(session_id),
            'vehicles': filtered_vehicles,
            'total_count': len(filtered_vehicles),
            'filters_applied': filters
        })
        
    except Exception as e:
        return Response(
            {'error': f'Failed to get filtered vehicles: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def apply_manual_fitment(request):
    """Apply manual fitment with permutations/combinations"""
    try:
        session_id = request.data.get('session_id')
        vehicle_ids = request.data.get('vehicle_ids', [])
        part_id = request.data.get('part_id')
        position = request.data.get('position')
        quantity = request.data.get('quantity', 1)
        title = request.data.get('title', '')
        description = request.data.get('description', '')
        notes = request.data.get('notes', '')
        
        if not session_id or not vehicle_ids or not part_id:
            return Response(
                {'error': 'Session ID, vehicle IDs, and part ID are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get session
        try:
            session = FitmentUploadSession.objects.get(id=session_id)
        except FitmentUploadSession.DoesNotExist:
            return Response(
                {'error': 'Session not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Parse VCDB data to get vehicle details
        vcdb_data = parse_file_data(session.vcdb_file)
        vcdb_dict = {str(item.get('id')): item for item in vcdb_data}
        
        # Parse Products data to get part details
        products_data = parse_file_data(session.products_file)
        part_data = None
        for item in products_data:
            if item.get('id') == part_id or item.get('partId') == part_id or item.get('part_id') == part_id:
                part_data = item
                break
        
        if not part_data:
            return Response(
                {'error': 'Part not found in uploaded products'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create fitments for each selected vehicle
        applied_fitments = []
        created_fitments = []
        
        for vehicle_id in vehicle_ids:
            vehicle_data = vcdb_dict.get(str(vehicle_id))
            if not vehicle_data:
                continue
            
            # Create AppliedFitment record
            applied_fitment = AppliedFitment.objects.create(
                session=session,
                part_id=part_id,
                part_description=part_data.get('description', ''),
                year=vehicle_data.get('year'),
                make=vehicle_data.get('make'),
                model=vehicle_data.get('model'),
                submodel=vehicle_data.get('submodel'),
                drive_type=vehicle_data.get('driveType'),
                position=position or 'Universal',
                quantity=quantity,
                title=title or f"Manual Fitment - {part_id}",
                description=description,
                notes=notes
            )
            applied_fitments.append(applied_fitment)
            
            # Create Fitment record
            fitment = Fitment.objects.create(
                hash=uuid.uuid4().hex,
                partId=part_id,
                itemStatus='Active',
                itemStatusCode=0,
                baseVehicleId=str(vehicle_id),
                year=vehicle_data.get('year'),
                makeName=vehicle_data.get('make'),
                modelName=vehicle_data.get('model'),
                subModelName=vehicle_data.get('submodel'),
                driveTypeName=vehicle_data.get('driveType'),
                fuelTypeName=vehicle_data.get('fuelType', 'Gas'),
                bodyNumDoors=vehicle_data.get('numDoors', 4),
                bodyTypeName=vehicle_data.get('bodyType', 'Sedan'),
                ptid='PT-22',  # Default part type ID
                partTypeDescriptor=part_data.get('description', ''),
                uom='EA',  # Each
                quantity=quantity,
                fitmentTitle=title or f"Manual Fitment - {part_id}",
                fitmentDescription=description,
                fitmentNotes=notes,
                position=position or 'Universal',
                positionId=1,  # Default position ID
                liftHeight='Stock',  # Default value
                wheelType='Alloy',  # Default value
                createdBy='manual_user',
                updatedBy='manual_user'
            )
            created_fitments.append(fitment)
        
        return Response({
            'message': f'Successfully applied fitment to {len(applied_fitments)} vehicles',
            'applied_count': len(applied_fitments),
            'session_id': str(session_id),
            'part_id': part_id,
            'vehicles_processed': len(vehicle_ids)
        })
        
    except Exception as e:
        return Response(
            {'error': f'Failed to apply manual fitment: {str(e)}'}, 
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