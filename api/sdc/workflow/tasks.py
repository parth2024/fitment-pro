"""
Celery tasks for workflow job processing
"""

from celery import shared_task
from django.utils import timezone
from django.db import transaction
from .models import Job
import logging

logger = logging.getLogger(__name__)


@shared_task
def process_workflow_job(job_id):
    """Process a workflow job in the background"""
    try:
        job = Job.objects.get(id=job_id)
        
        # Update job status to processing
        job.status = 'processing'
        job.started_at = timezone.now()
        job.save()
        
        logger.info(f"Processing workflow job {job_id} of type {job.job_type}")
        
        # Process based on job type
        if job.job_type == 'manual_fitment':
            result = process_manual_fitment_job(job)
        elif job.job_type == 'ai_fitment':
            result = process_ai_fitment_job(job)
        else:
            # For other job types, just mark as completed
            result = {'message': f'Job type {job.job_type} processed successfully'}
        
        # Update job as completed
        job.status = 'completed'
        job.finished_at = timezone.now()
        job.result = result
        job.save()
        
        logger.info(f"Completed workflow job {job_id}")
        return result
        
    except Job.DoesNotExist:
        logger.error(f"Workflow job {job_id} not found")
        raise
    except Exception as e:
        logger.error(f"Failed to process workflow job {job_id}: {str(e)}")
        
        # Update job as failed
        try:
            job = Job.objects.get(id=job_id)
            job.status = 'failed'
            job.finished_at = timezone.now()
            job.result = {'error': str(e)}
            job.save()
        except Job.DoesNotExist:
            pass
        
        raise


def process_manual_fitment_job(job):
    """Process a manual fitment job"""
    try:
        # Import FitmentJobManager to use its processing logic
        from data_uploads.job_manager import FitmentJobManager
        
        # Extract job parameters
        params = job.params or {}
        session_id = params.get('session_id')
        vehicle_ids = params.get('vehicle_ids', [])
        part_id = params.get('part_id')
        fitment_data = params.get('fitment_data', {})
        
        if not session_id or not vehicle_ids or not part_id:
            raise ValueError("Missing required parameters for manual fitment job")
        
        # Get tenant
        tenant = job.tenant
        
        # Process the manual fitment using FitmentJobManager
        _, applied_fitments = FitmentJobManager.process_manual_fitment_job(
            tenant=tenant,
            session_id=session_id,
            vehicle_ids=vehicle_ids,
            part_id=part_id,
            fitment_data=fitment_data
        )
        
        return {
            'applied_count': len(applied_fitments),
            'session_id': session_id,
            'part_id': part_id,
            'vehicles_processed': len(vehicle_ids)
        }
        
    except Exception as e:
        logger.error(f"Failed to process manual fitment job: {str(e)}")
        raise


def process_ai_fitment_job(job):
    """Process an AI fitment job"""
    try:
        # Import FitmentJobManager to use its processing logic
        from data_uploads.job_manager import FitmentJobManager
        
        # Extract job parameters
        params = job.params or {}
        session_id = params.get('session_id')
        vcdb_data = params.get('vcdb_data', [])
        products_data = params.get('products_data', [])
        
        if not session_id or not vcdb_data or not products_data:
            raise ValueError("Missing required parameters for AI fitment job")
        
        # Get tenant
        tenant = job.tenant
        
        # Process the AI fitment using FitmentJobManager
        _, ai_fitments = FitmentJobManager.process_ai_fitment_job(
            tenant=tenant,
            session_id=session_id,
            vcdb_data=vcdb_data,
            products_data=products_data
        )
        
        return {
            'ai_fitments_count': len(ai_fitments),
            'session_id': session_id,
            'vcdb_records': len(vcdb_data),
            'products_records': len(products_data)
        }
        
    except Exception as e:
        logger.error(f"Failed to process AI fitment job: {str(e)}")
        raise


@shared_task
def process_pending_jobs():
    """Process all pending jobs in the queue"""
    try:
        # Get all pending jobs
        pending_jobs = Job.objects.filter(status='queued').order_by('created_at')
        
        logger.info(f"Found {pending_jobs.count()} pending jobs to process")
        
        for job in pending_jobs:
            try:
                # Update job status to processing
                job.status = 'processing'
                job.started_at = timezone.now()
                job.save()
                
                # Process the job directly
                process_workflow_job(str(job.id))
                logger.info(f"Processed job {job.id} directly")
            except Exception as e:
                logger.error(f"Failed to process job {job.id}: {str(e)}")
                # Mark job as failed
                job.status = 'failed'
                job.finished_at = timezone.now()
                job.result = {'error': str(e)}
                job.save()
                continue
        
        return f"Processed {pending_jobs.count()} jobs"
        
    except Exception as e:
        logger.error(f"Failed to process pending jobs: {str(e)}")
        raise


@shared_task
def monitor_pending_jobs():
    """Monitor and process any stuck pending jobs"""
    try:
        from django.utils import timezone
        from datetime import timedelta
        
        # Find jobs that have been pending for more than 5 minutes
        cutoff_time = timezone.now() - timedelta(minutes=5)
        stuck_jobs = Job.objects.filter(
            status='queued',
            created_at__lt=cutoff_time
        )
        
        if stuck_jobs.exists():
            logger.warning(f"Found {stuck_jobs.count()} stuck jobs, processing them...")
            return process_pending_jobs()
        else:
            logger.info("No stuck jobs found")
            return "No stuck jobs to process"
            
    except Exception as e:
        logger.error(f"Failed to monitor pending jobs: {str(e)}")
        raise
