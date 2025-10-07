from rest_framework import serializers
from .models import Tenant, UserProfile


class TenantSerializer(serializers.ModelSerializer):
    user_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Tenant
        fields = [
            'id', 'name', 'slug', 'description', 'fitment_settings', 'ai_instructions',
            'contact_email', 'contact_phone', 'company_address', 'is_active', 
            'is_default', 'default_fitment_method', 'created_at', 'updated_at', 'user_count'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'user_count']
    
    def get_user_count(self, obj):
        return obj.users.count()


class TenantCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = [
            'name', 'slug', 'description', 'fitment_settings', 'ai_instructions',
            'contact_email', 'contact_phone', 'company_address', 'is_active', 'is_default',
            'default_fitment_method'
        ]
    
    def validate_slug(self, value):
        # Treat empty strings as None
        if value is not None and isinstance(value, str) and value.strip() == "":
            return None
        if value and Tenant.objects.filter(slug=value).exists():
            raise serializers.ValidationError("A tenant with this slug already exists.")
        return value


class TenantUpdateSerializer(serializers.ModelSerializer):
    # Product configuration fields
    required_product_fields = serializers.ListField(
        child=serializers.CharField(), 
        required=False, 
        allow_empty=True,
        help_text="Required product fields"
    )
    additional_attributes = serializers.ListField(
        child=serializers.DictField(), 
        required=False, 
        allow_empty=True,
        help_text="Additional product attributes"
    )
    
    class Meta:
        model = Tenant
        fields = [
            'name', 'description', 'fitment_settings', 'ai_instructions',
            'contact_email', 'contact_phone', 'company_address', 'is_active', 'is_default',
            'default_fitment_method', 'required_product_fields', 'additional_attributes'
        ]
    
    def update(self, instance, validated_data):
        # Extract product configuration fields
        required_product_fields = validated_data.pop('required_product_fields', None)
        additional_attributes = validated_data.pop('additional_attributes', None)
        
        # Update the tenant instance
        instance = super().update(instance, validated_data)
        
        # Update fitment_settings with product configuration if provided
        if required_product_fields is not None or additional_attributes is not None:
            fitment_settings = instance.fitment_settings or {}
            
            if required_product_fields is not None:
                fitment_settings['required_product_fields'] = required_product_fields
            if additional_attributes is not None:
                fitment_settings['additional_attributes'] = additional_attributes
            
            instance.fitment_settings = fitment_settings
            instance.save(update_fields=['fitment_settings'])
        
        return instance


class UserProfileSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True)
    tenant_name = serializers.CharField(source='tenant.name', read_only=True)
    
    class Meta:
        model = UserProfile
        fields = ['id', 'user', 'tenant', 'tenant_name', 'display_name', 'is_active', 'roles']
        read_only_fields = ['id', 'user', 'tenant_name']
