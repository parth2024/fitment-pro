from django.urls import path
from . import views

urlpatterns = [
    # New enhanced endpoints only (existing ones are in main urls.py)
    path('export-advanced/', views.export_fitments_advanced, name='fitments_export_advanced'),
    path('filter-options/', views.fitment_filter_options, name='fitment_filter_options'),
    
    # Individual fitment operations
    path('<str:fitment_hash>/', views.fitment_detail, name='fitment_detail'),
    path('<str:fitment_hash>/update/', views.update_fitment, name='update_fitment'),
    path('<str:fitment_hash>/delete/', views.delete_fitment, name='delete_fitment'),
]
