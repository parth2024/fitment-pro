"""
URL configuration for sdc project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from tenants.views import TenantListCreateView, TenantDetailView, get_current_tenant, switch_tenant, tenant_stats
from tenants.views_auth import login_view, logout_view, current_user_view, user_roles_view
from vcdb.views import version, year_range, configurations
from fitments.views import export_fitments_advanced_csv, export_fitments_advanced_xlsx, fitments_root, coverage, property_values, validate, submit, export_csv, coverage_export, export_ai_fitments, ai_fitments_list, applied_fitments_list, fitment_filter_options, fitment_detail, update_fitment, delete_fitment, validate_fitments_csv, submit_validated_fitments, get_validation_results, detailed_coverage, coverage_trends, coverage_gaps, get_potential_fitments, get_parts_with_fitments, apply_potential_fitments, analytics_dashboard, approve_fitments, reject_fitments, bulk_delete_fitments
from workflow.views import uploads as wf_uploads, ai_map, vcdb_validate, review_queue, review_actions, publish, presets as wf_presets, preset_detail, ai_fitments, apply_fitments_batch



urlpatterns = [
    path('admin/', admin.site.urls),
    # Authentication endpoints
    path('api/auth/login/', login_view),
    path('api/auth/logout/', logout_view),
    path('api/auth/user/', current_user_view),
    path('api/auth/roles/', user_roles_view),
    # Tenant endpoints
    path('api/tenants/', TenantListCreateView.as_view()),
    path('api/tenants/<uuid:id>/', TenantDetailView.as_view()),
    path('api/tenants/<uuid:tenant_id>/stats/', tenant_stats),
    path('api/tenants/current/', get_current_tenant),
    path('api/tenants/switch/<uuid:tenant_id>/', switch_tenant),
    path('api/vcdb/version', version),
    path('api/vcdb/year-range', year_range),
    path('api/vcdb/configurations', configurations),
    # Potential fitments endpoints (MFT V1)
    path('api/fitments/potential/<str:part_id>/', get_potential_fitments),
    path('api/fitments/parts-with-fitments/', get_parts_with_fitments),
    path('api/fitments/apply-potential-fitments/', apply_potential_fitments),
    # Existing fitments endpoints (specific patterns first)
    path('api/fitments/coverage/export', coverage_export),
    path('api/fitments/coverage/detailed', detailed_coverage),
    path('api/fitments/coverage/trends', coverage_trends),
    path('api/fitments/coverage/gaps', coverage_gaps),
    path('api/fitments/coverage', coverage),
    path('api/fitments/property/<str:property_name>', property_values),
    # New bulk upload endpoints (MFT V1)
    path('api/fitments/validate/', validate_fitments_csv),
    path('api/fitments/submit/<uuid:session_id>/', submit_validated_fitments),
    path('api/fitments/validation/<uuid:session_id>/', get_validation_results),
    # Legacy endpoints (keep for backward compatibility)
    path('api/fitments/validate', validate),
    path('api/fitments/submit', submit),
    # New enhanced fitments endpoints (most specific first)
    path('api/fitments/export-advanced-csv/', export_fitments_advanced_csv),
    path('api/fitments/export-advanced-xlsx/', export_fitments_advanced_xlsx),
    path('api/fitments/export', export_csv),
    path('api/fitments/filter-options/', fitment_filter_options),
    path('api/fitments/approve/', approve_fitments),
    path('api/fitments/reject/', reject_fitments),
    path('api/fitments/bulk-delete/', bulk_delete_fitments),
    path('api/fitments/<str:fitment_hash>/update/', update_fitment),
    path('api/fitments/<str:fitment_hash>/delete/', delete_fitment),
    path('api/fitments/<str:fitment_hash>/', fitment_detail),
    # Main fitments endpoint (last to avoid conflicts)
    path('api/fitments/', fitments_root),
    path('api/export-ai-fitments/', export_ai_fitments),
    path('api/ai-fitments/', ai_fitments_list),
    path('api/applied-fitments/', applied_fitments_list),
    # Workflow
    path('api/uploads', wf_uploads),
    path('api/uploads/<str:upload_id>/ai-map', ai_map),
    path('api/uploads/<str:upload_id>/vcdb-validate', vcdb_validate),
    path('api/uploads/<str:upload_id>/publish', publish),
    path('api/review-queue', review_queue),
    path('api/review-queue/actions', review_actions),
    path('api/presets', wf_presets),
    path('api/presets/<str:preset_id>', preset_detail),
    # Apply Fitments (AI + batch persist)
    path('api/apply/ai-fitments', ai_fitments),
    path('api/apply/apply-fitments', apply_fitments_batch),
    # Analytics
    path('api/analytics/dashboard/', analytics_dashboard),
    # Fitment Uploads (temporarily disabled due to missing openai dependency)
    # path('api/', include('fitment_uploads.urls')),
    # Data Uploads
    path('api/data-uploads/', include('data_uploads.urls')),
    # Field Configuration
    path('api/field-config/', include('field_config.urls')),
    # VCDB Categories
    path('api/vcdb-categories/', include('vcdb_categories.urls')),
    # Products
    path('api/products/', include('products.urls')),
]
