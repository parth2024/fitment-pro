from django.db import models
from django.contrib.auth.models import User
from django.utils.text import slugify
import uuid


class Tenant(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200, unique=True)
    slug = models.SlugField(max_length=120, unique=True, blank=True, null=True)
    description = models.TextField(blank=True, null=True, help_text="Description of the entity/company")
    
    # Entity settings and configuration
    fitment_settings = models.JSONField(
        default=dict, 
        blank=True,
        help_text="Entity-level fitment settings and preferences"
    )
    default_fitment_method = models.CharField(
        max_length=20,
        choices=[
            ('manual', 'Manual'),
            ('ai', 'AI'),
        ],
        default='manual',
        help_text="Default fitment method for this entity"
    )
    ai_instructions = models.TextField(
        blank=True, 
        null=True,
        help_text="Default AI instructions for this entity"
    )
    
    # Contact and company info
    contact_email = models.EmailField(blank=True, null=True)
    contact_phone = models.CharField(max_length=20, blank=True, null=True)
    company_address = models.TextField(blank=True, null=True)
    
    # Status and metadata
    is_active = models.BooleanField(default=True)
    is_default = models.BooleanField(
        default=False,
        help_text="Default entity for new users"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='created_tenants'
    )

    class Meta:
        ordering = ['name']
        verbose_name = "Entity"
        verbose_name_plural = "Entities"

    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        # Normalize empty slug to None and auto-generate from name if missing
        if self.slug is not None and isinstance(self.slug, str) and self.slug.strip() == "":
            self.slug = None

        if not self.slug and self.name:
            base_slug = slugify(self.name)
            # Fallback if name slugifies to empty
            if not base_slug:
                base_slug = str(self.id or "tenant")

            unique_slug = base_slug
            suffix = 2
            # Ensure uniqueness; exclude current instance when updating
            while Tenant.objects.filter(slug=unique_slug).exclude(id=self.id).exists():
                unique_slug = f"{base_slug}-{suffix}"
                suffix += 1
            self.slug = unique_slug

        # Ensure only one default entity
        if self.is_default:
            Tenant.objects.filter(is_default=True).exclude(id=self.id).update(is_default=False)
        super().save(*args, **kwargs)


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
