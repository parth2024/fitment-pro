from django.urls import path
from . import views

urlpatterns = [
    path('upload-fitment-files/', views.upload_fitment_files, name='upload_fitment_files'),
    path('ai-fitment/', views.process_ai_fitment, name='process_ai_fitment'),
    path('apply-ai-fitments/', views.apply_ai_fitments, name='apply_ai_fitments'),
    path('apply-manual-fitment/', views.apply_manual_fitment, name='apply_manual_fitment'),
    path('session/<uuid:session_id>/status/', views.get_session_status, name='get_session_status'),
    path('session/<uuid:session_id>/dropdown-data/', views.get_session_dropdown_data, name='get_session_dropdown_data'),
    path('filtered-vehicles/', views.get_filtered_vehicles, name='get_filtered_vehicles'),
    path('export/', views.export_fitments, name='export_fitments'),
]
