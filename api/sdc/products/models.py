from django.db import models
from tenants.models import Tenant
import uuid


class ProductConfiguration(models.Model):
    """Model to store product configuration for each tenant"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='product_configurations')
    
    # Product field configuration
    required_product_fields = models.JSONField(default=list, help_text="Required product fields")
    additional_attributes = models.JSONField(default=list, help_text="Additional product attributes")
    
    # Status
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Product Configuration"
        verbose_name_plural = "Product Configurations"
    
    def __str__(self):
        return f"{self.tenant.name} - Product Configuration"


class ProductData(models.Model):
    """Model to store product data for each tenant"""
    id = models.AutoField(primary_key=True)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='products_data')
    configuration = models.ForeignKey(ProductConfiguration, on_delete=models.CASCADE, related_name='products_data')
    
    # Product information
    part_number = models.CharField(max_length=100, help_text="Part number/ID")
    part_terminology_name = models.CharField(max_length=200, help_text="Part terminology name")
    ptid = models.CharField(max_length=100, help_text="PTID")
    parent_child = models.CharField(max_length=50, blank=True, help_text="Parent/Child relationship")
    
    # Additional attributes (dynamic)
    additional_attributes = models.JSONField(default=dict, blank=True)
    
    # File information
    source_file = models.CharField(max_length=255, blank=True, help_text="Source file name")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['part_number']
        verbose_name = "Product Data"
        verbose_name_plural = "Product Data"
        unique_together = ['tenant', 'part_number']
    
    def __str__(self):
        return f"{self.part_number} - {self.part_terminology_name}"


class ProductUpload(models.Model):
    """Model to track product file uploads"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='product_uploads')
    
    # File information
    filename = models.CharField(max_length=255)
    file_size = models.BigIntegerField(default=0)
    file_path = models.CharField(max_length=500)
    
    # Processing status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    records_processed = models.IntegerField(default=0)
    records_failed = models.IntegerField(default=0)
    error_message = models.TextField(blank=True, null=True)
    
    # Timestamps
    uploaded_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-uploaded_at']
        verbose_name = "Product Upload"
        verbose_name_plural = "Product Uploads"
    
    def __str__(self):
        return f"{self.tenant.name} - {self.filename} ({self.status})"
