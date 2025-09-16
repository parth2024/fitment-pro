from rest_framework import serializers
from .models import DataUploadSession, FileValidationLog, DataProcessingLog, AIFitmentResult, AppliedFitment


class FileValidationLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = FileValidationLog
        fields = ['file_type', 'validation_type', 'is_valid', 'message', 'details', 'created_at']


class DataProcessingLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = DataProcessingLog
        fields = ['step', 'status', 'message', 'details', 'started_at', 'completed_at']


class DataUploadSessionSerializer(serializers.ModelSerializer):
    validation_logs = FileValidationLogSerializer(many=True, read_only=True)
    processing_logs = DataProcessingLogSerializer(many=True, read_only=True)
    
    class Meta:
        model = DataUploadSession
        fields = [
            'id', 'vcdb_file', 'products_file', 'vcdb_filename', 'products_filename',
            'vcdb_file_size', 'products_file_size', 'status', 'vcdb_valid', 'products_valid',
            'validation_errors', 'vcdb_records', 'products_records', 'created_at', 'updated_at',
            'validation_logs', 'processing_logs'
        ]
        read_only_fields = [
            'id', 'vcdb_file_size', 'products_file_size', 'status', 'vcdb_valid', 'products_valid',
            'validation_errors', 'vcdb_records', 'products_records', 'created_at', 'updated_at',
            'validation_logs', 'processing_logs'
        ]


class DataUploadSessionListSerializer(serializers.ModelSerializer):
    """Simplified serializer for list views"""
    has_both_files = serializers.ReadOnlyField()
    is_ready_for_processing = serializers.ReadOnlyField()
    
    class Meta:
        model = DataUploadSession
        fields = [
            'id', 'vcdb_filename', 'products_filename', 'status', 
            'vcdb_valid', 'products_valid', 'vcdb_records', 'products_records',
            'created_at', 'updated_at', 'has_both_files', 'is_ready_for_processing'
        ]


class FileUploadSerializer(serializers.Serializer):
    """Serializer for file upload requests"""
    vcdb_file = serializers.FileField(required=False, allow_null=True)
    products_file = serializers.FileField(required=False, allow_null=True)
    
    def validate(self, data):
        """Validate that at least one file is provided"""
        if not data.get('vcdb_file') and not data.get('products_file'):
            raise serializers.ValidationError("At least one file must be provided")
        return data


class FileInfoSerializer(serializers.Serializer):
    """Serializer for file information responses"""
    filename = serializers.CharField()
    size = serializers.IntegerField()
    valid = serializers.BooleanField()
    records = serializers.IntegerField()
    uploaded_at = serializers.DateTimeField()


class AIFitmentResultSerializer(serializers.ModelSerializer):
    """Serializer for AI fitment results"""
    class Meta:
        model = AIFitmentResult
        fields = [
            'id', 'part_id', 'part_description', 'year', 'make', 'model', 'submodel',
            'drive_type', 'position', 'quantity', 'confidence', 'confidence_explanation', 'ai_reasoning',
            'is_selected', 'is_applied', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class AppliedFitmentSerializer(serializers.ModelSerializer):
    """Serializer for applied fitments"""
    class Meta:
        model = AppliedFitment
        fields = [
            'id', 'part_id', 'part_description', 'year', 'make', 'model', 'submodel',
            'drive_type', 'position', 'quantity', 'title', 'description', 'notes',
            'applied_at'
        ]
        read_only_fields = ['id', 'applied_at']


class ApplyFitmentsRequestSerializer(serializers.Serializer):
    """Serializer for applying AI fitments request"""
    session_id = serializers.UUIDField()
    fitment_ids = serializers.ListField(
        child=serializers.IntegerField(),
        allow_empty=False
    )
