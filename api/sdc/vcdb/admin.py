from django.contrib import admin
from .models import (
    Make, Model, SubModel, Region, PublicationStage, Year, BaseVehicle, DriveType, FuelType,
    BodyNumDoors, BodyType, BodyStyleConfig, EngineConfig, Vehicle,
    VehicleToDriveType, VehicleToBodyStyleConfig, VehicleToEngineConfig,
    VCDBSyncLog
)


@admin.register(Make)
class MakeAdmin(admin.ModelAdmin):
    list_display = ['make_id', 'make_name', 'culture_id', 'effective_date_time', 'end_date_time']
    list_filter = ['culture_id', 'effective_date_time']
    search_fields = ['make_name']
    ordering = ['make_name']


@admin.register(Model)
class ModelAdmin(admin.ModelAdmin):
    list_display = ['model_id', 'model_name', 'vehicle_type_id', 'culture_id', 'effective_date_time']
    list_filter = ['vehicle_type_id', 'culture_id', 'effective_date_time']
    search_fields = ['model_name']
    ordering = ['model_name']


@admin.register(SubModel)
class SubModelAdmin(admin.ModelAdmin):
    list_display = ['sub_model_id', 'sub_model_name', 'culture_id', 'effective_date_time']
    list_filter = ['culture_id', 'effective_date_time']
    search_fields = ['sub_model_name']
    ordering = ['sub_model_name']


@admin.register(Region)
class RegionAdmin(admin.ModelAdmin):
    list_display = ['region_id', 'region_name', 'region_abbr', 'parent_id', 'culture_id', 'effective_date_time']
    list_filter = ['culture_id', 'parent_id', 'effective_date_time']
    search_fields = ['region_name', 'region_abbr']
    ordering = ['region_name']


@admin.register(PublicationStage)
class PublicationStageAdmin(admin.ModelAdmin):
    list_display = ['publication_stage_id', 'publication_stage_name', 'culture_id', 'effective_date_time']
    list_filter = ['culture_id', 'effective_date_time']
    search_fields = ['publication_stage_name']
    ordering = ['publication_stage_name']


@admin.register(Year)
class YearAdmin(admin.ModelAdmin):
    list_display = ['year_id', 'effective_date_time', 'end_date_time']
    list_filter = ['effective_date_time']
    search_fields = ['year_id']
    ordering = ['year_id']


@admin.register(BaseVehicle)
class BaseVehicleAdmin(admin.ModelAdmin):
    list_display = ['base_vehicle_id', 'make_id', 'model_id', 'year_id', 'effective_date_time']
    list_filter = ['year_id', 'make_id', 'model_id', 'effective_date_time']
    search_fields = ['make_id__make_name', 'model_id__model_name']
    ordering = ['year_id', 'make_id', 'model_id']


@admin.register(DriveType)
class DriveTypeAdmin(admin.ModelAdmin):
    list_display = ['drive_type_id', 'drive_type_name', 'culture_id', 'effective_date_time']
    list_filter = ['culture_id', 'effective_date_time']
    search_fields = ['drive_type_name']
    ordering = ['drive_type_name']


@admin.register(FuelType)
class FuelTypeAdmin(admin.ModelAdmin):
    list_display = ['fuel_type_id', 'fuel_type_name', 'culture_id', 'effective_date_time']
    list_filter = ['culture_id', 'effective_date_time']
    search_fields = ['fuel_type_name']
    ordering = ['fuel_type_name']


@admin.register(BodyNumDoors)
class BodyNumDoorsAdmin(admin.ModelAdmin):
    list_display = ['body_num_doors_id', 'body_num_doors', 'culture_id', 'effective_date_time']
    list_filter = ['culture_id', 'effective_date_time']
    search_fields = ['body_num_doors']
    ordering = ['body_num_doors']


@admin.register(BodyType)
class BodyTypeAdmin(admin.ModelAdmin):
    list_display = ['body_type_id', 'body_type_name', 'culture_id', 'effective_date_time']
    list_filter = ['culture_id', 'effective_date_time']
    search_fields = ['body_type_name']
    ordering = ['body_type_name']


@admin.register(BodyStyleConfig)
class BodyStyleConfigAdmin(admin.ModelAdmin):
    list_display = ['body_style_config_id', 'body_num_doors_id', 'body_type_id', 'effective_date_time']
    list_filter = ['body_num_doors_id', 'body_type_id', 'effective_date_time']
    search_fields = ['body_type_id__body_type_name', 'body_num_doors_id__body_num_doors']
    ordering = ['body_style_config_id']


@admin.register(EngineConfig)
class EngineConfigAdmin(admin.ModelAdmin):
    list_display = ['engine_config_id', 'fuel_type_id', 'effective_date_time']
    list_filter = ['fuel_type_id', 'effective_date_time']
    search_fields = ['fuel_type_id__fuel_type_name']
    ordering = ['engine_config_id']


@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    list_display = ['vehicle_id', 'base_vehicle_id', 'sub_model_id', 'region_id', 'publication_stage_id', 'source', 'effective_date_time']
    list_filter = ['region_id', 'publication_stage_id', 'source', 'effective_date_time']
    search_fields = ['base_vehicle_id__make_id__make_name', 'base_vehicle_id__model_id__model_name', 'sub_model_id__sub_model_name', 'region_id__region_name']
    ordering = ['vehicle_id']


@admin.register(VehicleToDriveType)
class VehicleToDriveTypeAdmin(admin.ModelAdmin):
    list_display = ['vehicle_to_drive_type_id', 'vehicle_id', 'drive_type_id', 'source', 'effective_date_time']
    list_filter = ['source', 'effective_date_time']
    search_fields = ['vehicle_id__base_vehicle_id__make_id__make_name', 'drive_type_id__drive_type_name']
    ordering = ['vehicle_to_drive_type_id']


@admin.register(VehicleToBodyStyleConfig)
class VehicleToBodyStyleConfigAdmin(admin.ModelAdmin):
    list_display = ['vehicle_to_body_style_config_id', 'vehicle_id', 'body_style_config_id', 'source', 'effective_date_time']
    list_filter = ['source', 'effective_date_time']
    search_fields = ['vehicle_id__base_vehicle_id__make_id__make_name', 'body_style_config_id__body_type_id__body_type_name']
    ordering = ['vehicle_to_body_style_config_id']


@admin.register(VehicleToEngineConfig)
class VehicleToEngineConfigAdmin(admin.ModelAdmin):
    list_display = ['vehicle_to_engine_config_id', 'vehicle_id', 'engine_config_id', 'source', 'effective_date_time']
    list_filter = ['source', 'effective_date_time']
    search_fields = ['vehicle_id__base_vehicle_id__make_id__make_name', 'engine_config_id__fuel_type_id__fuel_type_name']
    ordering = ['vehicle_to_engine_config_id']


@admin.register(VCDBSyncLog)
class VCDBSyncLogAdmin(admin.ModelAdmin):
    list_display = ['id', 'status', 'total_records_processed', 'records_created', 'records_updated', 'started_at', 'completed_at']
    list_filter = ['status', 'started_at']
    search_fields = ['error_message']
    readonly_fields = ['id', 'started_at', 'completed_at', 'duration_seconds']
    ordering = ['-started_at']
    
    fieldsets = (
        ('Sync Information', {
            'fields': ('id', 'status', 'started_at', 'completed_at', 'duration_seconds')
        }),
        ('Statistics', {
            'fields': ('total_records_processed', 'records_created', 'records_updated', 'records_skipped', 'errors_count')
        }),
        ('Error Details', {
            'fields': ('error_message', 'error_details'),
            'classes': ('collapse',)
        }),
    )
