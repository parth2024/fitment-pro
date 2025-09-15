from django.db import models
import uuid

# Create your models here.


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
