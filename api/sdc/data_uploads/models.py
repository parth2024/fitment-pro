from django.db import models
import uuid
import os
from django.core.files.storage import FileSystemStorage


class DataUploadSession(models.Model):
    """Model to track data upload sessions for VCDB and Products files"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # File fields with custom storage paths
    vcdb_file = models.FileField(
        upload_to='data_uploads/vcdb/',
        null=True,
        blank=True,
        help_text="VCDB/Vehicle data file"
    )
    products_file = models.FileField(
        upload_to='data_uploads/products/',
        null=True,
        blank=True,
        help_text="Products/Parts data file"
    )
    
    # File metadata
    vcdb_filename = models.CharField(max_length=255, blank=True)
    products_filename = models.CharField(max_length=255, blank=True)
    vcdb_file_size = models.BigIntegerField(default=0)
    products_file_size = models.BigIntegerField(default=0)
    
    # Processing status
    status = models.CharField(
        max_length=20,
        choices=[
            ('uploading', 'Uploading'),
            ('uploaded', 'Uploaded'),
            ('processing', 'Processing'),
            ('completed', 'Completed'),
            ('error', 'Error'),
        ],
        default='uploading'
    )
    
    # File validation
    vcdb_valid = models.BooleanField(default=False)
    products_valid = models.BooleanField(default=False)
    validation_errors = models.JSONField(default=dict, blank=True)
    
    # Record counts (populated after processing)
    vcdb_records = models.IntegerField(default=0)
    products_records = models.IntegerField(default=0)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Data Upload Session"
        verbose_name_plural = "Data Upload Sessions"
    
    def __str__(self):
        return f"Data Session {self.id} - {self.status}"
    
    @property
    def has_both_files(self):
        """Check if both VCDB and Products files are uploaded"""
        return bool(self.vcdb_file and self.products_file)
    
    @property
    def is_ready_for_processing(self):
        """Check if session is ready for fitment processing"""
        return (
            self.has_both_files and 
            self.vcdb_valid and 
            self.products_valid and 
            self.status == 'uploaded'
        )
    
    def get_file_info(self, file_type):
        """Get file information for a specific type"""
        if file_type == 'vcdb':
            return {
                'filename': self.vcdb_filename,
                'size': self.vcdb_file_size,
                'valid': self.vcdb_valid,
                'records': self.vcdb_records,
                'uploaded_at': self.created_at,
            }
        elif file_type == 'products':
            return {
                'filename': self.products_filename,
                'size': self.products_file_size,
                'valid': self.products_valid,
                'records': self.products_records,
                'uploaded_at': self.created_at,
            }
        return None


class VCDBData(models.Model):
    """Model to store VCDB (Vehicle Configuration Database) data"""
    id = models.AutoField(primary_key=True)
    year = models.IntegerField()
    make = models.CharField(max_length=100)
    model = models.CharField(max_length=100)
    submodel = models.CharField(max_length=100, blank=True)
    drive_type = models.CharField(max_length=50, blank=True)
    fuel_type = models.CharField(max_length=50, blank=True)
    num_doors = models.IntegerField(null=True, blank=True)
    body_type = models.CharField(max_length=100, blank=True)
    
    # Additional fields that might be in the data
    engine_type = models.CharField(max_length=100, blank=True)
    transmission = models.CharField(max_length=100, blank=True)
    trim_level = models.CharField(max_length=100, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['year', 'make', 'model']
        verbose_name = "VCDB Data"
        verbose_name_plural = "VCDB Data"
        unique_together = ['year', 'make', 'model', 'submodel', 'drive_type']
    
    def __str__(self):
        return f"{self.year} {self.make} {self.model} {self.submodel}"


class ProductData(models.Model):
    """Model to store Product/Parts data"""
    id = models.AutoField(primary_key=True)
    part_id = models.CharField(max_length=100, unique=True)
    description = models.TextField()
    category = models.CharField(max_length=100, blank=True)
    part_type = models.CharField(max_length=100, blank=True)
    compatibility = models.CharField(max_length=100, blank=True)
    
    # Specifications as JSON field for flexibility
    specifications = models.JSONField(default=dict, blank=True)
    
    # Additional fields
    brand = models.CharField(max_length=100, blank=True)
    sku = models.CharField(max_length=100, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    weight = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    dimensions = models.CharField(max_length=200, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['part_id']
        verbose_name = "Product Data"
        verbose_name_plural = "Product Data"
    
    def __str__(self):
        return f"{self.part_id} - {self.description[:50]}"


class FileValidationLog(models.Model):
    """Model to track file validation results"""
    session = models.ForeignKey(
        DataUploadSession, 
        on_delete=models.CASCADE, 
        related_name='validation_logs'
    )
    file_type = models.CharField(
        max_length=20,
        choices=[
            ('vcdb', 'VCDB'),
            ('products', 'Products'),
        ]
    )
    validation_type = models.CharField(max_length=50)  # e.g., 'format', 'schema', 'data'
    is_valid = models.BooleanField()
    message = models.TextField()
    details = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "File Validation Log"
        verbose_name_plural = "File Validation Logs"
    
    def __str__(self):
        return f"{self.file_type} validation - {'Valid' if self.is_valid else 'Invalid'}"


class DataProcessingLog(models.Model):
    """Model to track data processing activities"""
    session = models.ForeignKey(
        DataUploadSession, 
        on_delete=models.CASCADE, 
        related_name='processing_logs'
    )
    step = models.CharField(max_length=100)
    status = models.CharField(
        max_length=20,
        choices=[
            ('started', 'Started'),
            ('completed', 'Completed'),
            ('failed', 'Failed'),
        ]
    )
    message = models.TextField(blank=True)
    details = models.JSONField(default=dict, blank=True)
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-started_at']
        verbose_name = "Data Processing Log"
        verbose_name_plural = "Data Processing Logs"
    
    def __str__(self):
        return f"{self.session.id} - {self.step} ({self.status})"


class AIFitmentResult(models.Model):
    """Model to store AI-generated fitment results for data upload sessions"""
    session = models.ForeignKey(DataUploadSession, on_delete=models.CASCADE, related_name='ai_results')
    part_id = models.CharField(max_length=100)
    part_description = models.TextField()
    year = models.IntegerField()
    make = models.CharField(max_length=100)
    model = models.CharField(max_length=100)
    submodel = models.CharField(max_length=100, blank=True)
    drive_type = models.CharField(max_length=50, blank=True)
    position = models.CharField(max_length=100, default='Front', blank=True, null=True)
    quantity = models.IntegerField(default=1)
    confidence = models.FloatField(default=0.0)
    confidence_explanation = models.TextField(blank=True, null=True)
    ai_reasoning = models.TextField()
    is_selected = models.BooleanField(default=False)
    is_applied = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-confidence', 'part_id']
        verbose_name = "AI Fitment Result"
        verbose_name_plural = "AI Fitment Results"
    
    def __str__(self):
        return f"{self.part_id} -> {self.year} {self.make} {self.model} ({self.confidence:.2f})"


class AppliedFitment(models.Model):
    """Model to track applied fitments for data upload sessions"""
    session = models.ForeignKey(DataUploadSession, on_delete=models.CASCADE, related_name='applied_fitments')
    ai_result = models.ForeignKey(AIFitmentResult, on_delete=models.CASCADE, null=True, blank=True)
    part_id = models.CharField(max_length=100)
    part_description = models.TextField()
    year = models.IntegerField()
    make = models.CharField(max_length=100)
    model = models.CharField(max_length=100)
    submodel = models.CharField(max_length=100, blank=True)
    drive_type = models.CharField(max_length=50, blank=True)
    position = models.CharField(max_length=100)
    quantity = models.IntegerField(default=1)
    title = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    applied_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-applied_at']
        verbose_name = "Applied Fitment"
        verbose_name_plural = "Applied Fitments"
    
    def __str__(self):
        return f"{self.part_id} -> {self.year} {self.make} {self.model}"


class LiftHeight(models.Model):
    id = models.CharField(max_length=10, primary_key=True)
    value = models.CharField(max_length=50)

    class Meta:
        db_table = 'lift_heights'

    def __str__(self):
        return self.value


class WheelType(models.Model):
    id = models.CharField(max_length=10, primary_key=True)
    value = models.CharField(max_length=50)

    class Meta:
        db_table = 'wheel_types'

    def __str__(self):
        return self.value


class TireDiameter(models.Model):
    id = models.CharField(max_length=10, primary_key=True)
    value = models.CharField(max_length=50)

    class Meta:
        db_table = 'tire_diameters'

    def __str__(self):
        return self.value


class WheelDiameter(models.Model):
    id = models.CharField(max_length=10, primary_key=True)
    value = models.CharField(max_length=50)

    class Meta:
        db_table = 'wheel_diameters'

    def __str__(self):
        return self.value


class Backspacing(models.Model):
    id = models.CharField(max_length=10, primary_key=True)
    value = models.CharField(max_length=50)

    class Meta:
        db_table = 'backspacing'

    def __str__(self):
        return self.value