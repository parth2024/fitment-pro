"""
Management command to process pending jobs
"""

from django.core.management.base import BaseCommand
from workflow.models import Job
from workflow.tasks import process_pending_jobs


class Command(BaseCommand):
    help = 'Process all pending jobs in the queue'

    def handle(self, *args, **options):
        try:
            # Count pending jobs
            pending_count = Job.objects.filter(status='queued').count()
            
            if pending_count == 0:
                self.stdout.write(
                    self.style.SUCCESS('No pending jobs found')
                )
                return
            
            self.stdout.write(
                self.style.WARNING(f'Found {pending_count} pending jobs')
            )
            
            # Process pending jobs
            result = process_pending_jobs.delay()
            
            self.stdout.write(
                self.style.SUCCESS(f'Dispatched {pending_count} jobs for processing')
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error processing pending jobs: {str(e)}')
            )
