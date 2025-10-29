from celery import shared_task
from django.core.management import call_command
from django.utils import timezone
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def sync_vcdb_data_task(self, force=False):
    """
    Celery task to sync VCDB data from AutoCare API
    This task should be scheduled to run quarterly
    """
    try:
        logger.info("Starting VCDB streaming sync task...")
        
        # Call the management command
        call_command('sync_vcdb_streaming', batch_size=200)
        
        logger.info("VCDB streaming sync task completed successfully")
        return {
            'status': 'success',
            'message': 'VCDB streaming sync completed successfully',
            'timestamp': timezone.now().isoformat()
        }
        
    except Exception as exc:
        logger.error(f"VCDB streaming sync task failed: {str(exc)}")
        
        # Retry the task with exponential backoff
        if self.request.retries < self.max_retries:
            retry_delay = 60 * (2 ** self.request.retries)  # 1min, 2min, 4min
            logger.info(f"Retrying VCDB streaming sync task in {retry_delay} seconds...")
            raise self.retry(countdown=retry_delay, exc=exc)
        
        # If all retries failed, log the error
        logger.error(f"VCDB streaming sync task failed after {self.max_retries} retries")
        return {
            'status': 'failed',
            'message': f'VCDB streaming sync failed: {str(exc)}',
            'timestamp': timezone.now().isoformat(),
            'retries': self.request.retries
        }


@shared_task
def schedule_quarterly_vcdb_sync():
    """
    Task to schedule the next quarterly VCDB sync
    This should be called after each sync to schedule the next one
    """
    try:
        # Calculate next quarter (3 months from now)
        next_sync = timezone.now() + timedelta(days=90)
        
        # Schedule the next sync
        sync_vcdb_data_task.apply_async(eta=next_sync)
        
        logger.info(f"Next VCDB sync scheduled for: {next_sync}")
        return {
            'status': 'success',
            'message': f'Next VCDB sync scheduled for {next_sync}',
            'next_sync': next_sync.isoformat()
        }
        
    except Exception as exc:
        logger.error(f"Failed to schedule next VCDB sync: {str(exc)}")
        return {
            'status': 'failed',
            'message': f'Failed to schedule next VCDB sync: {str(exc)}',
            'timestamp': timezone.now().isoformat()
        }


@shared_task
def check_vcdb_sync_status():
    """
    Task to check the status of VCDB data sync
    Returns information about the last sync and data counts
    """
    try:
        from vcdb.models import VCDBSyncLog, Make, Model, Vehicle
        
        # Get the last sync log
        last_sync = VCDBSyncLog.objects.order_by('-started_at').first()
        
        # Get data counts
        data_counts = {
            'makes': Make.objects.count(),
            'models': Model.objects.count(),
            'vehicles': Vehicle.objects.count(),
        }
        
        status = {
            'last_sync': last_sync.started_at.isoformat() if last_sync else None,
            'last_sync_status': last_sync.status if last_sync else None,
            'data_counts': data_counts,
            'timestamp': timezone.now().isoformat()
        }
        
        logger.info(f"VCDB sync status check completed: {status}")
        return status
        
    except Exception as exc:
        logger.error(f"Failed to check VCDB sync status: {str(exc)}")
        return {
            'status': 'error',
            'message': f'Failed to check VCDB sync status: {str(exc)}',
            'timestamp': timezone.now().isoformat()
        }
