from django.db import models
from tenants.models import Tenant
from django.contrib.auth.models import User
import uuid


class Preset(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='presets')
    name = models.CharField(max_length=200)
    attribute_priorities = models.JSONField(null=True, blank=True)
    created_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = (('tenant', 'name'),)

    def __str__(self):
        return f"{self.name} ({self.tenant.slug})"


class Upload(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='uploads')
    filename = models.CharField(max_length=400)
    content_type = models.CharField(max_length=120)
    storage_url = models.TextField()
    file_size_bytes = models.IntegerField()
    status = models.CharField(max_length=40, default='received')
    checksum = models.CharField(max_length=128, blank=True, null=True)
    file_format = models.CharField(max_length=16, blank=True, null=True)
    preflight_report = models.JSONField(blank=True, null=True)
    preset = models.ForeignKey(Preset, null=True, blank=True, on_delete=models.SET_NULL)
    created_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [models.Index(fields=['tenant', 'status'], name='ix_upload_tenant_status')]


class Job(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='jobs')
    upload = models.ForeignKey(Upload, on_delete=models.CASCADE, related_name='jobs')
    job_type = models.CharField(max_length=60)
    status = models.CharField(max_length=40, default='queued')
    params = models.JSONField(null=True, blank=True)
    result = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [models.Index(fields=['tenant', 'job_type', 'status'], name='ix_job_tenant_type_status')]


class NormalizationResult(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE)
    upload = models.ForeignKey(Upload, on_delete=models.CASCADE)
    row_index = models.IntegerField()
    mapped_entities = models.JSONField()
    confidence = models.FloatField()
    status = models.CharField(max_length=40, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = (('upload', 'row_index'),)
        indexes = [models.Index(fields=['tenant', 'upload', 'status'], name='ix_norm_tenant_upload_status')]


class Lineage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE)
    entity_type = models.CharField(max_length=60)
    entity_id = models.UUIDField()
    parent_entity_type = models.CharField(max_length=60, null=True, blank=True)
    parent_entity_id = models.UUIDField(null=True, blank=True)
    meta = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=['tenant', 'entity_type', 'entity_id'], name='ix_lineage_tenant_entity')]
