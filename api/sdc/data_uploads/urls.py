from django.urls import path
from . import views

urlpatterns = [
    # Data upload session management
    path('sessions/', views.DataUploadSessionView.as_view(), name='data_upload_sessions'),
    path('sessions/<uuid:session_id>/', views.DataUploadSessionDetailView.as_view(), name='data_upload_session_detail'),
    
    # Data status and file operations
    path('status/', views.get_current_data_status, name='data_status'),
    path('replace-file/', views.replace_file, name='replace_file'),
    path('sessions/<uuid:session_id>/data/<str:file_type>/', views.get_file_data, name='get_file_data'),
]
