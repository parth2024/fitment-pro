"""
Celery tasks for AI fitment generation
"""

from celery import shared_task
from django.utils import timezone
from django.db import transaction
import logging
from .models import AiFitmentJob, AiGeneratedFitment, ProductData, VCDBData
from .ai_fitment_processor import process_selected_products_for_ai_fitments, process_product_file_for_ai_fitments

logger = logging.getLogger(__name__)


@shared_task(bind=True)
def generate_ai_fitments_task(self, job_id):
    """
    Celery task to generate AI fitments for a job
    Handles both 'upload' and 'selection' job types
    """
    try:
        # Get the job
        job = AiFitmentJob.objects.get(id=job_id)
        
        # Update job status to processing
        job.status = 'processing'
        job.started_at = timezone.now()
        job.save()
        
        logger.info(f"Starting AI fitment generation for job {job_id} (type: {job.job_type})")
        
        # Update task progress - Initializing
        self.update_state(
            state='PROGRESS',
            meta={
                'current': 5,
                'total': 100,
                'status': 'Initializing AI fitment generation...',
                'job_id': str(job.id),
                'job_type': job.job_type
            }
        )
        
        # Process based on job type
        if job.job_type == 'upload':
            # Process uploaded file - more steps involved
            self.update_state(
                state='PROGRESS',
                meta={
                    'current': 10,
                    'total': 100,
                    'status': 'Validating uploaded product file...',
                    'job_id': str(job.id),
                    'job_type': job.job_type
                }
            )
            
            # The processor will handle:
            # 1. File validation
            # 2. Product DB check/creation
            # 3. VCDB data fetching
            # 4. Azure AI fitment generation
            success, message = process_product_file_for_ai_fitments(job)
            
        elif job.job_type == 'selection':
            # Process selected products - simpler flow
            self.update_state(
                state='PROGRESS',
                meta={
                    'current': 15,
                    'total': 100,
                    'status': 'Processing selected products...',
                    'job_id': str(job.id),
                    'job_type': job.job_type
                }
            )
            
            success, message = process_selected_products_for_ai_fitments(job)
            
        else:
            success = False
            message = f"Unknown job type: {job.job_type}"
        
        # Refresh job from DB to get updated status
        job.refresh_from_db()
        
        if success:
            # Job status is already set to 'review_required' by the processor
            # Get final fitments count
            fitments_count = AiGeneratedFitment.objects.filter(job=job).count()
            
            self.update_state(
                state='SUCCESS',
                meta={
                    'current': 100,
                    'total': 100,
                    'status': 'AI fitment generation completed successfully!',
                    'job_id': str(job.id),
                    'job_type': job.job_type,
                    'fitments_count': fitments_count
                }
            )
            
            logger.info(
                f"AI fitment generation completed for job {job_id}: "
                f"{fitments_count} fitments generated, status: {job.status}"
            )
            
            return {
                'status': job.status,  # Should be 'review_required'
                'job_id': str(job.id),
                'fitments_count': fitments_count,
                'product_count': job.product_count,
                'message': message
            }
        else:
            # Update job status to failed if not already set
            if job.status != 'failed':
                job.status = 'failed'
                job.error_message = message
                job.completed_at = timezone.now()
                job.save()
            
            self.update_state(
                state='FAILURE',
                meta={
                    'current': 0,
                    'total': 100,
                    'status': 'AI fitment generation failed',
                    'job_id': str(job.id),
                    'job_type': job.job_type,
                    'error': message
                }
            )
            
            logger.error(f"AI fitment generation failed for job {job_id}: {message}")
            
            return {
                'status': 'failed',
                'job_id': str(job.id),
                'error': message
            }
            
    except AiFitmentJob.DoesNotExist:
        error_msg = f"AI fitment job {job_id} not found"
        logger.error(error_msg)
        self.update_state(
            state='FAILURE',
            meta={'error': error_msg}
        )
        return {
            'status': 'failed',
            'error': error_msg
        }
        
    except Exception as e:
        error_msg = f"Unexpected error in AI fitment generation: {str(e)}"
        logger.error(error_msg, exc_info=True)
        
        # Update job status to failed
        try:
            job = AiFitmentJob.objects.get(id=job_id)
            job.status = 'failed'
            job.error_message = error_msg
            job.completed_at = timezone.now()
            job.save()
        except AiFitmentJob.DoesNotExist:
            pass
        
        self.update_state(
            state='FAILURE',
            meta={'error': error_msg}
        )
            
        return {
            'status': 'failed',
            'error': error_msg
        }


@shared_task
def cleanup_old_ai_jobs():
    """
    Cleanup old AI fitment jobs (older than 30 days)
    """
    try:
        from datetime import timedelta
        cutoff_date = timezone.now() - timedelta(days=30)
        
        old_jobs = AiFitmentJob.objects.filter(
            created_at__lt=cutoff_date,
            status__in=['completed', 'failed']
        )
        
        count = old_jobs.count()
        old_jobs.delete()
        
        logger.info(f"Cleaned up {count} old AI fitment jobs")
        return f"Cleaned up {count} old AI fitment jobs"
        
    except Exception as e:
        logger.error(f"Failed to cleanup old AI jobs: {str(e)}")
        return f"Cleanup failed: {str(e)}"
