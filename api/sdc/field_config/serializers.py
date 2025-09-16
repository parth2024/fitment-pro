from rest_framework import serializers
from .models import FieldConfiguration, FieldConfigurationHistory


class FieldConfigurationSerializer(serializers.ModelSerializer):
    """Serializer for FieldConfiguration model"""
    
    is_required = serializers.ReadOnlyField()
    is_optional = serializers.ReadOnlyField()
    is_disabled = serializers.ReadOnlyField()
    validation_rules = serializers.SerializerMethodField()
    
    class Meta:
        model = FieldConfiguration
        fields = [
            'id', 'name', 'display_name', 'description', 'field_type',
            'reference_type', 'requirement_level', 'is_enabled', 'is_unique',
            'min_length', 'max_length', 'min_value', 'max_value',
            'enum_options', 'default_value', 'display_order',
            'show_in_filters', 'show_in_forms', 'created_at', 'updated_at',
            'created_by', 'updated_by', 'is_required', 'is_optional',
            'is_disabled', 'validation_rules'
        ]
        read_only_fields = ['created_at', 'updated_at', 'id']
    
    def get_validation_rules(self, obj):
        """Get validation rules for the field"""
        return obj.get_validation_rules()
    
    def validate(self, data):
        """Custom validation"""
        # Validate enum options for enum fields
        if data.get('field_type') == 'enum':
            enum_options = data.get('enum_options', [])
            if not enum_options:
                raise serializers.ValidationError(
                    "Enum fields must have options defined"
                )
        
        # Validate min/max length for string/text fields
        field_type = data.get('field_type')
        if field_type in ['string', 'text']:
            min_length = data.get('min_length')
            max_length = data.get('max_length')
            if min_length is not None and max_length is not None:
                if min_length > max_length:
                    raise serializers.ValidationError(
                        "Min length cannot be greater than max length"
                    )
        
        # Validate min/max value for numeric fields
        if field_type in ['number', 'decimal', 'integer']:
            min_value = data.get('min_value')
            max_value = data.get('max_value')
            if min_value is not None and max_value is not None:
                if min_value > max_value:
                    raise serializers.ValidationError(
                        "Min value cannot be greater than max value"
                    )
        
        return data


class FieldConfigurationCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating FieldConfiguration"""
    
    class Meta:
        model = FieldConfiguration
        fields = [
            'name', 'display_name', 'description', 'field_type',
            'reference_type', 'requirement_level', 'is_enabled', 'is_unique',
            'min_length', 'max_length', 'min_value', 'max_value',
            'enum_options', 'default_value', 'display_order',
            'show_in_filters', 'show_in_forms', 'created_by'
        ]
    
    def validate_name(self, value):
        """Validate field name"""
        # Check for uniqueness within reference type
        reference_type = self.initial_data.get('reference_type')
        if reference_type:
            existing = FieldConfiguration.objects.filter(
                name=value,
                reference_type=reference_type
            ).exclude(id=self.instance.id if self.instance else None)
            if existing.exists():
                raise serializers.ValidationError(
                    f"Field with name '{value}' already exists for {reference_type}"
                )
        return value


class FieldConfigurationUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating FieldConfiguration"""
    
    class Meta:
        model = FieldConfiguration
        fields = [
            'display_name', 'description', 'field_type',
            'requirement_level', 'is_enabled', 'is_unique',
            'min_length', 'max_length', 'min_value', 'max_value',
            'enum_options', 'default_value', 'display_order',
            'show_in_filters', 'show_in_forms', 'updated_by'
        ]
        read_only_fields = ['name', 'reference_type']


class FieldConfigurationListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing FieldConfiguration"""
    
    is_required = serializers.ReadOnlyField()
    is_optional = serializers.ReadOnlyField()
    is_disabled = serializers.ReadOnlyField()
    
    class Meta:
        model = FieldConfiguration
        fields = [
            'id', 'name', 'display_name', 'description', 'field_type',
            'reference_type', 'requirement_level', 'is_enabled', 'is_unique',
            'min_length', 'max_length', 'min_value', 'max_value',
            'enum_options', 'default_value', 'display_order',
            'show_in_filters', 'show_in_forms', 'created_at', 'updated_at',
            'created_by', 'updated_by', 'is_required', 'is_optional', 'is_disabled'
        ]


class FieldConfigurationHistorySerializer(serializers.ModelSerializer):
    """Serializer for FieldConfigurationHistory"""
    
    class Meta:
        model = FieldConfigurationHistory
        fields = [
            'id', 'action', 'changed_by', 'changed_at',
            'old_values', 'new_values', 'reason'
        ]
        read_only_fields = ['id', 'changed_at']
