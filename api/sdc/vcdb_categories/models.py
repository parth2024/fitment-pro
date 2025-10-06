from django.db import models
from tenants.models import Tenant
import uuid


class VCDBCategory(models.Model):
    """Model to store global VCDB categories (not tenant-specific)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200, help_text="Category name (e.g., Light Duty, Heavy Duty)")
    description = models.TextField(blank=True, null=True, help_text="Category description")
    
    # File information
    file = models.FileField(
        upload_to='vcdb_categories/',
        help_text="VCDB data file for this category"
    )
    filename = models.CharField(max_length=255)
    file_size = models.BigIntegerField(default=0)
    
    # Version tracking
    version = models.CharField(max_length=10, default='v1', help_text="Version like v1, v2, etc.")
    
    # Validation status
    is_valid = models.BooleanField(default=False)
    validation_errors = models.JSONField(default=dict, blank=True)
    record_count = models.IntegerField(default=0)
    
    # Status
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        unique_together = ['name', 'version']
        verbose_name = "VCDB Category"
        verbose_name_plural = "VCDB Categories"
    
    def __str__(self):
        return f"{self.name} ({self.version})"


class VCDBData(models.Model):
    """Model to store parsed VCDB data for each category"""
    id = models.AutoField(primary_key=True)
    category = models.ForeignKey(VCDBCategory, on_delete=models.CASCADE, related_name='vcdb_data')
    
    # Vehicle information
    year = models.IntegerField()
    make = models.CharField(max_length=100)
    model = models.CharField(max_length=100)
    submodel = models.CharField(max_length=100, blank=True)
    drive_type = models.CharField(max_length=50, blank=True)
    fuel_type = models.CharField(max_length=50, blank=True)
    num_doors = models.IntegerField(null=True, blank=True)
    body_type = models.CharField(max_length=100, blank=True)
    
    # Additional fields
    engine_type = models.CharField(max_length=100, blank=True)
    transmission = models.CharField(max_length=100, blank=True)
    trim_level = models.CharField(max_length=100, blank=True)
    
    # Dynamic fields (JSON)
    dynamic_fields = models.JSONField(default=dict, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['year', 'make', 'model']
        verbose_name = "VCDB Data Record"
        verbose_name_plural = "VCDB Data Records"
        unique_together = ['category', 'year', 'make', 'model', 'submodel', 'drive_type']
    
    def __str__(self):
        return f"{self.year} {self.make} {self.model} {self.submodel}"


class FitmentJob(models.Model):
    """Model to track fitment processing jobs (tenant-specific)"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]
    
    FITMENT_TYPE_CHOICES = [
        ('manual', 'Manual Fitment'),
        ('ai', 'AI Fitment'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='fitment_jobs')
    
    # Job details
    job_type = models.CharField(max_length=20, choices=FITMENT_TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Configuration
    vcdb_categories = models.JSONField(default=list, help_text="Selected VCDB categories")
    product_fields = models.JSONField(default=dict, help_text="Product field configuration")
    ai_instructions = models.TextField(blank=True, null=True)
    
    # Progress tracking
    progress_percentage = models.IntegerField(default=0)
    current_step = models.CharField(max_length=100, blank=True)
    total_steps = models.IntegerField(default=0)
    completed_steps = models.IntegerField(default=0)
    
    # Results
    fitments_created = models.IntegerField(default=0)
    fitments_failed = models.IntegerField(default=0)
    error_message = models.TextField(blank=True, null=True)
    
    # Timestamps
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Fitment Job"
        verbose_name_plural = "Fitment Jobs"
    
    def __str__(self):
        return f"{self.tenant.name} - {self.job_type} Job ({self.status})"


class AIFitment(models.Model):
    """Model to store AI-generated fitments awaiting approval (tenant-specific)"""
    STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='ai_fitments')
    job = models.ForeignKey(FitmentJob, on_delete=models.CASCADE, related_name='ai_fitments')
    
    # Vehicle information
    year = models.IntegerField()
    make = models.CharField(max_length=100)
    model = models.CharField(max_length=100)
    submodel = models.CharField(max_length=100, blank=True)
    drive_type = models.CharField(max_length=50, blank=True)
    fuel_type = models.CharField(max_length=50, blank=True)
    num_doors = models.IntegerField(null=True, blank=True)
    body_type = models.CharField(max_length=100, blank=True)
    
    # Part information
    part_id = models.CharField(max_length=100)
    part_description = models.TextField()
    position = models.CharField(max_length=100)
    quantity = models.IntegerField(default=1)
    
    # AI analysis
    confidence_score = models.FloatField(help_text="AI confidence score (0-1)")
    ai_reasoning = models.TextField(help_text="AI explanation for this fitment")
    ai_instructions_used = models.TextField(blank=True, null=True)
    
    # Status and review
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    reviewed_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_notes = models.TextField(blank=True, null=True)
    
    # Dynamic fields
    dynamic_fields = models.JSONField(default=dict, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-confidence_score', '-created_at']
        verbose_name = "AI Fitment"
        verbose_name_plural = "AI Fitments"
    
    def __str__(self):
        return f"{self.year} {self.make} {self.model} - {self.part_id} ({self.confidence_score:.2f})"
