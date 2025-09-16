from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


class FieldConfiguration(models.Model):
    """Model to store configurable fields for VCDB and Products"""
    
    FIELD_TYPES = [
        ('string', 'String'),
        ('number', 'Number'),
        ('boolean', 'Boolean'),
        ('enum', 'Enum'),
        ('date', 'Date'),
        ('text', 'Text'),
        ('decimal', 'Decimal'),
        ('integer', 'Integer'),
    ]
    
    REFERENCE_TYPES = [
        ('vcdb', 'VCDB'),
        ('product', 'Product'),
        ('both', 'Both'),
    ]
    
    FIELD_REQUIREMENTS = [
        ('required', 'Required'),
        ('optional', 'Optional'),
        ('disabled', 'Disabled'),
    ]
    
    # Basic field information
    name = models.CharField(
        max_length=100,
        help_text="Field name (will be used as column name)"
    )
    display_name = models.CharField(
        max_length=150,
        help_text="Human-readable display name"
    )
    description = models.TextField(
        blank=True,
        help_text="Field description for users"
    )
    
    # Field type and validation
    field_type = models.CharField(
        max_length=20,
        choices=FIELD_TYPES,
        default='string'
    )
    
    # Reference configuration
    reference_type = models.CharField(
        max_length=10,
        choices=REFERENCE_TYPES,
        help_text="Where this field applies (VCDB, Product, or Both)"
    )
    
    # Field requirements
    requirement_level = models.CharField(
        max_length=10,
        choices=FIELD_REQUIREMENTS,
        default='optional',
        help_text="Whether field is required, optional, or disabled"
    )
    
    # Field constraints
    is_enabled = models.BooleanField(
        default=True,
        help_text="Whether this field is currently active"
    )
    is_unique = models.BooleanField(
        default=False,
        help_text="Whether field values must be unique"
    )
    
    # Validation constraints
    min_length = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        help_text="Minimum length for string/text fields"
    )
    max_length = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1)],
        help_text="Maximum length for string/text fields"
    )
    min_value = models.DecimalField(
        max_digits=20,
        decimal_places=6,
        null=True,
        blank=True,
        help_text="Minimum value for numeric fields"
    )
    max_value = models.DecimalField(
        max_digits=20,
        decimal_places=6,
        null=True,
        blank=True,
        help_text="Maximum value for numeric fields"
    )
    
    # Enum options (stored as JSON)
    enum_options = models.JSONField(
        default=list,
        blank=True,
        help_text="Available options for enum fields"
    )
    
    # Default value
    default_value = models.TextField(
        blank=True,
        help_text="Default value for this field"
    )
    
    # Display configuration
    display_order = models.IntegerField(
        default=0,
        help_text="Order for displaying fields in forms"
    )
    show_in_filters = models.BooleanField(
        default=True,
        help_text="Whether to show this field in filter forms"
    )
    show_in_forms = models.BooleanField(
        default=True,
        help_text="Whether to show this field in data entry forms"
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.CharField(max_length=100, blank=True)
    updated_by = models.CharField(max_length=100, blank=True)
    
    class Meta:
        ordering = ['reference_type', 'display_order', 'name']
        verbose_name = "Field Configuration"
        verbose_name_plural = "Field Configurations"
        unique_together = ['name', 'reference_type']
    
    def __str__(self):
        return f"{self.display_name} ({self.reference_type})"
    
    def clean(self):
        """Custom validation"""
        from django.core.exceptions import ValidationError
        
        # Validate enum options for enum fields
        if self.field_type == 'enum' and not self.enum_options:
            raise ValidationError("Enum fields must have options defined")
        
        # Validate min/max length for string/text fields
        if self.field_type in ['string', 'text']:
            if self.min_length is not None and self.max_length is not None:
                if self.min_length > self.max_length:
                    raise ValidationError("Min length cannot be greater than max length")
        
        # Validate min/max value for numeric fields
        if self.field_type in ['number', 'decimal', 'integer']:
            if self.min_value is not None and self.max_value is not None:
                if self.min_value > self.max_value:
                    raise ValidationError("Min value cannot be greater than max value")
    
    @property
    def is_required(self):
        """Check if field is required"""
        return self.requirement_level == 'required' and self.is_enabled
    
    @property
    def is_optional(self):
        """Check if field is optional"""
        return self.requirement_level == 'optional' and self.is_enabled
    
    @property
    def is_disabled(self):
        """Check if field is disabled"""
        return self.requirement_level == 'disabled' or not self.is_enabled
    
    def get_validation_rules(self):
        """Get validation rules for this field"""
        rules = {
            'required': self.is_required,
            'type': self.field_type,
            'enabled': self.is_enabled,
        }
        
        if self.field_type in ['string', 'text']:
            if self.min_length is not None:
                rules['min_length'] = self.min_length
            if self.max_length is not None:
                rules['max_length'] = self.max_length
        
        if self.field_type in ['number', 'decimal', 'integer']:
            if self.min_value is not None:
                rules['min_value'] = float(self.min_value)
            if self.max_value is not None:
                rules['max_value'] = float(self.max_value)
        
        if self.field_type == 'enum':
            rules['choices'] = self.enum_options
        
        if self.default_value:
            rules['default'] = self.default_value
        
        return rules
    
    def validate_value(self, value):
        """Validate a field value against this field's configuration"""
        if not value and self.requirement_level == 'required':
            return {'is_valid': False, 'error': f'{self.display_name} is required'}
        
        if not value:
            return {'is_valid': True, 'error': None}
        
        try:
            if self.field_type == 'string' and not isinstance(value, str):
                return {'is_valid': False, 'error': f'{self.display_name} must be a string'}
            elif self.field_type in ['number', 'decimal', 'integer']:
                try:
                    if self.field_type == 'integer':
                        int(value)
                    else:
                        float(value)
                except (ValueError, TypeError):
                    return {'is_valid': False, 'error': f'{self.display_name} must be a valid number'}
            elif self.field_type == 'enum' and value not in self.enum_options:
                return {'is_valid': False, 'error': f'{self.display_name} must be one of: {", ".join(self.enum_options)}'}
            
            return {'is_valid': True, 'error': None}
        except Exception as e:
            return {'is_valid': False, 'error': f'Validation error: {str(e)}'}


class FieldConfigurationHistory(models.Model):
    """Model to track changes to field configurations"""
    
    ACTION_TYPES = [
        ('created', 'Created'),
        ('updated', 'Updated'),
        ('deleted', 'Deleted'),
        ('enabled', 'Enabled'),
        ('disabled', 'Disabled'),
    ]
    
    field_config = models.ForeignKey(
        FieldConfiguration,
        on_delete=models.CASCADE,
        related_name='history'
    )
    action = models.CharField(max_length=10, choices=ACTION_TYPES)
    changed_by = models.CharField(max_length=100)
    changed_at = models.DateTimeField(auto_now_add=True)
    old_values = models.JSONField(default=dict, blank=True)
    new_values = models.JSONField(default=dict, blank=True)
    reason = models.TextField(blank=True)
    
    class Meta:
        ordering = ['-changed_at']
        verbose_name = "Field Configuration History"
        verbose_name_plural = "Field Configuration Histories"
    
    def __str__(self):
        return f"{self.field_config.name} - {self.action} by {self.changed_by}"
