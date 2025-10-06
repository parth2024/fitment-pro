from rest_framework import serializers
from .models import Tenant, UserProfile


class TenantSerializer(serializers.ModelSerializer):
    user_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Tenant
        fields = [
            'id', 'name', 'slug', 'description', 'fitment_settings', 'ai_instructions',
            'contact_email', 'contact_phone', 'company_address', 'is_active', 
            'is_default', 'created_at', 'updated_at', 'user_count'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'user_count']
    
    def get_user_count(self, obj):
        return obj.users.count()


class TenantCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = [
            'name', 'slug', 'description', 'fitment_settings', 'ai_instructions',
            'contact_email', 'contact_phone', 'company_address', 'is_active', 'is_default'
        ]
    
    def validate_slug(self, value):
        if value and Tenant.objects.filter(slug=value).exists():
            raise serializers.ValidationError("A tenant with this slug already exists.")
        return value


class TenantUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = [
            'name', 'description', 'fitment_settings', 'ai_instructions',
            'contact_email', 'contact_phone', 'company_address', 'is_active', 'is_default'
        ]


class UserProfileSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True)
    tenant_name = serializers.CharField(source='tenant.name', read_only=True)
    
    class Meta:
        model = UserProfile
        fields = ['id', 'user', 'tenant', 'tenant_name', 'display_name', 'is_active', 'roles']
        read_only_fields = ['id', 'user', 'tenant_name']
