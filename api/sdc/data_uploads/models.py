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
