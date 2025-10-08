from django.urls import path
from . import views

urlpatterns = [
    # Data upload session management
    path('sessions/', views.DataUploadSessionView.as_view(), name='data_upload_sessions'),
    path('sessions/<uuid:session_id>/', views.DataUploadSessionDetailView.as_view(), name='data_upload_session_detail'),
    
    # Data status and file operations
    path('status/', views.get_current_data_status, name='data_status'),
    path('data-status/', views.get_data_status, name='new_data_status'),
    path('replace-file/', views.replace_file, name='replace_file'),
    path('sessions/<uuid:session_id>/data/<str:file_type>/', views.get_file_data, name='get_file_data'),
    
    # Data retrieval endpoints
    path('vcdb/', views.get_vcdb_data, name='get_vcdb_data'),
    path('products/', views.get_product_data, name='get_product_data'),
    path('product-files/', views.get_product_files, name='get_product_files'),
    
    # AI fitment processing
    path('ai-fitment/', views.process_ai_fitment, name='process_ai_fitment'),
    
    # Manual fitment processing
    path('apply-manual-fitment/', views.apply_manual_fitment, name='apply_manual_fitment'),
    
    # AI fitment application
    path('apply-ai-fitments/', views.apply_ai_fitments, name='apply_ai_fitments'),
    path('apply-ai-fitments-direct/', views.apply_ai_fitments_direct, name='apply_ai_fitments_direct'),
    
    # Dropdown data from new tables
    path('dropdown-data/', views.get_dropdown_data, name='get_dropdown_data'),
    
    # Filtered vehicles search
    path('filtered-vehicles/', views.get_filtered_vehicles, name='get_filtered_vehicles'),
    
    # Lookup data for fitment filters
    path('lookup-data/', views.get_lookup_data, name='get_lookup_data'),
    
    # Field configuration
    path('field-configuration/', views.get_field_configuration, name='get_field_configuration'),
    path('validate-dynamic-fields/', views.validate_file_with_dynamic_fields, name='validate_file_with_dynamic_fields'),
    
    # Job management
    path('job-history/', views.get_job_history, name='get_job_history'),
    path('job-status/<uuid:job_id>/', views.get_job_status, name='get_job_status'),
    
    # AI Fitment Jobs Management
    path('ai-fitment-jobs/', views.AiFitmentJobView.as_view(), name='ai_fitment_jobs'),
    path('ai-fitment-jobs/<uuid:job_id>/', views.AiFitmentJobDetailView.as_view(), name='ai_fitment_job_detail'),
    path('ai-fitment-jobs/<uuid:job_id>/status/', views.get_ai_job_status, name='get_ai_job_status'),
    path('ai-fitment-jobs/<uuid:job_id>/fitments/', views.get_job_fitments, name='get_job_fitments'),
    path('ai-fitment-jobs/<uuid:job_id>/approve/', views.approve_fitments, name='approve_fitments'),
    path('ai-fitment-jobs/<uuid:job_id>/reject/', views.reject_fitments, name='reject_fitments'),
    path('ai-fitment-jobs/<uuid:job_id>/fitments/<str:fitment_id>/', views.update_fitment, name='update_fitment'),
    path('ai-fitment-jobs/<uuid:job_id>/progress/', views.get_job_progress, name='get_job_progress'),
    path('ai-fitment-jobs/<uuid:job_id>/bulk-approve/', views.bulk_approve_fitments, name='bulk_approve_fitments'),
    path('ai-fitment-jobs/<uuid:job_id>/bulk-reject/', views.bulk_reject_fitments, name='bulk_reject_fitments'),
]
