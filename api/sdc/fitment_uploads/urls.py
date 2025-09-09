from django.urls import path
from . import views

urlpatterns = [
    path('upload-fitment-files/', views.upload_fitment_files, name='upload_fitment_files'),
    path('ai-fitment/', views.process_ai_fitment, name='process_ai_fitment'),
    path('apply-ai-fitments/', views.apply_ai_fitments, name='apply_ai_fitments'),
    path('session/<uuid:session_id>/status/', views.get_session_status, name='get_session_status'),
    path('export/', views.export_fitments, name='export_fitments'),
]
