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
    
    # AI fitment processing
    path('ai-fitment/', views.process_ai_fitment, name='process_ai_fitment'),
    
    # Manual fitment processing
    path('apply-manual-fitment/', views.apply_manual_fitment, name='apply_manual_fitment'),
    
    # AI fitment application
    path('apply-ai-fitments/', views.apply_ai_fitments, name='apply_ai_fitments'),
    
    # Dropdown data from new tables
    path('dropdown-data/', views.get_dropdown_data, name='get_dropdown_data'),
    
    # Filtered vehicles search
    path('filtered-vehicles/', views.get_filtered_vehicles, name='get_filtered_vehicles'),
    
    # Lookup data for fitment filters
    path('lookup-data/', views.get_lookup_data, name='get_lookup_data'),
]
