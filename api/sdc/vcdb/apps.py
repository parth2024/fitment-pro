from django.apps import AppConfig


class VcdbConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'vcdb'
    verbose_name = 'VCDB Data Management'
    
    def ready(self):
        # Import tasks to register them with Celery
        from . import tasks