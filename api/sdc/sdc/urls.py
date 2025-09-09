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
from tenants.views import TenantListCreateView
from vcdb.views import version, year_range, configurations
from parts.views import list_parts, list_part_types
from fitments.views import fitments_root, coverage, property_values, validate, submit, export_csv, coverage_export
from workflow.views import uploads as wf_uploads, ai_map, vcdb_validate, review_queue, review_actions, publish, presets as wf_presets, preset_detail, ai_fitments, apply_fitments_batch

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/tenants/', TenantListCreateView.as_view()),
    path('api/vcdb/version', version),
    path('api/vcdb/year-range', year_range),
    path('api/vcdb/configurations', configurations),
    path('api/parts', list_parts),
    path('api/parts/types', list_part_types),
    path('api/fitments', fitments_root),
    path('api/fitments/coverage', coverage),
    path('api/fitments/coverage/export', coverage_export),
    path('api/fitments/property/<str:property_name>', property_values),
    path('api/fitments/validate', validate),
    path('api/fitments/submit', submit),
    path('api/fitments/export', export_csv),
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
    # Fitment Uploads
    path('api/', include('fitment_uploads.urls')),
]
