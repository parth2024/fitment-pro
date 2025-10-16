from rest_framework import serializers
from .models import (
    Make, Model, SubModel, Region, PublicationStage, Year, BaseVehicle, DriveType, FuelType,
    BodyNumDoors, BodyType, BodyStyleConfig, EngineConfig, Vehicle,
    VehicleToDriveType, VehicleToBodyStyleConfig, VehicleToEngineConfig,
    VCDBSyncLog
)


class MakeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Make
        fields = '__all__'


class ModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Model
        fields = '__all__'


class SubModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubModel
        fields = '__all__'


class RegionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Region
        fields = '__all__'


class PublicationStageSerializer(serializers.ModelSerializer):
    class Meta:
        model = PublicationStage
        fields = '__all__'


class YearSerializer(serializers.ModelSerializer):
    class Meta:
        model = Year
        fields = '__all__'


class DriveTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = DriveType
        fields = '__all__'


class FuelTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = FuelType
        fields = '__all__'


class BodyNumDoorsSerializer(serializers.ModelSerializer):
    class Meta:
        model = BodyNumDoors
        fields = '__all__'


class BodyTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = BodyType
        fields = '__all__'


class BaseVehicleSerializer(serializers.ModelSerializer):
    make_name = serializers.CharField(source='make_id.make_name', read_only=True)
    model_name = serializers.CharField(source='model_id.model_name', read_only=True)
    
    class Meta:
        model = BaseVehicle
        fields = '__all__'


class BodyStyleConfigSerializer(serializers.ModelSerializer):
    body_type_name = serializers.CharField(source='body_type_id.body_type_name', read_only=True)
    body_num_doors = serializers.CharField(source='body_num_doors_id.body_num_doors', read_only=True)
    
    class Meta:
        model = BodyStyleConfig
        fields = '__all__'


class EngineConfigSerializer(serializers.ModelSerializer):
    fuel_type_name = serializers.CharField(source='fuel_type_id.fuel_type_name', read_only=True)
    
    class Meta:
        model = EngineConfig
        fields = '__all__'


class VehicleSerializer(serializers.ModelSerializer):
    make_name = serializers.CharField(source='base_vehicle_id.make_id.make_name', read_only=True)
    model_name = serializers.CharField(source='base_vehicle_id.model_id.model_name', read_only=True)
    year = serializers.IntegerField(source='base_vehicle_id.year_id', read_only=True)
    sub_model_name = serializers.CharField(source='sub_model_id.sub_model_name', read_only=True)
    
    class Meta:
        model = Vehicle
        fields = '__all__'


class VehicleToDriveTypeSerializer(serializers.ModelSerializer):
    vehicle_info = serializers.SerializerMethodField()
    drive_type_name = serializers.CharField(source='drive_type_id.drive_type_name', read_only=True)
    
    class Meta:
        model = VehicleToDriveType
        fields = '__all__'
    
    def get_vehicle_info(self, obj):
        return {
            'make': obj.vehicle_id.base_vehicle_id.make_id.make_name,
            'model': obj.vehicle_id.base_vehicle_id.model_id.model_name,
            'year': obj.vehicle_id.base_vehicle_id.year_id,
            'sub_model': obj.vehicle_id.sub_model_id.sub_model_name,
        }


class VehicleToBodyStyleConfigSerializer(serializers.ModelSerializer):
    vehicle_info = serializers.SerializerMethodField()
    body_style_info = serializers.SerializerMethodField()
    
    class Meta:
        model = VehicleToBodyStyleConfig
        fields = '__all__'
    
    def get_vehicle_info(self, obj):
        return {
            'make': obj.vehicle_id.base_vehicle_id.make_id.make_name,
            'model': obj.vehicle_id.base_vehicle_id.model_id.model_name,
            'year': obj.vehicle_id.base_vehicle_id.year_id,
            'sub_model': obj.vehicle_id.sub_model_id.sub_model_name,
        }
    
    def get_body_style_info(self, obj):
        return {
            'body_type': obj.body_style_config_id.body_type_id.body_type_name,
            'num_doors': obj.body_style_config_id.body_num_doors_id.body_num_doors,
        }


class VehicleToEngineConfigSerializer(serializers.ModelSerializer):
    vehicle_info = serializers.SerializerMethodField()
    engine_info = serializers.SerializerMethodField()
    
    class Meta:
        model = VehicleToEngineConfig
        fields = '__all__'
    
    def get_vehicle_info(self, obj):
        return {
            'make': obj.vehicle_id.base_vehicle_id.make_id.make_name,
            'model': obj.vehicle_id.base_vehicle_id.model_id.model_name,
            'year': obj.vehicle_id.base_vehicle_id.year_id,
            'sub_model': obj.vehicle_id.sub_model_id.sub_model_name,
        }
    
    def get_engine_info(self, obj):
        return {
            'fuel_type': obj.engine_config_id.fuel_type_id.fuel_type_name,
        }


class VCDBSyncLogSerializer(serializers.ModelSerializer):
    duration_formatted = serializers.SerializerMethodField()
    
    class Meta:
        model = VCDBSyncLog
        fields = '__all__'
    
    def get_duration_formatted(self, obj):
        if obj.duration_seconds:
            minutes = obj.duration_seconds // 60
            seconds = obj.duration_seconds % 60
            return f"{minutes}m {seconds}s"
        return None


# Search and filter serializers for frontend
class VehicleSearchSerializer(serializers.Serializer):
    """Serializer for vehicle search functionality"""
    make = serializers.CharField(required=False)
    model = serializers.CharField(required=False)
    year = serializers.IntegerField(required=False)
    sub_model = serializers.CharField(required=False)
    drive_type = serializers.CharField(required=False)
    fuel_type = serializers.CharField(required=False)
    body_type = serializers.CharField(required=False)
    num_doors = serializers.IntegerField(required=False)
    
    def validate_year(self, value):
        if value and (value < 1900 or value > 2030):
            raise serializers.ValidationError("Year must be between 1900 and 2030")
        return value


class VehicleSearchResultSerializer(serializers.Serializer):
    """Serializer for vehicle search results"""
    vehicle_id = serializers.IntegerField()
    make = serializers.CharField()
    model = serializers.CharField()
    year = serializers.IntegerField()
    sub_model = serializers.CharField()
    drive_types = serializers.ListField(child=serializers.CharField())
    fuel_types = serializers.ListField(child=serializers.CharField())
    body_types = serializers.ListField(child=serializers.CharField())
    num_doors = serializers.ListField(child=serializers.CharField())
