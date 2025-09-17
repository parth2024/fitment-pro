from django.db import models
from django.utils import timezone
from django.contrib.auth.models import User
import uuid

# Create your models here.

class FitmentManager(models.Manager):
    """Custom manager to handle soft delete functionality"""
    
    def get_queryset(self):
        return super().get_queryset().filter(isDeleted=False)
    
    def all_with_deleted(self):
        return super().get_queryset()
    
    def deleted_only(self):
        return super().get_queryset().filter(isDeleted=True)


class Fitment(models.Model):
    FITMENT_TYPE_CHOICES = [
        ('manual_fitment', 'Manual Fitment'),
        ('potential_fitment', 'Potential Fitment'),
        ('ai_fitment', 'AI Fitment'),
    ]
    
    hash = models.CharField(max_length=64, primary_key=True, editable=False)
    partId = models.CharField(max_length=64)
    itemStatus = models.CharField(max_length=32, default='Active')
    itemStatusCode = models.IntegerField(default=0)
    baseVehicleId = models.CharField(max_length=64)
    year = models.IntegerField()
    makeName = models.CharField(max_length=64)
    modelName = models.CharField(max_length=64)
    subModelName = models.CharField(max_length=64)
    driveTypeName = models.CharField(max_length=32)
    fuelTypeName = models.CharField(max_length=32)
    bodyNumDoors = models.IntegerField()
    bodyTypeName = models.CharField(max_length=64)
    ptid = models.CharField(max_length=32)
    partTypeDescriptor = models.CharField(max_length=128)
    uom = models.CharField(max_length=16)
    quantity = models.IntegerField(default=1)
    fitmentTitle = models.CharField(max_length=200)
    fitmentDescription = models.TextField(blank=True, null=True)
    fitmentNotes = models.TextField(blank=True, null=True)
    position = models.CharField(max_length=64)
    positionId = models.IntegerField()
    liftHeight = models.CharField(max_length=32)
    wheelType = models.CharField(max_length=64)
    fitmentType = models.CharField(max_length=50, choices=FITMENT_TYPE_CHOICES, default='manual_fitment')
    createdAt = models.DateTimeField(auto_now_add=True)
    createdBy = models.CharField(max_length=64, default='system')
    updatedAt = models.DateTimeField(auto_now=True)
    updatedBy = models.CharField(max_length=64, default='system')
    
    # Dynamic fields storage with field configuration references
    dynamicFields = models.JSONField(
        default=dict, 
        blank=True, 
        help_text="Dynamic fields with field configuration references: {field_config_id: {value: '...', field_name: '...', field_config_id: 123}}"
    )
    
    # Soft delete fields
    isDeleted = models.BooleanField(default=False)
    deletedAt = models.DateTimeField(null=True, blank=True)
    deletedBy = models.CharField(max_length=64, blank=True, null=True)

    # Custom manager
    objects = FitmentManager()
    all_objects = models.Manager()  # Access to all objects including deleted

    class Meta:
        indexes = [
            models.Index(fields=['partId']),
            models.Index(fields=['makeName']),
            models.Index(fields=['modelName']),
            models.Index(fields=['year']),
            models.Index(fields=['updatedAt']),
        ]

    def save(self, *args, **kwargs):
        if not self.hash:
            self.hash = uuid.uuid4().hex
        return super().save(*args, **kwargs)
    
    def soft_delete(self, deleted_by='system'):
        """Soft delete the fitment"""
        self.isDeleted = True
        self.deletedAt = timezone.now()
        self.deletedBy = deleted_by
        self.save()
    
    def restore(self, restored_by='system'):
        """Restore a soft deleted fitment"""
        self.isDeleted = False
        self.deletedAt = None
        self.deletedBy = None
        self.updatedBy = restored_by
        self.save()
    
    def hard_delete(self):
        """Permanently delete the fitment"""
        super().delete()


class FitmentUploadSession(models.Model):
    """Model to track bulk upload sessions"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('validating', 'Validating'),
        ('validated', 'Validated'),
        ('submitted', 'Submitted'),
        ('failed', 'Failed'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    session_id = models.UUIDField(unique=True, default=uuid.uuid4)
    created_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    total_rows = models.IntegerField(default=0)
    valid_rows = models.IntegerField(default=0)
    invalid_rows = models.IntegerField(default=0)
    file_name = models.CharField(max_length=255, blank=True)
    
    class Meta:
        db_table = 'fitment_upload_sessions'
        
    def __str__(self):
        return f"Session {self.session_id} - {self.status}"


class FitmentValidationResult(models.Model):
    """Model to store validation results for each row"""
    session = models.ForeignKey(FitmentUploadSession, on_delete=models.CASCADE, related_name='validation_results')
    row_number = models.IntegerField()
    column_name = models.CharField(max_length=100)
    original_value = models.TextField(blank=True)
    corrected_value = models.TextField(null=True, blank=True)
    is_valid = models.BooleanField(default=True)
    error_message = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'fitment_validation_results'
        unique_together = ['session', 'row_number', 'column_name']
        
    def __str__(self):
        return f"Row {self.row_number} - {self.column_name} - {'Valid' if self.is_valid else 'Invalid'}"


class PotentialVehicleConfiguration(models.Model):
    """Model to store potential vehicle configurations for AI recommendations"""
    METHOD_CHOICES = [
        ('similarity', 'Similarity Analysis'),
        ('base-vehicle', 'Base Vehicle Analysis'),
    ]
    
    id = models.CharField(max_length=100, primary_key=True)
    vehicle_id = models.CharField(max_length=100)
    base_vehicle_id = models.CharField(max_length=64)
    body_style_config = models.CharField(max_length=100)
    year = models.IntegerField()
    make = models.CharField(max_length=64)
    model = models.CharField(max_length=64)
    submodel = models.CharField(max_length=64)
    drive_type = models.CharField(max_length=32)
    fuel_type = models.CharField(max_length=32)
    num_doors = models.IntegerField()
    body_type = models.CharField(max_length=64)
    relevance = models.IntegerField(default=0)  # AI confidence score (0-100)
    recommendation_method = models.CharField(max_length=20, choices=METHOD_CHOICES, default='similarity')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'potential_vehicle_configurations'
        indexes = [
            models.Index(fields=['make', 'model', 'year']),
            models.Index(fields=['base_vehicle_id']),
            models.Index(fields=['relevance']),
            models.Index(fields=['recommendation_method']),
        ]
        
    def __str__(self):
        return f"{self.year} {self.make} {self.model} {self.submodel} - {self.relevance}%"
