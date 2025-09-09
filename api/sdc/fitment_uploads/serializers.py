from rest_framework import serializers
from .models import FitmentUploadSession, AIFitmentResult, AppliedFitment


class FitmentUploadSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = FitmentUploadSession
        fields = [
            'id', 'vcdb_filename', 'products_filename', 
            'vcdb_records', 'products_records', 'status',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class AIFitmentResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIFitmentResult
        fields = [
            'id', 'part_id', 'part_description', 'year', 'make', 'model',
            'submodel', 'drive_type', 'position', 'quantity', 'confidence',
            'ai_reasoning', 'is_selected', 'is_applied', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class AppliedFitmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = AppliedFitment
        fields = [
            'id', 'part_id', 'part_description', 'year', 'make', 'model',
            'submodel', 'drive_type', 'position', 'quantity', 'title',
            'description', 'notes', 'applied_at'
        ]
        read_only_fields = ['id', 'applied_at']


class FileUploadSerializer(serializers.Serializer):
    vcdb_file = serializers.FileField()
    products_file = serializers.FileField()


class AIFitmentRequestSerializer(serializers.Serializer):
    session_id = serializers.UUIDField()


class ApplyFitmentsRequestSerializer(serializers.Serializer):
    session_id = serializers.UUIDField()
    fitment_ids = serializers.ListField(
        child=serializers.IntegerField(),
        allow_empty=False
    )
