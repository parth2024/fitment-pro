from django.contrib import admin
from .models import FitmentUploadSession, AIFitmentResult, AppliedFitment


@admin.register(FitmentUploadSession)
class FitmentUploadSessionAdmin(admin.ModelAdmin):
    list_display = ['id', 'vcdb_filename', 'products_filename', 'status', 'vcdb_records', 'products_records', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['vcdb_filename', 'products_filename']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(AIFitmentResult)
class AIFitmentResultAdmin(admin.ModelAdmin):
    list_display = ['id', 'session', 'part_id', 'year', 'make', 'model', 'confidence', 'is_selected', 'is_applied', 'created_at']
    list_filter = ['is_selected', 'is_applied', 'confidence', 'created_at']
    search_fields = ['part_id', 'part_description', 'make', 'model']
    readonly_fields = ['id', 'created_at']


@admin.register(AppliedFitment)
class AppliedFitmentAdmin(admin.ModelAdmin):
    list_display = ['id', 'session', 'part_id', 'year', 'make', 'model', 'position', 'quantity', 'applied_at']
    list_filter = ['position', 'applied_at']
    search_fields = ['part_id', 'part_description', 'make', 'model']
    readonly_fields = ['id', 'applied_at']