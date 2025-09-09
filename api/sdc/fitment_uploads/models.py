from django.db import models
import uuid
import json


class FitmentUploadSession(models.Model):
    """Model to track fitment upload sessions"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vcdb_file = models.FileField(upload_to='fitment_uploads/vcdb/')
    products_file = models.FileField(upload_to='fitment_uploads/products/')
    vcdb_filename = models.CharField(max_length=255)
    products_filename = models.CharField(max_length=255)
    vcdb_records = models.IntegerField(default=0)
    products_records = models.IntegerField(default=0)
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
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Session {self.id} - {self.status}"


class AIFitmentResult(models.Model):
    """Model to store AI-generated fitment results"""
    session = models.ForeignKey(FitmentUploadSession, on_delete=models.CASCADE, related_name='ai_results')
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
    ai_reasoning = models.TextField()
    is_selected = models.BooleanField(default=False)
    is_applied = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-confidence', 'part_id']
    
    def __str__(self):
        return f"{self.part_id} -> {self.year} {self.make} {self.model} ({self.confidence:.2f})"


class AppliedFitment(models.Model):
    """Model to track applied fitments"""
    session = models.ForeignKey(FitmentUploadSession, on_delete=models.CASCADE, related_name='applied_fitments')
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
    
    def __str__(self):
        return f"{self.part_id} -> {self.year} {self.make} {self.model}"