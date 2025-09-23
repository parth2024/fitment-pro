from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import Tenant, Role, UserProfile


@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'is_active', 'is_default', 'user_count', 'created_at']
    list_filter = ['is_active', 'is_default', 'created_at']
    search_fields = ['name', 'slug', 'description', 'contact_email']
    readonly_fields = ['id', 'created_at', 'updated_at', 'user_count_display']
    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'name', 'slug', 'description')
        }),
        ('Settings & Configuration', {
            'fields': ('fitment_settings', 'ai_instructions'),
            'classes': ('collapse',)
        }),
        ('Contact Information', {
            'fields': ('contact_email', 'contact_phone', 'company_address'),
            'classes': ('collapse',)
        }),
        ('Status', {
            'fields': ('is_active', 'is_default')
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at', 'updated_at', 'user_count_display'),
            'classes': ('collapse',)
        }),
    )
    
    def user_count(self, obj):
        return obj.users.count()
    user_count.short_description = 'Users'
    
    def user_count_display(self, obj):
        count = obj.users.count()
        if count > 0:
            url = reverse('admin:tenants_userprofile_changelist') + f'?tenant__id__exact={obj.id}'
            return format_html('<a href="{}">{} users</a>', url, count)
        return f'{count} users'
    user_count_display.short_description = 'User Count'
    
    def save_model(self, request, obj, form, change):
        if not change:  # Only set created_by for new objects
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ['name', 'description', 'user_count']
    search_fields = ['name', 'description']
    
    def user_count(self, obj):
        return obj.users.count()
    user_count.short_description = 'Users'


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'tenant', 'display_name', 'is_active', 'roles_display']
    list_filter = ['tenant', 'is_active', 'roles']
    search_fields = ['user__username', 'user__email', 'display_name', 'tenant__name']
    filter_horizontal = ['roles']
    
    def roles_display(self, obj):
        return ', '.join([role.name for role in obj.roles.all()])
    roles_display.short_description = 'Roles'
    
    fieldsets = (
        ('User Information', {
            'fields': ('user', 'display_name', 'is_active')
        }),
        ('Tenant Assignment', {
            'fields': ('tenant',)
        }),
        ('Roles', {
            'fields': ('roles',),
            'classes': ('collapse',)
        }),
    )
