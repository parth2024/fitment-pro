from django.db import models
from django.contrib.auth.models import User
import uuid


class Tenant(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200, unique=True)
    slug = models.SlugField(max_length=120, unique=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class Role(models.Model):
    name = models.CharField(max_length=80, unique=True)
    description = models.CharField(max_length=200, blank=True, null=True)

    def __str__(self):
        return self.name


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='users')
    display_name = models.CharField(max_length=200, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    roles = models.ManyToManyField(Role, related_name='users', blank=True)

    class Meta:
        unique_together = (('tenant', 'user'),)

    def __str__(self):
        return f"{self.user.username} @ {self.tenant.slug}"
