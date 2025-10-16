from django.db import models
from django.utils import timezone
import uuid


class Make(models.Model):
    """AutoCare VCDB Make table"""
    make_id = models.IntegerField(primary_key=True)
    make_name = models.CharField(max_length=100)
    culture_id = models.CharField(max_length=10, default='en-US')
    effective_date_time = models.DateTimeField()
    end_date_time = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vcdb_make'
        ordering = ['make_name']
        verbose_name = "Make"
        verbose_name_plural = "Makes"
    
    def __str__(self):
        return self.make_name


class Model(models.Model):
    """AutoCare VCDB Model table"""
    model_id = models.IntegerField(primary_key=True)
    model_name = models.CharField(max_length=100)
    vehicle_type_id = models.IntegerField()
    culture_id = models.CharField(max_length=10, default='en-US')
    effective_date_time = models.DateTimeField()
    end_date_time = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vcdb_model'
        ordering = ['model_name']
        verbose_name = "Model"
        verbose_name_plural = "Models"
    
    def __str__(self):
        return self.model_name


class SubModel(models.Model):
    """AutoCare VCDB SubModel table"""
    sub_model_id = models.IntegerField(primary_key=True)
    sub_model_name = models.CharField(max_length=100)
    culture_id = models.CharField(max_length=10, default='en-US')
    effective_date_time = models.DateTimeField()
    end_date_time = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vcdb_submodel'
        ordering = ['sub_model_name']
        verbose_name = "SubModel"
        verbose_name_plural = "SubModels"
    
    def __str__(self):
        return self.sub_model_name


class Region(models.Model):
    """AutoCare VCDB Region table"""
    region_id = models.IntegerField(primary_key=True)
    region_name = models.CharField(max_length=100)
    parent_id = models.IntegerField(null=True, blank=True)
    region_abbr = models.CharField(max_length=10)
    culture_id = models.CharField(max_length=10, default='en-US')
    effective_date_time = models.DateTimeField()
    end_date_time = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vcdb_region'
        ordering = ['region_name']
        verbose_name = "Region"
        verbose_name_plural = "Regions"
    
    def __str__(self):
        return self.region_name


class PublicationStage(models.Model):
    """AutoCare VCDB PublicationStage table"""
    publication_stage_id = models.IntegerField(primary_key=True)
    publication_stage_name = models.CharField(max_length=100)
    culture_id = models.CharField(max_length=10, default='en-US')
    effective_date_time = models.DateTimeField()
    end_date_time = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vcdb_publicationstage'
        ordering = ['publication_stage_name']
        verbose_name = "Publication Stage"
        verbose_name_plural = "Publication Stages"
    
    def __str__(self):
        return self.publication_stage_name


class Year(models.Model):
    """AutoCare VCDB Year table"""
    year_id = models.IntegerField(primary_key=True)
    effective_date_time = models.DateTimeField()
    end_date_time = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vcdb_year'
        ordering = ['year_id']
        verbose_name = "Year"
        verbose_name_plural = "Years"
    
    def __str__(self):
        return str(self.year_id)


class BaseVehicle(models.Model):
    """AutoCare VCDB BaseVehicle table"""
    base_vehicle_id = models.IntegerField(primary_key=True)
    make_id = models.ForeignKey(Make, on_delete=models.CASCADE, db_column='make_id')
    model_id = models.ForeignKey(Model, on_delete=models.CASCADE, db_column='model_id')
    year_id = models.ForeignKey(Year, on_delete=models.CASCADE, db_column='year_id')
    effective_date_time = models.DateTimeField()
    end_date_time = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vcdb_basevehicle'
        ordering = ['year_id', 'make_id', 'model_id']
        verbose_name = "Base Vehicle"
        verbose_name_plural = "Base Vehicles"
        unique_together = ['make_id', 'model_id', 'year_id']
    
    def __str__(self):
        return f"{self.year_id.year_id} {self.make_id.make_name} {self.model_id.model_name}"


class DriveType(models.Model):
    """AutoCare VCDB DriveType table"""
    drive_type_id = models.IntegerField(primary_key=True)
    drive_type_name = models.CharField(max_length=100)
    culture_id = models.CharField(max_length=10, default='en-US')
    effective_date_time = models.DateTimeField()
    end_date_time = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vcdb_drivetype'
        ordering = ['drive_type_name']
        verbose_name = "Drive Type"
        verbose_name_plural = "Drive Types"
    
    def __str__(self):
        return self.drive_type_name


class FuelType(models.Model):
    """AutoCare VCDB FuelType table"""
    fuel_type_id = models.IntegerField(primary_key=True)
    fuel_type_name = models.CharField(max_length=100)
    culture_id = models.CharField(max_length=10, default='en-US')
    effective_date_time = models.DateTimeField()
    end_date_time = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vcdb_fueltype'
        ordering = ['fuel_type_name']
        verbose_name = "Fuel Type"
        verbose_name_plural = "Fuel Types"
    
    def __str__(self):
        return self.fuel_type_name


class BodyNumDoors(models.Model):
    """AutoCare VCDB BodyNumDoors table"""
    body_num_doors_id = models.IntegerField(primary_key=True)
    body_num_doors = models.CharField(max_length=10)
    culture_id = models.CharField(max_length=10, default='en-US')
    effective_date_time = models.DateTimeField()
    end_date_time = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vcdb_bodynumdoors'
        ordering = ['body_num_doors']
        verbose_name = "Body Number of Doors"
        verbose_name_plural = "Body Number of Doors"
    
    def __str__(self):
        return f"{self.body_num_doors} doors"


class BodyType(models.Model):
    """AutoCare VCDB BodyType table"""
    body_type_id = models.IntegerField(primary_key=True)
    body_type_name = models.CharField(max_length=100)
    culture_id = models.CharField(max_length=10, default='en-US')
    effective_date_time = models.DateTimeField()
    end_date_time = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vcdb_bodytype'
        ordering = ['body_type_name']
        verbose_name = "Body Type"
        verbose_name_plural = "Body Types"
    
    def __str__(self):
        return self.body_type_name


class BodyStyleConfig(models.Model):
    """AutoCare VCDB BodyStyleConfig table"""
    body_style_config_id = models.IntegerField(primary_key=True)
    body_num_doors_id = models.ForeignKey(BodyNumDoors, on_delete=models.CASCADE, db_column='body_num_doors_id')
    body_type_id = models.ForeignKey(BodyType, on_delete=models.CASCADE, db_column='body_type_id')
    effective_date_time = models.DateTimeField()
    end_date_time = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vcdb_bodystyleconfig'
        ordering = ['body_style_config_id']
        verbose_name = "Body Style Config"
        verbose_name_plural = "Body Style Configs"
    
    def __str__(self):
        return f"{self.body_type_id.body_type_name} - {self.body_num_doors_id.body_num_doors} doors"


class EngineConfig(models.Model):
    """AutoCare VCDB EngineConfig table"""
    engine_config_id = models.IntegerField(primary_key=True)
    engine_designation_id = models.IntegerField()
    engine_vin_id = models.IntegerField()
    valves_id = models.IntegerField()
    engine_base_id = models.IntegerField()
    fuel_delivery_config_id = models.IntegerField()
    aspiration_id = models.IntegerField()
    cylinder_head_type_id = models.IntegerField()
    fuel_type_id = models.ForeignKey(FuelType, on_delete=models.CASCADE, db_column='fuel_type_id')
    ignition_system_type_id = models.IntegerField()
    engine_mfr_id = models.IntegerField()
    engine_version_id = models.IntegerField()
    power_output_id = models.IntegerField()
    effective_date_time = models.DateTimeField()
    end_date_time = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vcdb_engineconfig'
        ordering = ['engine_config_id']
        verbose_name = "Engine Config"
        verbose_name_plural = "Engine Configs"
    
    def __str__(self):
        return f"Engine Config {self.engine_config_id}"


class Vehicle(models.Model):
    """AutoCare VCDB Vehicle table"""
    vehicle_id = models.IntegerField(primary_key=True)
    base_vehicle_id = models.ForeignKey(BaseVehicle, on_delete=models.CASCADE, db_column='base_vehicle_id')
    sub_model_id = models.ForeignKey(SubModel, on_delete=models.CASCADE, db_column='sub_model_id')
    region_id = models.ForeignKey(Region, on_delete=models.CASCADE, db_column='region_id')
    source = models.CharField(max_length=50)
    publication_stage_id = models.ForeignKey(PublicationStage, on_delete=models.CASCADE, db_column='publication_stage_id')
    publication_stage_date = models.DateTimeField()
    publication_stage_source = models.CharField(max_length=100, blank=True)
    effective_date_time = models.DateTimeField()
    end_date_time = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vcdb_vehicle'
        ordering = ['vehicle_id']
        verbose_name = "Vehicle"
        verbose_name_plural = "Vehicles"
    
    def __str__(self):
        return f"{self.base_vehicle_id} - {self.sub_model_id.sub_model_name} ({self.region_id.region_name})"


class VehicleToDriveType(models.Model):
    """AutoCare VCDB VehicleToDriveType table"""
    vehicle_to_drive_type_id = models.IntegerField(primary_key=True)
    vehicle_id = models.ForeignKey(Vehicle, on_delete=models.CASCADE, db_column='vehicle_id')
    drive_type_id = models.ForeignKey(DriveType, on_delete=models.CASCADE, db_column='drive_type_id')
    source = models.CharField(max_length=50)
    effective_date_time = models.DateTimeField()
    end_date_time = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vcdb_vehicletodrivetype'
        ordering = ['vehicle_to_drive_type_id']
        verbose_name = "Vehicle to Drive Type"
        verbose_name_plural = "Vehicle to Drive Types"
        unique_together = ['vehicle_id', 'drive_type_id']
    
    def __str__(self):
        return f"{self.vehicle_id} - {self.drive_type_id.drive_type_name}"


class VehicleToBodyStyleConfig(models.Model):
    """AutoCare VCDB VehicleToBodyStyleConfig table"""
    vehicle_to_body_style_config_id = models.IntegerField(primary_key=True)
    vehicle_id = models.ForeignKey(Vehicle, on_delete=models.CASCADE, db_column='vehicle_id')
    body_style_config_id = models.ForeignKey(BodyStyleConfig, on_delete=models.CASCADE, db_column='body_style_config_id')
    source = models.CharField(max_length=50, blank=True)
    effective_date_time = models.DateTimeField()
    end_date_time = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vcdb_vehicletobodystyleconfig'
        ordering = ['vehicle_to_body_style_config_id']
        verbose_name = "Vehicle to Body Style Config"
        verbose_name_plural = "Vehicle to Body Style Configs"
        unique_together = ['vehicle_id', 'body_style_config_id']
    
    def __str__(self):
        return f"{self.vehicle_id} - {self.body_style_config_id}"


class VehicleToEngineConfig(models.Model):
    """AutoCare VCDB VehicleToEngineConfig table"""
    vehicle_to_engine_config_id = models.IntegerField(primary_key=True)
    vehicle_id = models.ForeignKey(Vehicle, on_delete=models.CASCADE, db_column='vehicle_id')
    engine_config_id = models.ForeignKey(EngineConfig, on_delete=models.CASCADE, db_column='engine_config_id')
    source = models.CharField(max_length=50, blank=True)
    effective_date_time = models.DateTimeField()
    end_date_time = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vcdb_vehicletotoengineconfig'
        ordering = ['vehicle_to_engine_config_id']
        verbose_name = "Vehicle to Engine Config"
        verbose_name_plural = "Vehicle to Engine Configs"
        unique_together = ['vehicle_id', 'engine_config_id']
    
    def __str__(self):
        return f"{self.vehicle_id} - {self.engine_config_id}"


class VCDBSyncLog(models.Model):
    """Model to track VCDB data synchronization"""
    STATUS_CHOICES = [
        ('running', 'Running'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('partial', 'Partial Success'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='running')
    
    # Sync statistics
    total_records_processed = models.IntegerField(default=0)
    records_created = models.IntegerField(default=0)
    records_updated = models.IntegerField(default=0)
    records_skipped = models.IntegerField(default=0)
    errors_count = models.IntegerField(default=0)
    
    # Error details
    error_message = models.TextField(blank=True, null=True)
    error_details = models.JSONField(default=dict, blank=True)
    
    # Timing
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    duration_seconds = models.IntegerField(null=True, blank=True)
    
    class Meta:
        db_table = 'vcdb_sync_log'
        ordering = ['-started_at']
        verbose_name = "VCDB Sync Log"
        verbose_name_plural = "VCDB Sync Logs"
    
    def __str__(self):
        return f"VCDB Sync {self.started_at.strftime('%Y-%m-%d %H:%M')} - {self.status}"
    
    def mark_completed(self, duration_seconds=None):
        self.status = 'completed'
        self.completed_at = timezone.now()
        if duration_seconds:
            self.duration_seconds = duration_seconds
        self.save()
    
    def mark_failed(self, error_message, error_details=None):
        self.status = 'failed'
        self.completed_at = timezone.now()
        self.error_message = error_message
        if error_details:
            self.error_details = error_details
        self.save()
