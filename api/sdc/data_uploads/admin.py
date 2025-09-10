from django.contrib import admin
from .models import DataUploadSession, FileValidationLog, DataProcessingLog


@admin.register(DataUploadSession)
class DataUploadSessionAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'vcdb_filename', 'products_filename', 'status', 
        'vcdb_valid', 'products_valid', 'created_at'
    ]
    list_filter = ['status', 'vcdb_valid', 'products_valid', 'created_at']
    search_fields = ['vcdb_filename', 'products_filename']
    readonly_fields = ['id', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Session Info', {
            'fields': ('id', 'status', 'created_at', 'updated_at')
        }),
        ('VCDB File', {
            'fields': ('vcdb_file', 'vcdb_filename', 'vcdb_file_size', 'vcdb_valid', 'vcdb_records')
        }),
        ('Products File', {
            'fields': ('products_file', 'products_filename', 'products_file_size', 'products_valid', 'products_records')
        }),
        ('Validation', {
            'fields': ('validation_errors',),
            'classes': ('collapse',)
        }),
    )


@admin.register(FileValidationLog)
class FileValidationLogAdmin(admin.ModelAdmin):
    list_display = ['session', 'file_type', 'validation_type', 'is_valid', 'created_at']
    list_filter = ['file_type', 'validation_type', 'is_valid', 'created_at']
    search_fields = ['session__id', 'message']
    readonly_fields = ['created_at']


@admin.register(DataProcessingLog)
class DataProcessingLogAdmin(admin.ModelAdmin):
    list_display = ['session', 'step', 'status', 'started_at', 'completed_at']
    list_filter = ['status', 'step', 'started_at']
    search_fields = ['session__id', 'step', 'message']
    readonly_fields = ['started_at']
