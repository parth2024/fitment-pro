from django.contrib import admin
from .models import (
    DataUploadSession, 
    FileValidationLog, 
    DataProcessingLog,
    AiFitmentJob,
    AiGeneratedFitment,
    ProductData,
    VCDBData,
)


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


@admin.register(AiFitmentJob)
class AiFitmentJobAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'tenant', 'job_type', 'status', 'product_count', 
        'fitments_count', 'approved_count', 'created_by', 'created_at'
    ]
    list_filter = ['status', 'job_type', 'created_at', 'tenant']
    search_fields = ['id', 'created_by', 'product_file_name']
    readonly_fields = ['id', 'created_at', 'updated_at', 'completed_at']
    
    fieldsets = (
        ('Job Info', {
            'fields': ('id', 'tenant', 'job_type', 'status', 'error_message')
        }),
        ('Products', {
            'fields': ('product_file', 'product_file_name', 'product_ids', 'product_count')
        }),
        ('Fitments', {
            'fields': ('fitments_count', 'approved_count', 'rejected_count')
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at', 'updated_at', 'completed_at')
        }),
    )


@admin.register(AiGeneratedFitment)
class AiGeneratedFitmentAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'job', 'part_id', 'year', 'make', 'model', 
        'confidence', 'status', 'created_at'
    ]
    list_filter = ['status', 'confidence', 'created_at']
    search_fields = ['part_id', 'make', 'model', 'part_description']
    readonly_fields = ['id', 'created_at', 'updated_at', 'reviewed_at']
    
    fieldsets = (
        ('Product Info', {
            'fields': ('id', 'job', 'part_id', 'part_description')
        }),
        ('Vehicle Info', {
            'fields': ('year', 'make', 'model', 'submodel', 'drive_type', 
                      'fuel_type', 'num_doors', 'body_type')
        }),
        ('Fitment Details', {
            'fields': ('position', 'quantity')
        }),
        ('AI Analysis', {
            'fields': ('confidence', 'confidence_explanation', 'ai_reasoning')
        }),
        ('Review Status', {
            'fields': ('status', 'reviewed_at', 'reviewed_by')
        }),
        ('Dynamic Fields', {
            'fields': ('dynamic_fields',),
            'classes': ('collapse',)
        }),
    )


@admin.register(ProductData)
class ProductDataAdmin(admin.ModelAdmin):
    list_display = ['id', 'part_id', 'description_short', 'category', 'part_type', 'tenant', 'created_at']
    list_filter = ['category', 'part_type', 'tenant', 'created_at']
    search_fields = ['part_id', 'description', 'category', 'brand', 'sku']
    readonly_fields = ['id', 'created_at', 'updated_at']
    
    def description_short(self, obj):
        return obj.description[:50] + "..." if len(obj.description) > 50 else obj.description
    description_short.short_description = 'Description'


@admin.register(VCDBData)
class VCDBDataAdmin(admin.ModelAdmin):
    list_display = ['id', 'year', 'make', 'model', 'submodel', 'drive_type', 'tenant', 'created_at']
    list_filter = ['year', 'make', 'drive_type', 'fuel_type', 'tenant', 'created_at']
    search_fields = ['make', 'model', 'submodel']
    readonly_fields = ['id', 'created_at', 'updated_at']
