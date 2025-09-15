from django.db import models
from django.utils import timezone
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
