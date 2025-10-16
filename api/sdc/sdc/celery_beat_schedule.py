from celery.schedules import crontab
from datetime import timedelta

# Celery Beat schedule for periodic tasks
CELERY_BEAT_SCHEDULE = {
    # VCDB Data Sync - Run quarterly (every 3 months on the 1st at 2 AM)
    'vcdb-quarterly-sync': {
        'task': 'vcdb.tasks.sync_vcdb_data_task',
        'schedule': crontab(day_of_month=1, hour=2, minute=0, month_of_year='1,4,7,10'),
        'args': (False,),  # Don't force sync
    },
    
    # VCDB Status Check - Run daily at 6 AM
    'vcdb-daily-status-check': {
        'task': 'vcdb.tasks.check_vcdb_sync_status',
        'schedule': crontab(hour=6, minute=0),
    },
    
    # Schedule next quarterly sync after each sync completes
    'schedule-next-quarterly-sync': {
        'task': 'vcdb.tasks.schedule_quarterly_vcdb_sync',
        'schedule': crontab(day_of_month=1, hour=3, minute=0, month_of_year='1,4,7,10'),
    },
}

# Use DatabaseScheduler for persistent task scheduling
CELERY_BEAT_SCHEDULER = 'django_celery_beat.schedulers:DatabaseScheduler'
