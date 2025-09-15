from django.urls import path
from . import views

urlpatterns = [
    # New enhanced endpoints only (existing ones are in main urls.py)
    path('export-advanced/', views.export_fitments_advanced, name='fitments_export_advanced'),
    path('filter-options/', views.fitment_filter_options, name='fitment_filter_options'),
    
    # Bulk upload endpoints
    path('validate/', views.validate_fitments_csv, name='validate_fitments_csv'),
    path('submit/<uuid:session_id>/', views.submit_validated_fitments, name='submit_validated_fitments'),
    path('validation/<uuid:session_id>/', views.get_validation_results, name='get_validation_results'),
    
    # Individual fitment operations
    path('<str:fitment_hash>/', views.fitment_detail, name='fitment_detail'),
    path('<str:fitment_hash>/update/', views.update_fitment, name='update_fitment'),
    path('<str:fitment_hash>/delete/', views.delete_fitment, name='delete_fitment'),
]
