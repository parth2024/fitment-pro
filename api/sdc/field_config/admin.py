from django.contrib import admin
from django.utils.html import format_html
from .models import FieldConfiguration, FieldConfigurationHistory


@admin.register(FieldConfiguration)
class FieldConfigurationAdmin(admin.ModelAdmin):
    """Admin interface for FieldConfiguration"""
    
    list_display = [
        'name', 'display_name', 'field_type', 'reference_type',
        'requirement_level', 'is_enabled', 'display_order', 'created_at'
    ]
    list_filter = [
        'field_type', 'reference_type', 'requirement_level',
        'is_enabled', 'is_unique', 'show_in_filters', 'show_in_forms',
        'created_at', 'updated_at'
    ]
    search_fields = ['name', 'display_name', 'description']
    ordering = ['reference_type', 'display_order', 'name']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'display_name', 'description', 'field_type')
        }),
        ('Configuration', {
            'fields': ('reference_type', 'requirement_level', 'is_enabled', 'is_unique')
        }),
        ('Validation Rules', {
            'fields': ('min_length', 'max_length', 'min_value', 'max_value', 'enum_options'),
            'classes': ('collapse',)
        }),
        ('Display Configuration', {
            'fields': ('default_value', 'display_order', 'show_in_filters', 'show_in_forms')
        }),
        ('Metadata', {
            'fields': ('created_by', 'updated_by'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ['created_at', 'updated_at']
    
    def get_readonly_fields(self, request, obj=None):
        """Make name and reference_type readonly after creation"""
        readonly_fields = list(self.readonly_fields)
        if obj:  # editing an existing object
            readonly_fields.extend(['name', 'reference_type'])
        return readonly_fields
    
    def save_model(self, request, obj, form, change):
        """Set created_by/updated_by fields"""
        if not change:  # creating new object
            obj.created_by = request.user.username
        obj.updated_by = request.user.username
        super().save_model(request, obj, form, change)
    
    actions = ['enable_fields', 'disable_fields', 'make_required', 'make_optional']
    
    def enable_fields(self, request, queryset):
        """Enable selected fields"""
        updated = queryset.update(is_enabled=True)
        self.message_user(request, f'{updated} fields enabled successfully.')
    enable_fields.short_description = "Enable selected fields"
    
    def disable_fields(self, request, queryset):
        """Disable selected fields"""
        updated = queryset.update(is_enabled=False)
        self.message_user(request, f'{updated} fields disabled successfully.')
    disable_fields.short_description = "Disable selected fields"
    
    def make_required(self, request, queryset):
        """Make selected fields required"""
        updated = queryset.update(requirement_level='required')
        self.message_user(request, f'{updated} fields made required.')
    make_required.short_description = "Make selected fields required"
    
    def make_optional(self, request, queryset):
        """Make selected fields optional"""
        updated = queryset.update(requirement_level='optional')
        self.message_user(request, f'{updated} fields made optional.')
    make_optional.short_description = "Make selected fields optional"


@admin.register(FieldConfigurationHistory)
class FieldConfigurationHistoryAdmin(admin.ModelAdmin):
    """Admin interface for FieldConfigurationHistory"""
    
    list_display = ['field_config', 'action', 'changed_by', 'changed_at']
    list_filter = ['action', 'changed_by', 'changed_at']
    search_fields = ['field_config__name', 'field_config__display_name', 'changed_by', 'reason']
    ordering = ['-changed_at']
    readonly_fields = ['field_config', 'action', 'changed_by', 'changed_at', 'old_values', 'new_values', 'reason']
    
    def has_add_permission(self, request):
        """Prevent manual creation of history records"""
        return False
    
    def has_change_permission(self, request, obj=None):
        """Prevent editing of history records"""
        return False
    
    def has_delete_permission(self, request, obj=None):
        """Prevent deletion of history records"""
        return False
