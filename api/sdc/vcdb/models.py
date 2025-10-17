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


# Additional VCDB Models for Extended API Support

class Abbreviation(models.Model):
    """AutoCare VCDB Abbreviation table"""
    abbreviation = models.CharField(max_length=50, primary_key=True)
    description = models.CharField(max_length=255)
    long_description = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vcdb_abbreviation'
        ordering = ['abbreviation']
        verbose_name = "Abbreviation"
        verbose_name_plural = "Abbreviations"
    
    def __str__(self):
        return self.abbreviation


class Aspiration(models.Model):
    """AutoCare VCDB Aspiration table"""
    aspiration_id = models.IntegerField(primary_key=True)
    aspiration_name = models.CharField(max_length=100)
    culture_id = models.CharField(max_length=10, default='en-US')
    effective_date_time = models.DateTimeField()
    end_date_time = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vcdb_aspiration'
        ordering = ['aspiration_name']
        verbose_name = "Aspiration"
        verbose_name_plural = "Aspirations"
    
    def __str__(self):
        return self.aspiration_name


class BedConfig(models.Model):
    """AutoCare VCDB BedConfig table"""
    bed_config_id = models.IntegerField(primary_key=True)
    bed_length_id = models.IntegerField()
    bed_type_id = models.IntegerField()
    effective_date_time = models.DateTimeField()
    end_date_time = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vcdb_bedconfig'
        ordering = ['bed_config_id']
        verbose_name = "Bed Config"
        verbose_name_plural = "Bed Configs"
    
    def __str__(self):
        return f"Bed Config {self.bed_config_id}"


class BedLength(models.Model):
    """AutoCare VCDB BedLength table"""
    bed_length_id = models.IntegerField(primary_key=True)
    bed_length = models.CharField(max_length=20)
    bed_length_metric = models.CharField(max_length=20)
    culture_id = models.CharField(max_length=10, default='en-US')
    effective_date_time = models.DateTimeField()
    end_date_time = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vcdb_bedlength'
        ordering = ['bed_length_id']
        verbose_name = "Bed Length"
        verbose_name_plural = "Bed Lengths"
    
    def __str__(self):
        return f"{self.bed_length} ({self.bed_length_metric})"


class BedType(models.Model):
    """AutoCare VCDB BedType table"""
    bed_type_id = models.IntegerField(primary_key=True)
    bed_type_name = models.CharField(max_length=100)
    culture_id = models.CharField(max_length=10, default='en-US')
    effective_date_time = models.DateTimeField()
    end_date_time = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vcdb_bedtype'
        ordering = ['bed_type_name']
        verbose_name = "Bed Type"
        verbose_name_plural = "Bed Types"
    
    def __str__(self):
        return self.bed_type_name


class BrakeABS(models.Model):
    """AutoCare VCDB BrakeABS table"""
    brake_abs_id = models.IntegerField(primary_key=True)
    brake_abs_name = models.CharField(max_length=100)
    culture_id = models.CharField(max_length=10, default='en-US')
    effective_date_time = models.DateTimeField()
    end_date_time = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vcdb_brakeabs'
        ordering = ['brake_abs_name']
        verbose_name = "Brake ABS"
        verbose_name_plural = "Brake ABS"
    
    def __str__(self):
        return self.brake_abs_name


class BrakeConfig(models.Model):
    """AutoCare VCDB BrakeConfig table"""
    brake_config_id = models.IntegerField(primary_key=True)
    front_brake_type_id = models.IntegerField()
    rear_brake_type_id = models.IntegerField()
    brake_system_id = models.IntegerField()
    brake_abs_id = models.IntegerField()
    effective_date_time = models.DateTimeField()
    end_date_time = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vcdb_brakeconfig'
        ordering = ['brake_config_id']
        verbose_name = "Brake Config"
        verbose_name_plural = "Brake Configs"
    
    def __str__(self):
        return f"Brake Config {self.brake_config_id}"


class BrakeSystem(models.Model):
    """AutoCare VCDB BrakeSystem table"""
    brake_system_id = models.IntegerField(primary_key=True)
    brake_system_name = models.CharField(max_length=100)
    culture_id = models.CharField(max_length=10, default='en-US')
    effective_date_time = models.DateTimeField()
    end_date_time = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vcdb_brakesystem'
        ordering = ['brake_system_name']
        verbose_name = "Brake System"
        verbose_name_plural = "Brake Systems"
    
    def __str__(self):
        return self.brake_system_name


class BrakeType(models.Model):
    """AutoCare VCDB BrakeType table"""
    brake_type_id = models.IntegerField(primary_key=True)
    brake_type_name = models.CharField(max_length=100)
    culture_id = models.CharField(max_length=10, default='en-US')
    effective_date_time = models.DateTimeField()
    end_date_time = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vcdb_braketype'
        ordering = ['brake_type_name']
        verbose_name = "Brake Type"
        verbose_name_plural = "Brake Types"
    
    def __str__(self):
        return self.brake_type_name


class Class(models.Model):
    """AutoCare VCDB Class table"""
    class_id = models.IntegerField(primary_key=True)
    class_name = models.CharField(max_length=100)
    culture_id = models.CharField(max_length=10, default='en-US')
    effective_date_time = models.DateTimeField()
    end_date_time = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vcdb_class'
        ordering = ['class_name']
        verbose_name = "Class"
        verbose_name_plural = "Classes"
    
    def __str__(self):
        return self.class_name


class CylinderHeadType(models.Model):
    """AutoCare VCDB CylinderHeadType table"""
    cylinder_head_type_id = models.IntegerField(primary_key=True)
    cylinder_head_type_name = models.CharField(max_length=100)
    culture_id = models.CharField(max_length=10, default='en-US')
    effective_date_time = models.DateTimeField()
    end_date_time = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vcdb_cylinderheadtype'
        ordering = ['cylinder_head_type_name']
        verbose_name = "Cylinder Head Type"
        verbose_name_plural = "Cylinder Head Types"
    
    def __str__(self):
        return self.cylinder_head_type_name


class ElecControlled(models.Model):
    """AutoCare VCDB ElecControlled table"""
    elec_controlled_id = models.IntegerField(primary_key=True)
    elec_controlled = models.CharField(max_length=10)
    culture_id = models.CharField(max_length=10, default='en-US')
    effective_date_time = models.DateTimeField()
    end_date_time = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vcdb_eleccontrolled'
        ordering = ['elec_controlled']
        verbose_name = "Electronic Controlled"
        verbose_name_plural = "Electronic Controlled"
    
    def __str__(self):
        return self.elec_controlled


class EngineBase(models.Model):
    """AutoCare VCDB EngineBase table"""
    engine_base_id = models.IntegerField(primary_key=True)
    liter = models.CharField(max_length=20, blank=True)
    cc = models.CharField(max_length=20, blank=True)
    cid = models.CharField(max_length=20, blank=True)
    cylinders = models.CharField(max_length=10, blank=True)
    block_type = models.CharField(max_length=10, blank=True)
    eng_bore_in = models.CharField(max_length=20, blank=True)
    eng_bore_metric = models.CharField(max_length=20, blank=True)
    eng_stroke_in = models.CharField(max_length=20, blank=True)
    eng_stroke_metric = models.CharField(max_length=20, blank=True)
    effective_date_time = models.DateTimeField()
    end_date_time = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vcdb_enginebase'
        ordering = ['engine_base_id']
        verbose_name = "Engine Base"
        verbose_name_plural = "Engine Bases"
    
    def __str__(self):
        return f"Engine Base {self.engine_base_id} - {self.liter}L"


# Further Extended VCDB Models

class EngineBlock(models.Model):
    """AutoCare VCDB EngineBlock table"""
    engine_block_id = models.IntegerField(primary_key=True)
    liter = models.CharField(max_length=20, blank=True)
    cc = models.CharField(max_length=20, blank=True)
    cid = models.CharField(max_length=20, blank=True)
    cylinders = models.CharField(max_length=10, blank=True)
    block_type = models.CharField(max_length=10, blank=True)
    culture_id = models.CharField(max_length=10, default='en-US')
    effective_date_time = models.DateTimeField()
    end_date_time = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vcdb_engineblock'
        ordering = ['engine_block_id']
        verbose_name = 'Engine Block'
        verbose_name_plural = 'Engine Blocks'
    
    def __str__(self):
        return f"Engine Block {self.engine_block_id}"


class EngineBoreStroke(models.Model):
    """AutoCare VCDB EngineBoreStroke table"""
    engine_bore_stroke_id = models.IntegerField(primary_key=True)
    eng_bore_in = models.CharField(max_length=20, blank=True)
    eng_bore_metric = models.CharField(max_length=20, blank=True)
    eng_stroke_in = models.CharField(max_length=20, blank=True)
    eng_stroke_metric = models.CharField(max_length=20, blank=True)
    culture_id = models.CharField(max_length=10, default='en-US')
    effective_date_time = models.DateTimeField()
    end_date_time = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vcdb_engineborestroke'
        ordering = ['engine_bore_stroke_id']
        verbose_name = 'Engine Bore/Stroke'
        verbose_name_plural = 'Engine Bore/Stroke'
    
    def __str__(self):
        return f"Engine Bore/Stroke {self.engine_bore_stroke_id}"


class EngineBase2(models.Model):
    """AutoCare VCDB EngineBase2 table (links base->block/borestroke)"""
    engine_base_id = models.IntegerField(primary_key=True)
    engine_block_id = models.IntegerField()
    engine_bore_stroke_id = models.IntegerField()
    effective_date_time = models.DateTimeField()
    end_date_time = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vcdb_enginebase2'
        ordering = ['engine_base_id']
        verbose_name = 'Engine Base 2'
        verbose_name_plural = 'Engine Base 2'
    
    def __str__(self):
        return f"Engine Base2 {self.engine_base_id}"


class EngineDesignation(models.Model):
    """AutoCare VCDB EngineDesignation table"""
    engine_designation_id = models.IntegerField(primary_key=True)
    engine_designation_name = models.CharField(max_length=100)
    culture_id = models.CharField(max_length=10, default='en-US')
    effective_date_time = models.DateTimeField()
    end_date_time = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vcdb_enginedesignation'
        ordering = ['engine_designation_name']
        verbose_name = 'Engine Designation'
        verbose_name_plural = 'Engine Designations'
    
    def __str__(self):
        return self.engine_designation_name


class EngineVIN(models.Model):
    """AutoCare VCDB EngineVIN table"""
    engine_vin_id = models.IntegerField(primary_key=True)
    engine_vin_name = models.CharField(max_length=100)
    culture_id = models.CharField(max_length=10, default='en-US')
    effective_date_time = models.DateTimeField()
    end_date_time = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vcdb_enginevin'
        ordering = ['engine_vin_name']
        verbose_name = 'Engine VIN'
        verbose_name_plural = 'Engine VINs'
    
    def __str__(self):
        return self.engine_vin_name


class EngineVersion(models.Model):
    """AutoCare VCDB EngineVersion table"""
    engine_version_id = models.IntegerField(primary_key=True)
    engine_version = models.CharField(max_length=100)
    culture_id = models.CharField(max_length=10, default='en-US')
    effective_date_time = models.DateTimeField()
    end_date_time = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vcdb_engineversion'
        ordering = ['engine_version']
        verbose_name = 'Engine Version'
        verbose_name_plural = 'Engine Versions'
    
    def __str__(self):
        return self.engine_version


class FuelDeliveryType(models.Model):
    """AutoCare VCDB FuelDeliveryType table"""
    fuel_delivery_type_id = models.IntegerField(primary_key=True)
    fuel_delivery_type_name = models.CharField(max_length=100)
    culture_id = models.CharField(max_length=10, default='en-US')
    effective_date_time = models.DateTimeField()
    end_date_time = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vcdb_fueldeliverytype'
        ordering = ['fuel_delivery_type_name']
        verbose_name = 'Fuel Delivery Type'
        verbose_name_plural = 'Fuel Delivery Types'
    
    def __str__(self):
        return self.fuel_delivery_type_name


class FuelDeliverySubType(models.Model):
    """AutoCare VCDB FuelDeliverySubType table"""
    fuel_delivery_sub_type_id = models.IntegerField(primary_key=True)
    fuel_delivery_sub_type_name = models.CharField(max_length=100)
    culture_id = models.CharField(max_length=10, default='en-US')
    effective_date_time = models.DateTimeField()
    end_date_time = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vcdb_fueldeliverysubtype'
        ordering = ['fuel_delivery_sub_type_name']
        verbose_name = 'Fuel Delivery SubType'
        verbose_name_plural = 'Fuel Delivery SubTypes'
    
    def __str__(self):
        return self.fuel_delivery_sub_type_name


class FuelSystemControlType(models.Model):
    """AutoCare VCDB FuelSystemControlType table"""
    fuel_system_control_type_id = models.IntegerField(primary_key=True)
    fuel_system_control_type_name = models.CharField(max_length=100)
    culture_id = models.CharField(max_length=10, default='en-US')
    effective_date_time = models.DateTimeField()
    end_date_time = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vcdb_fuelsystemcontroltype'
        ordering = ['fuel_system_control_type_name']
        verbose_name = 'Fuel System Control Type'
        verbose_name_plural = 'Fuel System Control Types'
    
    def __str__(self):
        return self.fuel_system_control_type_name


class FuelSystemDesign(models.Model):
    """AutoCare VCDB FuelSystemDesign table"""
    fuel_system_design_id = models.IntegerField(primary_key=True)
    fuel_system_design_name = models.CharField(max_length=100)
    culture_id = models.CharField(max_length=10, default='en-US')
    effective_date_time = models.DateTimeField()
    end_date_time = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vcdb_fuelsystemdesign'
        ordering = ['fuel_system_design_name']
        verbose_name = 'Fuel System Design'
        verbose_name_plural = 'Fuel System Designs'
    
    def __str__(self):
        return self.fuel_system_design_name


class IgnitionSystemType(models.Model):
    """AutoCare VCDB IgnitionSystemType table"""
    ignition_system_type_id = models.IntegerField(primary_key=True)
    ignition_system_type_name = models.CharField(max_length=100)
    culture_id = models.CharField(max_length=10, default='en-US')
    effective_date_time = models.DateTimeField()
    end_date_time = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vcdb_ignitionsystemtype'
        ordering = ['ignition_system_type_name']
        verbose_name = 'Ignition System Type'
        verbose_name_plural = 'Ignition System Types'
    
    def __str__(self):
        return self.ignition_system_type_name


class Mfr(models.Model):
    """AutoCare VCDB Manufacturer table"""
    mfr_id = models.IntegerField(primary_key=True)
    mfr_name = models.CharField(max_length=150)
    culture_id = models.CharField(max_length=10, default='en-US')
    effective_date_time = models.DateTimeField()
    end_date_time = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vcdb_mfr'
        ordering = ['mfr_name']
        verbose_name = 'Manufacturer'
        verbose_name_plural = 'Manufacturers'
    
    def __str__(self):
        return self.mfr_name


class MfrBodyCode(models.Model):
    """AutoCare VCDB MfrBodyCode table"""
    mfr_body_code_id = models.IntegerField(primary_key=True)
    mfr_body_code_name = models.CharField(max_length=100)
    culture_id = models.CharField(max_length=10, default='en-US')
    effective_date_time = models.DateTimeField()
    end_date_time = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vcdb_mfrbodycode'
        ordering = ['mfr_body_code_name']
        verbose_name = 'Mfr Body Code'
        verbose_name_plural = 'Mfr Body Codes'
    
    def __str__(self):
        return self.mfr_body_code_name


class PowerOutput(models.Model):
    """AutoCare VCDB PowerOutput table"""
    power_output_id = models.IntegerField(primary_key=True)
    horse_power = models.CharField(max_length=50, blank=True)
    kilowatt_power = models.CharField(max_length=50, blank=True)
    culture_id = models.CharField(max_length=10, default='en-US')
    effective_date_time = models.DateTimeField()
    end_date_time = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vcdb_poweroutput'
        ordering = ['power_output_id']
        verbose_name = 'Power Output'
        verbose_name_plural = 'Power Outputs'
    
    def __str__(self):
        return f"Power Output {self.power_output_id}"


class SpringType(models.Model):
    """AutoCare VCDB SpringType table"""
    spring_type_id = models.IntegerField(primary_key=True)
    spring_type_name = models.CharField(max_length=100)
    culture_id = models.CharField(max_length=10, default='en-US')
    effective_date_time = models.DateTimeField()
    end_date_time = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vcdb_springtype'
        ordering = ['spring_type_name']
        verbose_name = 'Spring Type'
        verbose_name_plural = 'Spring Types'
    
    def __str__(self):
        return self.spring_type_name


class SpringTypeConfig(models.Model):
    """AutoCare VCDB SpringTypeConfig table"""
    spring_type_config_id = models.IntegerField(primary_key=True)
    front_spring_type_id = models.IntegerField()
    rear_spring_type_id = models.IntegerField()
    effective_date_time = models.DateTimeField()
    end_date_time = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vcdb_springtypeconfig'
        ordering = ['spring_type_config_id']
        verbose_name = 'Spring Type Config'
        verbose_name_plural = 'Spring Type Configs'
    
    def __str__(self):
        return f"Spring Type Config {self.spring_type_config_id}"


class SteeringType(models.Model):
    """AutoCare VCDB SteeringType table"""
    steering_type_id = models.IntegerField(primary_key=True)
    steering_type_name = models.CharField(max_length=100)
    culture_id = models.CharField(max_length=10, default='en-US')
    effective_date_time = models.DateTimeField()
    end_date_time = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vcdb_steeringtype'
        ordering = ['steering_type_name']
        verbose_name = 'Steering Type'
        verbose_name_plural = 'Steering Types'
    
    def __str__(self):
        return self.steering_type_name


class SteeringSystem(models.Model):
    """AutoCare VCDB SteeringSystem table"""
    steering_system_id = models.IntegerField(primary_key=True)
    steering_system_name = models.CharField(max_length=100)
    culture_id = models.CharField(max_length=10, default='en-US')
    effective_date_time = models.DateTimeField()
    end_date_time = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vcdb_steeringsystem'
        ordering = ['steering_system_name']
        verbose_name = 'Steering System'
        verbose_name_plural = 'Steering Systems'
    
    def __str__(self):
        return self.steering_system_name


class SteeringConfig(models.Model):
    """AutoCare VCDB SteeringConfig table"""
    steering_config_id = models.IntegerField(primary_key=True)
    steering_type_id = models.IntegerField()
    steering_system_id = models.IntegerField()
    effective_date_time = models.DateTimeField()
    end_date_time = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vcdb_steeringconfig'
        ordering = ['steering_config_id']
        verbose_name = 'Steering Config'
        verbose_name_plural = 'Steering Configs'
    
    def __str__(self):
        return f"Steering Config {self.steering_config_id}"


class TransmissionType(models.Model):
    """AutoCare VCDB TransmissionType table"""
    transmission_type_id = models.IntegerField(primary_key=True)
    transmission_type_name = models.CharField(max_length=100)
    culture_id = models.CharField(max_length=10, default='en-US')
    effective_date_time = models.DateTimeField()
    end_date_time = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vcdb_transmissiontype'
        ordering = ['transmission_type_name']
        verbose_name = 'Transmission Type'
        verbose_name_plural = 'Transmission Types'
    
    def __str__(self):
        return self.transmission_type_name


class TransmissionNumSpeeds(models.Model):
    """AutoCare VCDB TransmissionNumSpeeds table"""
    transmission_num_speeds_id = models.IntegerField(primary_key=True)
    transmission_num_speeds = models.CharField(max_length=20)
    culture_id = models.CharField(max_length=10, default='en-US')
    effective_date_time = models.DateTimeField()
    end_date_time = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vcdb_transmissionnumspeeds'
        ordering = ['transmission_num_speeds_id']
        verbose_name = 'Transmission Num Speeds'
        verbose_name_plural = 'Transmission Num Speeds'
    
    def __str__(self):
        return self.transmission_num_speeds


class TransmissionControlType(models.Model):
    """AutoCare VCDB TransmissionControlType table"""
    transmission_control_type_id = models.IntegerField(primary_key=True)
    transmission_control_type_name = models.CharField(max_length=100)
    culture_id = models.CharField(max_length=10, default='en-US')
    effective_date_time = models.DateTimeField()
    end_date_time = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vcdb_transmissioncontroltype'
        ordering = ['transmission_control_type_name']
        verbose_name = 'Transmission Control Type'
        verbose_name_plural = 'Transmission Control Types'
    
    def __str__(self):
        return self.transmission_control_type_name


class TransmissionBase(models.Model):
    """AutoCare VCDB TransmissionBase table"""
    transmission_base_id = models.IntegerField(primary_key=True)
    transmission_type_id = models.IntegerField()
    transmission_num_speeds_id = models.IntegerField()
    transmission_control_type_id = models.IntegerField()
    effective_date_time = models.DateTimeField()
    end_date_time = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vcdb_transmissionbase'
        ordering = ['transmission_base_id']
        verbose_name = 'Transmission Base'
        verbose_name_plural = 'Transmission Bases'
    
    def __str__(self):
        return f"Transmission Base {self.transmission_base_id}"


class TransmissionMfrCode(models.Model):
    """AutoCare VCDB TransmissionMfrCode table"""
    transmission_mfr_code_id = models.IntegerField(primary_key=True)
    transmission_mfr_code = models.CharField(max_length=50)
    culture_id = models.CharField(max_length=10, default='en-US')
    effective_date_time = models.DateTimeField()
    end_date_time = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vcdb_transmissionmfrcode'
        ordering = ['transmission_mfr_code_id']
        verbose_name = 'Transmission Mfr Code'
        verbose_name_plural = 'Transmission Mfr Codes'
    
    def __str__(self):
        return self.transmission_mfr_code


class Transmission(models.Model):
    """AutoCare VCDB Transmission table"""
    transmission_id = models.IntegerField(primary_key=True)
    transmission_base_id = models.IntegerField()
    transmission_mfr_code_id = models.IntegerField()
    transmission_elec_controlled_id = models.IntegerField()
    transmission_mfr_id = models.IntegerField()
    effective_date_time = models.DateTimeField()
    end_date_time = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vcdb_transmission'
        ordering = ['transmission_id']
        verbose_name = 'Transmission'
        verbose_name_plural = 'Transmissions'
    
    def __str__(self):
        return f"Transmission {self.transmission_id}"


class Valves(models.Model):
    """AutoCare VCDB Valves table"""
    valves_id = models.IntegerField(primary_key=True)
    valves_per_engine = models.CharField(max_length=20)
    culture_id = models.CharField(max_length=10, default='en-US')
    effective_date_time = models.DateTimeField()
    end_date_time = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vcdb_valves'
        ordering = ['valves_id']
        verbose_name = 'Valves'
        verbose_name_plural = 'Valves'
    
    def __str__(self):
        return f"Valves {self.valves_id}"


class VehicleTypeGroup(models.Model):
    """AutoCare VCDB VehicleTypeGroup table"""
    vehicle_type_group_id = models.IntegerField(primary_key=True)
    vehicle_type_group_name = models.CharField(max_length=100)
    culture_id = models.CharField(max_length=10, default='en-US')
    effective_date_time = models.DateTimeField()
    end_date_time = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vcdb_vehicletypegroup'
        ordering = ['vehicle_type_group_name']
        verbose_name = 'Vehicle Type Group'
        verbose_name_plural = 'Vehicle Type Groups'
    
    def __str__(self):
        return self.vehicle_type_group_name


class VehicleType(models.Model):
    """AutoCare VCDB VehicleType table"""
    vehicle_type_id = models.IntegerField(primary_key=True)
    vehicle_type_name = models.CharField(max_length=100)
    vehicle_type_group_id = models.IntegerField()
    culture_id = models.CharField(max_length=10, default='en-US')
    effective_date_time = models.DateTimeField()
    end_date_time = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vcdb_vehicletype'
        ordering = ['vehicle_type_name']
        verbose_name = 'Vehicle Type'
        verbose_name_plural = 'Vehicle Types'
    
    def __str__(self):
        return self.vehicle_type_name


class WheelBase(models.Model):
    """AutoCare VCDB WheelBase table"""
    wheel_base_id = models.IntegerField(primary_key=True)
    wheel_base = models.CharField(max_length=50)
    wheel_base_metric = models.CharField(max_length=50)
    source = models.CharField(max_length=50, blank=True)
    culture_id = models.CharField(max_length=10, default='en-US')
    effective_date_time = models.DateTimeField()
    end_date_time = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vcdb_wheelbase'
        ordering = ['wheel_base_id']
        verbose_name = 'Wheel Base'
        verbose_name_plural = 'Wheel Bases'
    
    def __str__(self):
        return self.wheel_base


# Vehicle-to-* relationship tables (additional)

class VehicleToBedConfig(models.Model):
    """AutoCare VCDB VehicleToBedConfig table"""
    vehicle_to_bed_config_id = models.IntegerField(primary_key=True)
    vehicle_id = models.ForeignKey(Vehicle, on_delete=models.CASCADE, db_column='vehicle_id')
    bed_config_id = models.IntegerField()
    source = models.CharField(max_length=50)
    effective_date_time = models.DateTimeField()
    end_date_time = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vcdb_vehicletobedconfig'
        ordering = ['vehicle_to_bed_config_id']
        verbose_name = 'Vehicle to Bed Config'
        verbose_name_plural = 'Vehicle to Bed Configs'
        unique_together = ['vehicle_id', 'bed_config_id']
    
    def __str__(self):
        return f"{self.vehicle_id} - BedConfig {self.bed_config_id}"


class VehicleToBodyConfig(models.Model):
    """AutoCare VCDB VehicleToBodyConfig table"""
    vehicle_to_body_config_id = models.IntegerField(primary_key=True)
    vehicle_id = models.ForeignKey(Vehicle, on_delete=models.CASCADE, db_column='vehicle_id')
    body_style_config_id = models.IntegerField()
    bed_config_id = models.IntegerField()
    mfr_body_code_id = models.IntegerField()
    wheelbase_id = models.IntegerField()
    source = models.CharField(max_length=50)
    effective_date_time = models.DateTimeField()
    end_date_time = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vcdb_vehicletobodyconfig'
        ordering = ['vehicle_to_body_config_id']
        verbose_name = 'Vehicle to Body Config'
        verbose_name_plural = 'Vehicle to Body Configs'
    
    def __str__(self):
        return f"{self.vehicle_id} - BodyConfig {self.vehicle_to_body_config_id}"


class VehicleToBrakeConfig(models.Model):
    """AutoCare VCDB VehicleToBrakeConfig table"""
    vehicle_to_brake_config_id = models.IntegerField(primary_key=True)
    vehicle_id = models.ForeignKey(Vehicle, on_delete=models.CASCADE, db_column='vehicle_id')
    brake_config_id = models.IntegerField()
    source = models.CharField(max_length=50)
    effective_date_time = models.DateTimeField()
    end_date_time = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vcdb_vehicletobrakeconfig'
        ordering = ['vehicle_to_brake_config_id']
        verbose_name = 'Vehicle to Brake Config'
        verbose_name_plural = 'Vehicle to Brake Configs'
        unique_together = ['vehicle_id', 'brake_config_id']
    
    def __str__(self):
        return f"{self.vehicle_id} - BrakeConfig {self.brake_config_id}"


class VehicleToClass(models.Model):
    """AutoCare VCDB VehicleToClass table"""
    vehicle_to_class_id = models.IntegerField(primary_key=True)
    vehicle_id = models.ForeignKey(Vehicle, on_delete=models.CASCADE, db_column='vehicle_id')
    class_id = models.IntegerField()
    source = models.CharField(max_length=50)
    effective_date_time = models.DateTimeField()
    end_date_time = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vcdb_vehicletoclass'
        ordering = ['vehicle_to_class_id']
        verbose_name = 'Vehicle to Class'
        verbose_name_plural = 'Vehicle to Classes'
        unique_together = ['vehicle_id', 'class_id']
    
    def __str__(self):
        return f"{self.vehicle_id} - Class {self.class_id}"


class VehicleToMfrBodyCode(models.Model):
    """AutoCare VCDB VehicleToMfrBodyCode table"""
    vehicle_to_mfr_body_code_id = models.IntegerField(primary_key=True)
    vehicle_id = models.ForeignKey(Vehicle, on_delete=models.CASCADE, db_column='vehicle_id')
    mfr_body_code_id = models.IntegerField()
    source = models.CharField(max_length=50)
    effective_date_time = models.DateTimeField()
    end_date_time = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vcdb_vehicletomfrbodycode'
        ordering = ['vehicle_to_mfr_body_code_id']
        verbose_name = 'Vehicle to Mfr Body Code'
        verbose_name_plural = 'Vehicle to Mfr Body Codes'
        unique_together = ['vehicle_id', 'mfr_body_code_id']
    
    def __str__(self):
        return f"{self.vehicle_id} - MfrBodyCode {self.mfr_body_code_id}"


class VehicleToSpringTypeConfig(models.Model):
    """AutoCare VCDB VehicleToSpringTypeConfig table"""
    vehicle_to_spring_type_config_id = models.IntegerField(primary_key=True)
    vehicle_id = models.ForeignKey(Vehicle, on_delete=models.CASCADE, db_column='vehicle_id')
    spring_type_config_id = models.IntegerField()
    source = models.CharField(max_length=50)
    effective_date_time = models.DateTimeField()
    end_date_time = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vcdb_vehicletospringtypeconfig'
        ordering = ['vehicle_to_spring_type_config_id']
        verbose_name = 'Vehicle to Spring Type Config'
        verbose_name_plural = 'Vehicle to Spring Type Configs'
        unique_together = ['vehicle_id', 'spring_type_config_id']
    
    def __str__(self):
        return f"{self.vehicle_id} - SpringTypeConfig {self.spring_type_config_id}"


class VehicleToSteeringConfig(models.Model):
    """AutoCare VCDB VehicleToSteeringConfig table"""
    vehicle_to_steering_config_id = models.IntegerField(primary_key=True)
    vehicle_id = models.ForeignKey(Vehicle, on_delete=models.CASCADE, db_column='vehicle_id')
    steering_config_id = models.IntegerField()
    source = models.CharField(max_length=50)
    effective_date_time = models.DateTimeField()
    end_date_time = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vcdb_vehicletosteeringconfig'
        ordering = ['vehicle_to_steering_config_id']
        verbose_name = 'Vehicle to Steering Config'
        verbose_name_plural = 'Vehicle to Steering Configs'
        unique_together = ['vehicle_id', 'steering_config_id']
    
    def __str__(self):
        return f"{self.vehicle_id} - SteeringConfig {self.steering_config_id}"


class VehicleToTransmission(models.Model):
    """AutoCare VCDB VehicleToTransmission table"""
    vehicle_to_transmission_id = models.IntegerField(primary_key=True)
    vehicle_id = models.ForeignKey(Vehicle, on_delete=models.CASCADE, db_column='vehicle_id')
    transmission_id = models.IntegerField()
    source = models.CharField(max_length=50)
    effective_date_time = models.DateTimeField()
    end_date_time = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vcdb_vehicletotransmission'
        ordering = ['vehicle_to_transmission_id']
        verbose_name = 'Vehicle to Transmission'
        verbose_name_plural = 'Vehicle to Transmissions'
        unique_together = ['vehicle_id', 'transmission_id']
    
    def __str__(self):
        return f"{self.vehicle_id} - Transmission {self.transmission_id}"


class VehicleToWheelbase(models.Model):
    """AutoCare VCDB VehicleToWheelbase table"""
    vehicle_to_wheelbase_id = models.IntegerField(primary_key=True)
    vehicle_id = models.ForeignKey(Vehicle, on_delete=models.CASCADE, db_column='vehicle_id')
    wheelbase_id = models.IntegerField()
    source = models.CharField(max_length=50)
    effective_date_time = models.DateTimeField()
    end_date_time = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vcdb_vehicletowheelbase'
        ordering = ['vehicle_to_wheelbase_id']
        verbose_name = 'Vehicle to Wheelbase'
        verbose_name_plural = 'Vehicle to Wheelbases'
        unique_together = ['vehicle_id', 'wheelbase_id']
    
    def __str__(self):
        return f"{self.vehicle_id} - Wheelbase {self.wheelbase_id}"
