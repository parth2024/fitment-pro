from django.contrib import admin
from .models import VCDBCategory, VCDBData, FitmentJob, AIFitment


@admin.register(VCDBCategory)
class VCDBCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'version', 'is_valid', 'record_count', 'is_active', 'created_at']
    list_filter = ['is_valid', 'is_active', 'created_at']
    search_fields = ['name', 'description']
    readonly_fields = ['id', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'description', 'version')
        }),
        ('File Information', {
            'fields': ('file', 'filename', 'file_size', 'is_valid', 'validation_errors', 'record_count')
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(VCDBData)
class VCDBDataAdmin(admin.ModelAdmin):
    list_display = ['year', 'make', 'model', 'submodel', 'category', 'created_at']
    list_filter = ['category', 'year', 'make', 'created_at']
    search_fields = ['make', 'model', 'submodel']
    readonly_fields = ['id', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Vehicle Information', {
            'fields': ('category', 'year', 'make', 'model', 'submodel')
        }),
        ('Vehicle Details', {
            'fields': ('drive_type', 'fuel_type', 'num_doors', 'body_type', 'engine_type', 'transmission', 'trim_level')
        }),
        ('Dynamic Fields', {
            'fields': ('dynamic_fields',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(FitmentJob)
class FitmentJobAdmin(admin.ModelAdmin):
    list_display = ['tenant', 'job_type', 'status', 'progress_percentage', 'fitments_created', 'created_at']
    list_filter = ['tenant', 'job_type', 'status', 'created_at']
    search_fields = ['tenant__name', 'current_step']
    readonly_fields = ['id', 'created_at', 'updated_at', 'started_at', 'completed_at']
    
    fieldsets = (
        ('Job Information', {
            'fields': ('tenant', 'job_type', 'status')
        }),
        ('Configuration', {
            'fields': ('vcdb_categories', 'product_fields', 'ai_instructions')
        }),
        ('Progress', {
            'fields': ('progress_percentage', 'current_step', 'total_steps', 'completed_steps')
        }),
        ('Results', {
            'fields': ('fitments_created', 'fitments_failed', 'error_message')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'started_at', 'completed_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(AIFitment)
class AIFitmentAdmin(admin.ModelAdmin):
    list_display = ['part_id', 'year', 'make', 'model', 'confidence_score', 'status', 'created_at']
    list_filter = ['tenant', 'status', 'year', 'make', 'created_at']
    search_fields = ['part_id', 'part_description', 'make', 'model']
    readonly_fields = ['id', 'created_at', 'updated_at', 'reviewed_at']
    
    fieldsets = (
        ('Vehicle Information', {
            'fields': ('tenant', 'job', 'year', 'make', 'model', 'submodel')
        }),
        ('Vehicle Details', {
            'fields': ('drive_type', 'fuel_type', 'num_doors', 'body_type')
        }),
        ('Part Information', {
            'fields': ('part_id', 'part_description', 'position', 'quantity')
        }),
        ('AI Analysis', {
            'fields': ('confidence_score', 'ai_reasoning', 'ai_instructions_used')
        }),
        ('Review', {
            'fields': ('status', 'reviewed_by', 'reviewed_at', 'review_notes')
        }),
        ('Dynamic Fields', {
            'fields': ('dynamic_fields',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
