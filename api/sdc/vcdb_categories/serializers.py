from rest_framework import serializers
from .models import VCDBCategory, VCDBData, FitmentJob, AIFitment


class VCDBCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = VCDBCategory
        fields = [
            'id', 'name', 'description', 'filename', 'file_size', 
            'version', 'is_valid', 'record_count', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class VCDBCategoryCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = VCDBCategory
        fields = ['name', 'description', 'file']
    
    def create(self, validated_data):
        # Set filename from uploaded file
        if 'file' in validated_data and validated_data['file']:
            validated_data['filename'] = validated_data['file'].name
            validated_data['file_size'] = validated_data['file'].size
        
        # Get next version number
        existing_categories = VCDBCategory.objects.filter(
            name=validated_data['name']
        ).order_by('-version')
        
        if existing_categories.exists():
            last_version = existing_categories.first().version
            version_num = int(last_version[1:]) + 1
            validated_data['version'] = f'v{version_num}'
        else:
            validated_data['version'] = 'v1'
        
        return super().create(validated_data)


class VCDBDataSerializer(serializers.ModelSerializer):
    class Meta:
        model = VCDBData
        fields = [
            'id', 'year', 'make', 'model', 'submodel', 'drive_type',
            'fuel_type', 'num_doors', 'body_type', 'engine_type',
            'transmission', 'trim_level', 'dynamic_fields', 'created_at'
        ]


class FitmentJobSerializer(serializers.ModelSerializer):
    class Meta:
        model = FitmentJob
        fields = [
            'id', 'job_type', 'status', 'vcdb_categories', 'product_fields',
            'ai_instructions', 'progress_percentage', 'current_step',
            'total_steps', 'completed_steps', 'fitments_created',
            'fitments_failed', 'error_message', 'started_at', 'completed_at',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'status', 'progress_percentage', 'current_step',
            'total_steps', 'completed_steps', 'fitments_created',
            'fitments_failed', 'error_message', 'started_at', 'completed_at',
            'created_at', 'updated_at'
        ]


class AIFitmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIFitment
        fields = [
            'id', 'year', 'make', 'model', 'submodel', 'drive_type',
            'fuel_type', 'num_doors', 'body_type', 'part_id',
            'part_description', 'position', 'quantity', 'confidence_score',
            'ai_reasoning', 'status', 'reviewed_at', 'review_notes',
            'dynamic_fields', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class AIFitmentUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIFitment
        fields = ['status', 'review_notes']
    
    def update(self, instance, validated_data):
        if validated_data.get('status') == 'approved':
            # Create actual fitment record
            from fitments.models import Fitment
            import hashlib
            
            fitment_data = {
                'tenant': instance.tenant,
                'partId': instance.part_id,
                'baseVehicleId': f"{instance.year}_{instance.make}_{instance.model}",
                'year': instance.year,
                'makeName': instance.make,
                'modelName': instance.model,
                'subModelName': instance.submodel,
                'driveTypeName': instance.drive_type,
                'fuelTypeName': instance.fuel_type,
                'bodyNumDoors': instance.num_doors or 0,
                'bodyTypeName': instance.body_type,
                'ptid': instance.part_id,
                'partTypeDescriptor': instance.part_description,
                'quantity': instance.quantity,
                'fitmentTitle': f"{instance.part_id} for {instance.year} {instance.make} {instance.model}",
                'fitmentDescription': instance.part_description,
                'position': instance.position,
                'fitmentType': 'ai_fitment',
                'aiDescription': instance.ai_reasoning,
                'confidenceScore': instance.confidence_score,
            }
            
            # Generate hash for the fitment
            fitment_hash = generate_fitment_hash(fitment_data)
            fitment_data['hash'] = fitment_hash
            
            Fitment.objects.create(**fitment_data)
        
        return super().update(instance, validated_data)
