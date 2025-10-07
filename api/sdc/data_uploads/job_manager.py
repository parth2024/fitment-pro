"""
Job Manager for Fitment Processing
Handles job creation, status updates, and tracking for both AI and manual fitment workflows
"""

import uuid
import logging
from datetime import datetime
from django.utils import timezone
from django.db import transaction
from workflow.models import Job, Upload
from tenants.models import Tenant

logger = logging.getLogger(__name__)


class FitmentJobManager:
    """Manages fitment processing jobs and status updates"""
    
    @staticmethod
    def create_job(tenant, job_type, params=None, upload_id=None):
        """Create a new job for fitment processing"""
        try:
            # Get or create upload record
            upload = None
            if upload_id:
                try:
                    upload = Upload.objects.get(id=upload_id)
                except Upload.DoesNotExist:
                    # Create a new upload record if it doesn't exist
                    upload = Upload.objects.create(
                        tenant=tenant,
                        status='active',
                        file_name=f'fitment_{job_type}_{upload_id}'
                    )
            else:
                # Create a new upload record
                upload = Upload.objects.create(
                    tenant=tenant,
                    status='active',
                    file_name=f'fitment_{job_type}_{uuid.uuid4().hex[:8]}'
                )
            
            # Create job record
            job = Job.objects.create(
                tenant=tenant,
                upload=upload,
                job_type=job_type,
                status='queued',
                params=params or {}
            )
            
            logger.info(f"Created job {job.id} for {job_type} with status {job.status}")
            
            # Dispatch the job to Celery for processing
            try:
                from workflow.tasks import process_workflow_job
                # Use apply_async with immediate execution fallback
                result = process_workflow_job.apply_async(
                    args=[str(job.id)],
                    queue='default',
                    routing_key='default'
                )
                logger.info(f"Dispatched job {job.id} to Celery for processing with task ID: {result.id}")
            except Exception as e:
                logger.error(f"Failed to dispatch job {job.id} to Celery: {str(e)}")
                # Try to process immediately as fallback
                try:
                    logger.info(f"Attempting immediate processing for job {job.id}")
                    from workflow.tasks import process_workflow_job
                    process_workflow_job(str(job.id))
                except Exception as fallback_error:
                    logger.error(f"Fallback processing also failed for job {job.id}: {str(fallback_error)}")
                    # Continue anyway - the job will remain queued
            
            return job
            
        except Exception as e:
            logger.error(f"Failed to create job: {str(e)}")
            raise
    
    @staticmethod
    def update_job_status(job_id, status, result=None, error=None):
        """Update job status and result"""
        try:
            job = Job.objects.get(id=job_id)
            
            # Update status
            job.status = status
            
            # Update timestamps
            if status == 'processing' and not job.started_at:
                job.started_at = timezone.now()
            elif status in ['completed', 'failed'] and not job.finished_at:
                job.finished_at = timezone.now()
            
            # Update result
            if result is not None:
                job.result = result
            elif error is not None:
                job.result = {'error': str(error)}
            
            job.save()
            
            logger.info(f"Updated job {job_id} status to {status}")
            return job
            
        except Job.DoesNotExist:
            logger.error(f"Job {job_id} not found")
            raise
        except Exception as e:
            logger.error(f"Failed to update job {job_id}: {str(e)}")
            raise
    
    @staticmethod
    def get_job_status(job_id):
        """Get current job status"""
        try:
            job = Job.objects.get(id=job_id)
            return {
                'id': str(job.id),
                'job_type': job.job_type,
                'status': job.status,
                'created_at': job.created_at.isoformat(),
                'started_at': job.started_at.isoformat() if job.started_at else None,
                'finished_at': job.finished_at.isoformat() if job.finished_at else None,
                'result': job.result,
                'params': job.params
            }
        except Job.DoesNotExist:
            return None
    
    @staticmethod
    def get_jobs_by_tenant(tenant_id, job_type=None, status=None):
        """Get jobs for a tenant with optional filtering"""
        try:
            tenant = Tenant.objects.get(id=tenant_id)
            jobs = Job.objects.filter(tenant=tenant)
            
            if job_type:
                jobs = jobs.filter(job_type=job_type)
            if status:
                jobs = jobs.filter(status=status)
            
            return jobs.order_by('-created_at')
        except Tenant.DoesNotExist:
            return []
    
    @staticmethod
    def process_ai_fitment_job(tenant, session_id, vcdb_data, products_data):
        """Process AI fitment job with proper status tracking"""
        try:
            # Create job
            job = FitmentJobManager.create_job(
                tenant=tenant,
                job_type='ai_fitment',
                params={
                    'session_id': session_id,
                    'vcdb_records': len(vcdb_data),
                    'products_records': len(products_data)
                }
            )
            
            # Update to processing
            FitmentJobManager.update_job_status(job.id, 'processing')
            
            # Import AI service
            from fitment_uploads.azure_ai_service import azure_ai_service
            
            # Process with AI
            ai_fitments = azure_ai_service.generate_fitments(vcdb_data, products_data)
            
            # Update job with results
            FitmentJobManager.update_job_status(
                job.id, 
                'completed', 
                result={
                    'ai_fitments_count': len(ai_fitments),
                    'session_id': session_id,
                    'vcdb_records': len(vcdb_data),
                    'products_records': len(products_data)
                }
            )
            
            return job, ai_fitments
            
        except Exception as e:
            logger.error(f"Failed to process AI fitment job: {str(e)}")
            if 'job' in locals():
                FitmentJobManager.update_job_status(job.id, 'failed', error=str(e))
            raise
    
    @staticmethod
    def process_manual_fitment_job(tenant, session_id, vehicle_ids, part_id, fitment_data):
        """Process manual fitment job with proper status tracking"""
        try:
            # Create job
            job = FitmentJobManager.create_job(
                tenant=tenant,
                job_type='manual_fitment',
                params={
                    'session_id': session_id,
                    'vehicle_ids': vehicle_ids,
                    'part_id': part_id,
                    'fitment_data': fitment_data
                }
            )
            
            # Update to processing
            FitmentJobManager.update_job_status(job.id, 'processing')
            
            # Import required models
            from .models import VCDBData, ProductData, AppliedFitment
            from fitments.models import Fitment
            
            # Validate vehicles exist
            vehicles = VCDBData.objects.filter(id__in=vehicle_ids, tenant=tenant)
            if not vehicles.exists():
                FitmentJobManager.update_job_status(
                    job.id, 
                    'failed', 
                    error='No vehicles found for the provided IDs'
                )
                return job, []
            
            # Validate part exists
            try:
                product = ProductData.objects.get(part_id=part_id, tenant=tenant)
            except ProductData.DoesNotExist:
                FitmentJobManager.update_job_status(
                    job.id, 
                    'failed', 
                    error=f'Part {part_id} not found in product database'
                )
                return job, []
            
            # Create fitments
            applied_fitments = []
            created_fitments = []
            duplicates_count = 0
            errors_count = 0
            
            for vehicle in vehicles:
                try:
                    # Check for existing fitment to avoid duplicates
                    existing_fitment = Fitment.objects.filter(
                        tenant=tenant,
                        partId=part_id,
                        year=int(vehicle.year),
                        makeName=str(vehicle.make),
                        modelName=str(vehicle.model),
                        subModelName=str(vehicle.submodel or ''),
                        isDeleted=False
                    ).first()
                
                    if existing_fitment:
                        logger.warning(f"Fitment already exists for {part_id} and {vehicle.year} {vehicle.make} {vehicle.model}")
                        duplicates_count += 1
                        continue
                
                    # Create Fitment record
                    fitment = Fitment.objects.create(
                        hash=uuid.uuid4().hex,
                        tenant=tenant,
                        partId=part_id,
                        itemStatus='Active',
                        itemStatusCode=0,
                        baseVehicleId=str(vehicle.id),
                        year=int(vehicle.year),
                        makeName=str(vehicle.make),
                        modelName=str(vehicle.model),
                        subModelName=str(vehicle.submodel or ''),
                        driveTypeName=str(vehicle.drive_type or ''),
                        fuelTypeName=str(vehicle.fuel_type or 'Gas'),
                        bodyNumDoors=int(vehicle.num_doors or 4),
                        bodyTypeName=str(vehicle.body_type or 'Sedan'),
                        ptid='PT-22',
                        partTypeDescriptor='Manual Fitment',
                        uom='EA',
                        quantity=int(fitment_data.get('quantity', 1)),
                        fitmentTitle=fitment_data.get('title', f"Manual Fitment - {part_id}"),
                        fitmentDescription=fitment_data.get('description', f"Manual fitment for {vehicle.make} {vehicle.model}"),
                        fitmentNotes=fitment_data.get('notes', 'Applied manually'),
                        position=fitment_data.get('position', 'Front'),
                        positionId=1,
                        liftHeight='Stock',
                        wheelType='Alloy',
                        fitmentType='manual_fitment',
                        createdBy='manual_user',
                        updatedBy='manual_user'
                    )
                    created_fitments.append(fitment)
                    
                    # Create AppliedFitment record for tracking
                    applied_fitment = AppliedFitment.objects.create(
                        session_id=session_id,
                        tenant=tenant,
                        part_id=part_id,
                        part_description=fitment_data.get('description', f"Manual fitment for {vehicle.make} {vehicle.model}"),
                        year=vehicle.year,
                        make=vehicle.make,
                        model=vehicle.model,
                        submodel=vehicle.submodel or '',
                        drive_type=vehicle.drive_type or '',
                        position=fitment_data.get('position', 'Front'),
                        quantity=fitment_data.get('quantity', 1),
                        title=fitment_data.get('title', f"Manual Fitment - {part_id}"),
                        description=fitment_data.get('description', f"Manual fitment for {vehicle.make} {vehicle.model}"),
                        notes=fitment_data.get('notes', 'Applied manually')
                    )
                    applied_fitments.append(applied_fitment)
                    
                except Exception as e:
                    logger.error(f"Failed to create fitment for vehicle {vehicle.id}: {str(e)}")
                    errors_count += 1
                    continue
            
            # Decide final status
            total_failures = duplicates_count + errors_count
            if len(created_fitments) == 0 and total_failures > 0:
                final_status = 'failed'
            elif len(created_fitments) > 0 and total_failures > 0:
                final_status = 'completed_with_warnings'
            else:
                final_status = 'completed'

            # Update job with results (include backward-compatible keys and UI-expected keys)
            FitmentJobManager.update_job_status(
                job.id, 
                final_status, 
                result={
                    'applied_count': len(applied_fitments),
                    'created_fitments': len(created_fitments),  # legacy count name
                    'fitments_created': len(created_fitments),   # UI expected
                    'fitments_failed': total_failures,           # UI expected (duplicates + errors)
                    'duplicates': duplicates_count,
                    'errors': errors_count,
                    'session_id': session_id,
                    'part_id': part_id,
                    'vehicles_processed': len(vehicle_ids)
                }
            )
            
            return job, applied_fitments
            
        except Exception as e:
            logger.error(f"Failed to process manual fitment job: {str(e)}")
            if 'job' in locals():
                FitmentJobManager.update_job_status(job.id, 'failed', error=str(e))
            raise
    
    @staticmethod
    def get_job_history(tenant_id, limit=50):
        """Get job history for a tenant"""
        try:
            tenant = Tenant.objects.get(id=tenant_id)
            jobs = Job.objects.filter(tenant=tenant).order_by('-created_at')[:limit]
            
            job_history = []
            for job in jobs:
                job_history.append({
                    'id': str(job.id),
                    'job_type': job.job_type,
                    'status': job.status,
                    'created_at': job.created_at.isoformat(),
                    'started_at': job.started_at.isoformat() if job.started_at else None,
                    'finished_at': job.finished_at.isoformat() if job.finished_at else None,
                    'duration': str(job.finished_at - job.started_at) if job.started_at and job.finished_at else None,
                    'result': job.result,
                    'progress': FitmentJobManager._calculate_progress(job)
                })
            
            return job_history
            
        except Tenant.DoesNotExist:
            return []
    
    @staticmethod
    def _calculate_progress(job):
        """Calculate progress percentage for a job"""
        if job.status == 'completed':
            return 100
        elif job.status == 'failed':
            return 0
        elif job.status == 'processing':
            return 50
        elif job.status == 'queued':
            return 10
        else:
            return 0
