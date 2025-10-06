from rest_framework import serializers
from .models import ProductConfiguration, ProductData, ProductUpload


class ProductConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductConfiguration
        fields = [
            'id', 'required_product_fields', 'additional_attributes',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ProductDataSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductData
        fields = [
            'id', 'part_number', 'part_terminology_name', 'ptid',
            'parent_child', 'additional_attributes', 'source_file',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ProductUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductUpload
        fields = [
            'id', 'filename', 'file_size', 'status', 'records_processed',
            'records_failed', 'error_message', 'uploaded_at', 'processed_at'
        ]
        read_only_fields = ['id', 'uploaded_at', 'processed_at']


class ProductUploadCreateSerializer(serializers.Serializer):
    tenant_id = serializers.UUIDField()
    product_config = serializers.JSONField()
    files = serializers.ListField(
        child=serializers.FileField(),
        allow_empty=False
    )
