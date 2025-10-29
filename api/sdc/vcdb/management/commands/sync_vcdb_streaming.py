from django.core.management.base import BaseCommand, CommandError
from django.db import transaction, connection
from django.db.utils import OperationalError
from django.utils import timezone
from datetime import datetime
import logging

from vcdb.models import (
    Make, Model, SubModel, Region, PublicationStage, Year, BaseVehicle, DriveType, FuelType,
    BodyNumDoors, BodyType, BodyStyleConfig, EngineConfig, Vehicle,
    VehicleToDriveType, VehicleToBodyStyleConfig, VehicleToEngineConfig,
    VCDBSyncLog,
    # Additional VCDB models
    Abbreviation, Aspiration, BedConfig, BedLength, BedType, BrakeABS, BrakeConfig,
    BrakeSystem, BrakeType, Class, CylinderHeadType, ElecControlled, EngineBase,
    EngineBlock, EngineBoreStroke, EngineBase2, EngineDesignation, EngineVIN, EngineVersion,
    FuelDeliveryType, FuelDeliverySubType, FuelSystemControlType, FuelSystemDesign,
    IgnitionSystemType, Mfr, MfrBodyCode, PowerOutput, SpringType, SpringTypeConfig,
    SteeringType, SteeringSystem, SteeringConfig, TransmissionType, TransmissionNumSpeeds,
    TransmissionControlType, TransmissionBase, TransmissionMfrCode, Transmission, Valves,
    VehicleTypeGroup, VehicleType, WheelBase,
    VehicleToBedConfig, VehicleToBodyConfig, VehicleToBrakeConfig, VehicleToClass,
    VehicleToMfrBodyCode, VehicleToSpringTypeConfig, VehicleToSteeringConfig,
    VehicleToTransmission, VehicleToWheelbase
)
from vcdb.autocare_api import AutoCareAPIClient, convert_autocare_data_to_django

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Stream VCDB data from AutoCare API (process page by page)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Run without making database changes',
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=100,
            help='Number of records to process in each batch (default: 100)',
        )
        parser.add_argument(
            '--tables',
            nargs='+',
            help='Specific tables to sync (e.g., --tables makes models vehicles)',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        batch_size = options['batch_size']
        specific_tables = options.get('tables', [])
        
        self.stdout.write(
            self.style.SUCCESS('Starting streaming VCDB data synchronization...')
        )
        
        # Create sync log
        try:
            sync_log = VCDBSyncLog.objects.create()
        except Exception:
            sync_log = None
        start_time = timezone.now()
        
        try:
            # Initialize API client
            api_client = AutoCareAPIClient()
            
            # Define table configurations
            table_configs = [
                # Original VCDB tables
                ('makes', 'Make', Make, self.process_makes_page),
                ('models', 'Model', Model, self.process_models_page),
                ('submodels', 'SubModel', SubModel, self.process_submodels_page),
                ('regions', 'Region', Region, self.process_regions_page),
                ('publication_stages', 'PublicationStage', PublicationStage, self.process_publication_stages_page),
                ('years', 'Year', Year, self.process_years_page),
                ('drive_types', 'DriveType', DriveType, self.process_drive_types_page),
                ('fuel_types', 'FuelType', FuelType, self.process_fuel_types_page),
                ('body_num_doors', 'BodyNumDoors', BodyNumDoors, self.process_body_num_doors_page),
                ('body_types', 'BodyType', BodyType, self.process_body_types_page),
                ('base_vehicles', 'BaseVehicle', BaseVehicle, self.process_base_vehicles_page),
                ('body_style_configs', 'BodyStyleConfig', BodyStyleConfig, self.process_body_style_configs_page),
                ('engine_configs', 'EngineConfig', EngineConfig, self.process_engine_configs_page),
                ('vehicles', 'Vehicle', Vehicle, self.process_vehicles_page),
                ('vehicle_to_drive_types', 'VehicleToDriveType', VehicleToDriveType, self.process_vehicle_to_drive_types_page),
                ('vehicle_to_body_style_configs', 'VehicleToBodyStyleConfig', VehicleToBodyStyleConfig, self.process_vehicle_to_body_style_configs_page),
                ('vehicle_to_engine_configs', 'VehicleToEngineConfig', VehicleToEngineConfig, self.process_vehicle_to_engine_configs_page),
                
                # Additional VCDB tables
                ('abbreviations', 'Abbreviation', Abbreviation, self.process_abbreviations_page),
                ('aspirations', 'Aspiration', Aspiration, self.process_aspirations_page),
                ('bed_configs', 'BedConfig', BedConfig, self.process_bed_configs_page),
                ('bed_lengths', 'BedLength', BedLength, self.process_bed_lengths_page),
                ('bed_types', 'BedType', BedType, self.process_bed_types_page),
                ('brake_abs', 'BrakeABS', BrakeABS, self.process_brake_abs_page),
                ('brake_configs', 'BrakeConfig', BrakeConfig, self.process_brake_configs_page),
                ('brake_systems', 'BrakeSystem', BrakeSystem, self.process_brake_systems_page),
                ('brake_types', 'BrakeType', BrakeType, self.process_brake_types_page),
                ('classes', 'Class', Class, self.process_classes_page),
                ('cylinder_head_types', 'CylinderHeadType', CylinderHeadType, self.process_cylinder_head_types_page),
                ('elec_controlled', 'ElecControlled', ElecControlled, self.process_elec_controlled_page),
                ('engine_bases', 'EngineBase', EngineBase, self.process_engine_bases_page),
                ('engine_blocks', 'EngineBlock', EngineBlock, self.process_engine_blocks_page),
                ('engine_bore_strokes', 'EngineBoreStroke', EngineBoreStroke, self.process_engine_bore_strokes_page),
                ('engine_base2', 'EngineBase2', EngineBase2, self.process_engine_base2_page),
                ('engine_designations', 'EngineDesignation', EngineDesignation, self.process_engine_designations_page),
                ('engine_vins', 'EngineVIN', EngineVIN, self.process_engine_vins_page),
                ('engine_versions', 'EngineVersion', EngineVersion, self.process_engine_versions_page),
                ('fuel_delivery_types', 'FuelDeliveryType', FuelDeliveryType, self.process_fuel_delivery_types_page),
                ('fuel_delivery_sub_types', 'FuelDeliverySubType', FuelDeliverySubType, self.process_fuel_delivery_sub_types_page),
                ('fuel_system_control_types', 'FuelSystemControlType', FuelSystemControlType, self.process_fuel_system_control_types_page),
                ('fuel_system_designs', 'FuelSystemDesign', FuelSystemDesign, self.process_fuel_system_designs_page),
                ('ignition_system_types', 'IgnitionSystemType', IgnitionSystemType, self.process_ignition_system_types_page),
                ('mfrs', 'Mfr', Mfr, self.process_mfrs_page),
                ('mfr_body_codes', 'MfrBodyCode', MfrBodyCode, self.process_mfr_body_codes_page),
                ('power_outputs', 'PowerOutput', PowerOutput, self.process_power_outputs_page),
                ('spring_types', 'SpringType', SpringType, self.process_spring_types_page),
                ('spring_type_configs', 'SpringTypeConfig', SpringTypeConfig, self.process_spring_type_configs_page),
                ('steering_types', 'SteeringType', SteeringType, self.process_steering_types_page),
                ('steering_systems', 'SteeringSystem', SteeringSystem, self.process_steering_systems_page),
                ('steering_configs', 'SteeringConfig', SteeringConfig, self.process_steering_configs_page),
                ('transmission_types', 'TransmissionType', TransmissionType, self.process_transmission_types_page),
                ('transmission_num_speeds', 'TransmissionNumSpeeds', TransmissionNumSpeeds, self.process_transmission_num_speeds_page),
                ('transmission_control_types', 'TransmissionControlType', TransmissionControlType, self.process_transmission_control_types_page),
                ('transmission_bases', 'TransmissionBase', TransmissionBase, self.process_transmission_bases_page),
                ('transmission_mfr_codes', 'TransmissionMfrCode', TransmissionMfrCode, self.process_transmission_mfr_codes_page),
                ('transmissions', 'Transmission', Transmission, self.process_transmissions_page),
                ('valves', 'Valves', Valves, self.process_valves_page),
                ('vehicle_type_groups', 'VehicleTypeGroup', VehicleTypeGroup, self.process_vehicle_type_groups_page),
                ('vehicle_types', 'VehicleType', VehicleType, self.process_vehicle_types_page),
                ('wheelbases', 'WheelBase', WheelBase, self.process_wheelbases_page),
                ('vehicle_to_bed_configs', 'VehicleToBedConfig', VehicleToBedConfig, self.process_vehicle_to_bed_configs_page),
                ('vehicle_to_body_configs', 'VehicleToBodyConfig', VehicleToBodyConfig, self.process_vehicle_to_body_configs_page),
                ('vehicle_to_brake_configs', 'VehicleToBrakeConfig', VehicleToBrakeConfig, self.process_vehicle_to_brake_configs_page),
                ('vehicle_to_classes', 'VehicleToClass', VehicleToClass, self.process_vehicle_to_classes_page),
                ('vehicle_to_mfr_body_codes', 'VehicleToMfrBodyCode', VehicleToMfrBodyCode, self.process_vehicle_to_mfr_body_codes_page),
                ('vehicle_to_spring_type_configs', 'VehicleToSpringTypeConfig', VehicleToSpringTypeConfig, self.process_vehicle_to_spring_type_configs_page),
                ('vehicle_to_steering_configs', 'VehicleToSteeringConfig', VehicleToSteeringConfig, self.process_vehicle_to_steering_configs_page),
                ('vehicle_to_transmissions', 'VehicleToTransmission', VehicleToTransmission, self.process_vehicle_to_transmissions_page),
                ('vehicle_to_wheelbases', 'VehicleToWheelbase', VehicleToWheelbase, self.process_vehicle_to_wheelbases_page),
            ]
            
            # Filter tables if specific tables requested
            if specific_tables:
                table_configs = [config for config in table_configs if config[0] in specific_tables]
            
            # Process each table
            total_processed = 0
            total_created = 0
            total_updated = 0
            total_skipped = 0
            errors = []
            
            for table_name, endpoint, model_class, processor in table_configs:
                self.stdout.write(f'Processing {table_name}...')
                try:
                    # Create callback function for this table
                    def callback(data, page_number):
                        return processor(data, model_class, table_name, dry_run, batch_size)
                    
                    # Process table with streaming
                    success = api_client._make_request_paginated(
                        endpoint, 
                        callback=callback
                    )
                    
                    if not success:
                        error_msg = f'Failed to process {table_name}'
                        self.stdout.write(self.style.ERROR(error_msg))
                        errors.append(error_msg)
                    else:
                        self.stdout.write(
                            self.style.SUCCESS(f'  {table_name}: Completed successfully')
                        )
                        
                except Exception as e:
                    error_msg = f'Error processing {table_name}: {str(e)}'
                    self.stdout.write(self.style.ERROR(error_msg))
                    errors.append(error_msg)
                    logger.error(error_msg, exc_info=True)
            
            # Update sync log
            duration = (timezone.now() - start_time).total_seconds()
            if sync_log:
                sync_log.total_records_processed = total_processed
                sync_log.records_created = total_created
                sync_log.records_updated = total_updated
                sync_log.records_skipped = total_skipped
                sync_log.errors_count = len(errors)
                sync_log.error_details = {'errors': errors}
                
                if errors:
                    sync_log.mark_failed(f'Completed with {len(errors)} errors', {'errors': errors})
                else:
                    sync_log.mark_completed(duration)
            
            if errors:
                self.stdout.write(
                    self.style.WARNING(
                        f'Sync completed with {len(errors)} errors. Duration: {duration:.2f}s'
                    )
                )
            else:
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Sync completed successfully! Duration: {duration:.2f}s'
                    )
                )
                
        except Exception as e:
            duration = (timezone.now() - start_time).total_seconds()
            if sync_log:
                sync_log.mark_failed(str(e))
            self.stdout.write(self.style.ERROR(f'Sync failed: {str(e)}'))
            logger.error(f'VCDB sync failed: {str(e)}', exc_info=True)
            raise CommandError(f'Sync failed: {str(e)}')

    def process_makes_page(self, data, model_class, table_name, dry_run=False, batch_size=100):
        return self._process_table_page(data, model_class, table_name, dry_run, batch_size)
    
    def process_models_page(self, data, model_class, table_name, dry_run=False, batch_size=100):
        return self._process_table_page(data, model_class, table_name, dry_run, batch_size)
    
    def process_submodels_page(self, data, model_class, table_name, dry_run=False, batch_size=100):
        return self._process_table_page(data, model_class, table_name, dry_run, batch_size)
    
    def process_regions_page(self, data, model_class, table_name, dry_run=False, batch_size=100):
        return self._process_table_page(data, model_class, table_name, dry_run, batch_size)
    
    def process_publication_stages_page(self, data, model_class, table_name, dry_run=False, batch_size=100):
        return self._process_table_page(data, model_class, table_name, dry_run, batch_size)
    
    def process_years_page(self, data, model_class, table_name, dry_run=False, batch_size=100):
        return self._process_table_page(data, model_class, table_name, dry_run, batch_size)
    
    def process_drive_types_page(self, data, model_class, table_name, dry_run=False, batch_size=100):
        return self._process_table_page(data, model_class, table_name, dry_run, batch_size)
    
    def process_fuel_types_page(self, data, model_class, table_name, dry_run=False, batch_size=100):
        return self._process_table_page(data, model_class, table_name, dry_run, batch_size)
    
    def process_body_num_doors_page(self, data, model_class, table_name, dry_run=False, batch_size=100):
        return self._process_table_page(data, model_class, table_name, dry_run, batch_size)
    
    def process_body_types_page(self, data, model_class, table_name, dry_run=False, batch_size=100):
        return self._process_table_page(data, model_class, table_name, dry_run, batch_size)
    
    def process_base_vehicles_page(self, data, model_class, table_name, dry_run=False, batch_size=100):
        return self._process_table_with_relations_page(
            data, model_class, table_name, dry_run, batch_size,
            {'make_id': Make, 'model_id': Model, 'year_id': Year}
        )
    
    def process_body_style_configs_page(self, data, model_class, table_name, dry_run=False, batch_size=100):
        return self._process_table_with_relations_page(
            data, model_class, table_name, dry_run, batch_size,
            {'body_num_doors_id': BodyNumDoors, 'body_type_id': BodyType}
        )
    
    def process_engine_configs_page(self, data, model_class, table_name, dry_run=False, batch_size=100):
        return self._process_table_with_relations_page(
            data, model_class, table_name, dry_run, batch_size,
            {'fuel_type_id': FuelType}
        )
    
    def process_vehicles_page(self, data, model_class, table_name, dry_run=False, batch_size=100):
        return self._process_table_with_relations_page(
            data, model_class, table_name, dry_run, batch_size,
            {
                'base_vehicle_id': BaseVehicle, 
                'sub_model_id': SubModel,
                'region_id': Region,
                'publication_stage_id': PublicationStage
            }
        )
    
    def process_vehicle_to_drive_types_page(self, data, model_class, table_name, dry_run=False, batch_size=100):
        return self._process_table_with_relations_page(
            data, model_class, table_name, dry_run, batch_size,
            {'vehicle_id': Vehicle, 'drive_type_id': DriveType}
        )
    
    def process_vehicle_to_body_style_configs_page(self, data, model_class, table_name, dry_run=False, batch_size=100):
        return self._process_table_with_relations_page(
            data, model_class, table_name, dry_run, batch_size,
            {'vehicle_id': Vehicle, 'body_style_config_id': BodyStyleConfig}
        )
    
    def process_vehicle_to_engine_configs_page(self, data, model_class, table_name, dry_run=False, batch_size=100):
        return self._process_table_with_relations_page(
            data, model_class, table_name, dry_run, batch_size,
            {'vehicle_id': Vehicle, 'engine_config_id': EngineConfig}
        )
    
    # Additional processors for all other tables
    def process_abbreviations_page(self, data, model_class, table_name, dry_run=False, batch_size=100):
        return self._process_table_page(data, model_class, table_name, dry_run, batch_size)
    
    def process_aspirations_page(self, data, model_class, table_name, dry_run=False, batch_size=100):
        return self._process_table_page(data, model_class, table_name, dry_run, batch_size)
    
    def process_bed_configs_page(self, data, model_class, table_name, dry_run=False, batch_size=100):
        return self._process_table_page(data, model_class, table_name, dry_run, batch_size)
    
    def process_bed_lengths_page(self, data, model_class, table_name, dry_run=False, batch_size=100):
        return self._process_table_page(data, model_class, table_name, dry_run, batch_size)
    
    def process_bed_types_page(self, data, model_class, table_name, dry_run=False, batch_size=100):
        return self._process_table_page(data, model_class, table_name, dry_run, batch_size)
    
    def process_brake_abs_page(self, data, model_class, table_name, dry_run=False, batch_size=100):
        return self._process_table_page(data, model_class, table_name, dry_run, batch_size)
    
    def process_brake_configs_page(self, data, model_class, table_name, dry_run=False, batch_size=100):
        return self._process_table_page(data, model_class, table_name, dry_run, batch_size)
    
    def process_brake_systems_page(self, data, model_class, table_name, dry_run=False, batch_size=100):
        return self._process_table_page(data, model_class, table_name, dry_run, batch_size)
    
    def process_brake_types_page(self, data, model_class, table_name, dry_run=False, batch_size=100):
        return self._process_table_page(data, model_class, table_name, dry_run, batch_size)
    
    def process_classes_page(self, data, model_class, table_name, dry_run=False, batch_size=100):
        return self._process_table_page(data, model_class, table_name, dry_run, batch_size)
    
    def process_cylinder_head_types_page(self, data, model_class, table_name, dry_run=False, batch_size=100):
        return self._process_table_page(data, model_class, table_name, dry_run, batch_size)
    
    def process_elec_controlled_page(self, data, model_class, table_name, dry_run=False, batch_size=100):
        return self._process_table_page(data, model_class, table_name, dry_run, batch_size)
    
    def process_engine_bases_page(self, data, model_class, table_name, dry_run=False, batch_size=100):
        return self._process_table_page(data, model_class, table_name, dry_run, batch_size)
    
    def process_engine_blocks_page(self, data, model_class, table_name, dry_run=False, batch_size=100):
        return self._process_table_page(data, model_class, table_name, dry_run, batch_size)
    
    def process_engine_bore_strokes_page(self, data, model_class, table_name, dry_run=False, batch_size=100):
        return self._process_table_page(data, model_class, table_name, dry_run, batch_size)
    
    def process_engine_base2_page(self, data, model_class, table_name, dry_run=False, batch_size=100):
        return self._process_table_page(data, model_class, table_name, dry_run, batch_size)
    
    def process_engine_designations_page(self, data, model_class, table_name, dry_run=False, batch_size=100):
        return self._process_table_page(data, model_class, table_name, dry_run, batch_size)
    
    def process_engine_vins_page(self, data, model_class, table_name, dry_run=False, batch_size=100):
        return self._process_table_page(data, model_class, table_name, dry_run, batch_size)
    
    def process_engine_versions_page(self, data, model_class, table_name, dry_run=False, batch_size=100):
        return self._process_table_page(data, model_class, table_name, dry_run, batch_size)
    
    def process_fuel_delivery_types_page(self, data, model_class, table_name, dry_run=False, batch_size=100):
        return self._process_table_page(data, model_class, table_name, dry_run, batch_size)
    
    def process_fuel_delivery_sub_types_page(self, data, model_class, table_name, dry_run=False, batch_size=100):
        return self._process_table_page(data, model_class, table_name, dry_run, batch_size)
    
    def process_fuel_system_control_types_page(self, data, model_class, table_name, dry_run=False, batch_size=100):
        return self._process_table_page(data, model_class, table_name, dry_run, batch_size)
    
    def process_fuel_system_designs_page(self, data, model_class, table_name, dry_run=False, batch_size=100):
        return self._process_table_page(data, model_class, table_name, dry_run, batch_size)
    
    def process_ignition_system_types_page(self, data, model_class, table_name, dry_run=False, batch_size=100):
        return self._process_table_page(data, model_class, table_name, dry_run, batch_size)
    
    def process_mfrs_page(self, data, model_class, table_name, dry_run=False, batch_size=100):
        return self._process_table_page(data, model_class, table_name, dry_run, batch_size)
    
    def process_mfr_body_codes_page(self, data, model_class, table_name, dry_run=False, batch_size=100):
        return self._process_table_page(data, model_class, table_name, dry_run, batch_size)
    
    def process_power_outputs_page(self, data, model_class, table_name, dry_run=False, batch_size=100):
        return self._process_table_page(data, model_class, table_name, dry_run, batch_size)
    
    def process_spring_types_page(self, data, model_class, table_name, dry_run=False, batch_size=100):
        return self._process_table_page(data, model_class, table_name, dry_run, batch_size)
    
    def process_spring_type_configs_page(self, data, model_class, table_name, dry_run=False, batch_size=100):
        return self._process_table_page(data, model_class, table_name, dry_run, batch_size)
    
    def process_steering_types_page(self, data, model_class, table_name, dry_run=False, batch_size=100):
        return self._process_table_page(data, model_class, table_name, dry_run, batch_size)
    
    def process_steering_systems_page(self, data, model_class, table_name, dry_run=False, batch_size=100):
        return self._process_table_page(data, model_class, table_name, dry_run, batch_size)
    
    def process_steering_configs_page(self, data, model_class, table_name, dry_run=False, batch_size=100):
        return self._process_table_page(data, model_class, table_name, dry_run, batch_size)
    
    def process_transmission_types_page(self, data, model_class, table_name, dry_run=False, batch_size=100):
        return self._process_table_page(data, model_class, table_name, dry_run, batch_size)
    
    def process_transmission_num_speeds_page(self, data, model_class, table_name, dry_run=False, batch_size=100):
        return self._process_table_page(data, model_class, table_name, dry_run, batch_size)
    
    def process_transmission_control_types_page(self, data, model_class, table_name, dry_run=False, batch_size=100):
        return self._process_table_page(data, model_class, table_name, dry_run, batch_size)
    
    def process_transmission_bases_page(self, data, model_class, table_name, dry_run=False, batch_size=100):
        return self._process_table_page(data, model_class, table_name, dry_run, batch_size)
    
    def process_transmission_mfr_codes_page(self, data, model_class, table_name, dry_run=False, batch_size=100):
        return self._process_table_page(data, model_class, table_name, dry_run, batch_size)
    
    def process_transmissions_page(self, data, model_class, table_name, dry_run=False, batch_size=100):
        return self._process_table_page(data, model_class, table_name, dry_run, batch_size)
    
    def process_valves_page(self, data, model_class, table_name, dry_run=False, batch_size=100):
        return self._process_table_page(data, model_class, table_name, dry_run, batch_size)
    
    def process_vehicle_type_groups_page(self, data, model_class, table_name, dry_run=False, batch_size=100):
        return self._process_table_page(data, model_class, table_name, dry_run, batch_size)
    
    def process_vehicle_types_page(self, data, model_class, table_name, dry_run=False, batch_size=100):
        return self._process_table_page(data, model_class, table_name, dry_run, batch_size)
    
    def process_wheelbases_page(self, data, model_class, table_name, dry_run=False, batch_size=100):
        return self._process_table_page(data, model_class, table_name, dry_run, batch_size)
    
    def process_vehicle_to_bed_configs_page(self, data, model_class, table_name, dry_run=False, batch_size=100):
        return self._process_table_with_relations_page(
            data, model_class, table_name, dry_run, batch_size,
            {'vehicle_id': Vehicle}
        )
    
    def process_vehicle_to_body_configs_page(self, data, model_class, table_name, dry_run=False, batch_size=100):
        return self._process_table_with_relations_page(
            data, model_class, table_name, dry_run, batch_size,
            {'vehicle_id': Vehicle}
        )
    
    def process_vehicle_to_brake_configs_page(self, data, model_class, table_name, dry_run=False, batch_size=100):
        return self._process_table_with_relations_page(
            data, model_class, table_name, dry_run, batch_size,
            {'vehicle_id': Vehicle}
        )
    
    def process_vehicle_to_classes_page(self, data, model_class, table_name, dry_run=False, batch_size=100):
        return self._process_table_with_relations_page(
            data, model_class, table_name, dry_run, batch_size,
            {'vehicle_id': Vehicle}
        )
    
    def process_vehicle_to_mfr_body_codes_page(self, data, model_class, table_name, dry_run=False, batch_size=100):
        return self._process_table_with_relations_page(
            data, model_class, table_name, dry_run, batch_size,
            {'vehicle_id': Vehicle}
        )
    
    def process_vehicle_to_spring_type_configs_page(self, data, model_class, table_name, dry_run=False, batch_size=100):
        return self._process_table_with_relations_page(
            data, model_class, table_name, dry_run, batch_size,
            {'vehicle_id': Vehicle}
        )
    
    def process_vehicle_to_steering_configs_page(self, data, model_class, table_name, dry_run=False, batch_size=100):
        return self._process_table_with_relations_page(
            data, model_class, table_name, dry_run, batch_size,
            {'vehicle_id': Vehicle}
        )
    
    def process_vehicle_to_transmissions_page(self, data, model_class, table_name, dry_run=False, batch_size=100):
        return self._process_table_with_relations_page(
            data, model_class, table_name, dry_run, batch_size,
            {'vehicle_id': Vehicle}
        )
    
    def process_vehicle_to_wheelbases_page(self, data, model_class, table_name, dry_run=False, batch_size=100):
        return self._process_table_with_relations_page(
            data, model_class, table_name, dry_run, batch_size,
            {'vehicle_id': Vehicle}
        )

    def _process_table_page(self, data, model_class, table_name, dry_run=False, batch_size=100):
        """Process a page of data for a simple table without foreign key relations"""
        processed = 0
        created = 0
        updated = 0
        skipped = 0
        
        self.stdout.write(f'  Processing {len(data)} {table_name} records...')
        
        if dry_run:
            self.stdout.write(f'  [DRY RUN] Would process {len(data)} {table_name} records')
            return len(data)
        
        # Ensure DB connection usable at page start
        try:
            connection.close_if_unusable_or_obsolete()
        except Exception:
            pass

        # Process each record individually (no batching to avoid transaction issues)
        for record in data:
            try:
                # Guard connection per record
                try:
                    connection.close_if_unusable_or_obsolete()
                except Exception:
                    pass
                # Convert AutoCare data to Django format
                django_data = convert_autocare_data_to_django(record, model_class.__name__)
                
                # Get primary key field name
                pk_field = model_class._meta.pk.name
                pk_value = django_data.get(pk_field)
                
                if not pk_value:
                    skipped += 1
                    continue
                
                def upsert_once():
                    obj = model_class.objects.filter(**{pk_field: pk_value}).first()
                    if obj:
                        for field, value in django_data.items():
                            if field != pk_field:
                                setattr(obj, field, value)
                        obj.save()
                        return 'updated'
                    else:
                        model_class.objects.create(**django_data)
                        return 'created'

                try:
                    result = upsert_once()
                except OperationalError:
                    # Reconnect and retry once
                    try:
                        connection.close()
                    except Exception:
                        pass
                    connection.ensure_connection()
                    result = upsert_once()

                if result == 'updated':
                    updated += 1
                else:
                    created += 1
                
                processed += 1
                
            except Exception as e:
                logger.error(f'Error processing {table_name} record {record}: {str(e)}')
                skipped += 1
        
        self.stdout.write(f'  Summary: {processed} processed, {created} created, {updated} updated, {skipped} skipped')
        return processed

    def _process_table_with_relations_page(self, data, model_class, table_name, dry_run=False, batch_size=100, relations=None):
        """Process a page of data for a table with foreign key relations"""
        processed = 0
        created = 0
        updated = 0
        skipped = 0
        
        if dry_run:
            self.stdout.write(f'  [DRY RUN] Would process {len(data)} {table_name} records')
            return len(data)
        
        # Ensure DB connection usable at page start
        try:
            connection.close_if_unusable_or_obsolete()
        except Exception:
            pass

        # Process each record individually (no batching to avoid transaction issues)
        for record in data:
            try:
                # Guard connection per record
                try:
                    connection.close_if_unusable_or_obsolete()
                except Exception:
                    pass
                # Convert AutoCare data to Django format
                django_data = convert_autocare_data_to_django(record, model_class.__name__)
                
                # Get primary key field name
                pk_field = model_class._meta.pk.name
                pk_value = django_data.get(pk_field)
                
                if not pk_value:
                    skipped += 1
                    continue
                
                # Resolve foreign key relations
                if relations:
                    for fk_field, related_model in relations.items():
                        fk_value = django_data.get(fk_field)
                        if fk_value:
                            # Check if related object exists
                            related_obj = related_model.objects.filter(
                                **{related_model._meta.pk.name: fk_value}
                            ).first()
                            if related_obj:
                                django_data[fk_field] = related_obj
                            else:
                                # Skip if related object doesn't exist
                                skipped += 1
                                continue
                        else:
                            django_data[fk_field] = None
                
                def upsert_once():
                    obj = model_class.objects.filter(**{pk_field: pk_value}).first()
                    if obj:
                        for field, value in django_data.items():
                            if field != pk_field:
                                setattr(obj, field, value)
                        obj.save()
                        return 'updated'
                    else:
                        model_class.objects.create(**django_data)
                        return 'created'

                try:
                    result = upsert_once()
                except OperationalError:
                    try:
                        connection.close()
                    except Exception:
                        pass
                    connection.ensure_connection()
                    result = upsert_once()

                if result == 'updated':
                    updated += 1
                else:
                    created += 1
                
                processed += 1
                
            except Exception as e:
                logger.error(f'Error processing {table_name} record {record}: {str(e)}')
                skipped += 1
        
        self.stdout.write(f'  Summary: {processed} processed, {created} created, {updated} updated, {skipped} skipped')
        return processed
