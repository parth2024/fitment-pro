from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
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
    help = 'Sync VCDB data from AutoCare API'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Run without making database changes',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force sync even if recent sync exists',
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=100,
            help='Number of records to process in each batch (default: 100)',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        force = options['force']
        batch_size = options['batch_size']
        
        self.stdout.write(
            self.style.SUCCESS('Starting VCDB data synchronization...')
        )
        
        # Create sync log (skip if table doesn't exist)
        try:
            sync_log = VCDBSyncLog.objects.create()
        except Exception:
            sync_log = None
        start_time = timezone.now()
        
        try:
            # Initialize API client
            api_client = AutoCareAPIClient()
            
            # Fetch all data from AutoCare API
            self.stdout.write('Fetching data from AutoCare API...')
            vcdb_data = api_client.get_all_data()
            
            if not vcdb_data:
                raise CommandError('Failed to fetch data from AutoCare API')
            
            # Process each table
            total_processed = 0
            total_created = 0
            total_updated = 0
            total_skipped = 0
            errors = []
            
            # Process in dependency order
            table_processors = [
                # Original VCDB tables
                ('makes', self.process_makes),
                ('models', self.process_models),
                ('submodels', self.process_submodels),
                ('regions', self.process_regions),
                ('publication_stages', self.process_publication_stages),
                ('years', self.process_years),
                ('drive_types', self.process_drive_types),
                ('fuel_types', self.process_fuel_types),
                ('body_num_doors', self.process_body_num_doors),
                ('body_types', self.process_body_types),
                ('base_vehicles', self.process_base_vehicles),
                ('body_style_configs', self.process_body_style_configs),
                ('engine_configs', self.process_engine_configs),
                ('vehicles', self.process_vehicles),
                ('vehicle_to_drive_types', self.process_vehicle_to_drive_types),
                ('vehicle_to_body_style_configs', self.process_vehicle_to_body_style_configs),
                ('vehicle_to_engine_configs', self.process_vehicle_to_engine_configs),
                
                # Additional VCDB tables
                ('abbreviations', self.process_abbreviations),
                ('aspirations', self.process_aspirations),
                ('bed_configs', self.process_bed_configs),
                ('bed_lengths', self.process_bed_lengths),
                ('bed_types', self.process_bed_types),
                ('brake_abs', self.process_brake_abs),
                ('brake_configs', self.process_brake_configs),
                ('brake_systems', self.process_brake_systems),
                ('brake_types', self.process_brake_types),
                ('classes', self.process_classes),
                ('cylinder_head_types', self.process_cylinder_head_types),
                ('elec_controlled', self.process_elec_controlled),
                ('engine_bases', self.process_engine_bases),
                ('engine_blocks', self.process_engine_blocks),
                ('engine_bore_strokes', self.process_engine_bore_strokes),
                ('engine_base2', self.process_engine_base2),
                ('engine_designations', self.process_engine_designations),
                ('engine_vins', self.process_engine_vins),
                ('engine_versions', self.process_engine_versions),
                ('fuel_delivery_types', self.process_fuel_delivery_types),
                ('fuel_delivery_sub_types', self.process_fuel_delivery_sub_types),
                ('fuel_system_control_types', self.process_fuel_system_control_types),
                ('fuel_system_designs', self.process_fuel_system_designs),
                ('ignition_system_types', self.process_ignition_system_types),
                ('mfrs', self.process_mfrs),
                ('mfr_body_codes', self.process_mfr_body_codes),
                ('power_outputs', self.process_power_outputs),
                ('spring_types', self.process_spring_types),
                ('spring_type_configs', self.process_spring_type_configs),
                ('steering_types', self.process_steering_types),
                ('steering_systems', self.process_steering_systems),
                ('steering_configs', self.process_steering_configs),
                ('transmission_types', self.process_transmission_types),
                ('transmission_num_speeds', self.process_transmission_num_speeds),
                ('transmission_control_types', self.process_transmission_control_types),
                ('transmission_bases', self.process_transmission_bases),
                ('transmission_mfr_codes', self.process_transmission_mfr_codes),
                ('transmissions', self.process_transmissions),
                ('valves', self.process_valves),
                ('vehicle_type_groups', self.process_vehicle_type_groups),
                ('vehicle_types', self.process_vehicle_types),
                ('wheelbases', self.process_wheelbases),
                ('vehicle_to_bed_configs', self.process_vehicle_to_bed_configs),
                ('vehicle_to_body_configs', self.process_vehicle_to_body_configs),
                ('vehicle_to_brake_configs', self.process_vehicle_to_brake_configs),
                ('vehicle_to_classes', self.process_vehicle_to_classes),
                ('vehicle_to_mfr_body_codes', self.process_vehicle_to_mfr_body_codes),
                ('vehicle_to_spring_type_configs', self.process_vehicle_to_spring_type_configs),
                ('vehicle_to_steering_configs', self.process_vehicle_to_steering_configs),
                ('vehicle_to_transmissions', self.process_vehicle_to_transmissions),
                ('vehicle_to_wheelbases', self.process_vehicle_to_wheelbases),
            ]
            
            for table_name, processor in table_processors:
                if table_name in vcdb_data and vcdb_data[table_name]:
                    self.stdout.write(f'Processing {table_name}...')
                    try:
                        # Pass batch_size to processors that support it
                        try:
                            processed, created, updated, skipped = processor(
                                vcdb_data[table_name], dry_run, batch_size
                            )
                        except TypeError:
                            # Fallback for processors that don't support batch_size
                            processed, created, updated, skipped = processor(
                                vcdb_data[table_name], dry_run
                            )
                        total_processed += processed
                        total_created += created
                        total_updated += updated
                        total_skipped += skipped
                        
                        self.stdout.write(
                            self.style.SUCCESS(
                                f'  {table_name}: {processed} processed, '
                                f'{created} created, {updated} updated, {skipped} skipped'
                            )
                        )
                    except Exception as e:
                        error_msg = f'Error processing {table_name}: {str(e)}'
                        self.stdout.write(self.style.ERROR(error_msg))
                        errors.append(error_msg)
                        logger.error(error_msg, exc_info=True)
                else:
                    self.stdout.write(
                        self.style.WARNING(f'No data available for {table_name}')
                    )
            
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
                        f'Sync completed with {len(errors)} errors. '
                        f'Total: {total_processed} processed, '
                        f'{total_created} created, {total_updated} updated'
                    )
                )
            else:
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Sync completed successfully! '
                        f'Total: {total_processed} processed, '
                        f'{total_created} created, {total_updated} updated, '
                        f'{total_skipped} skipped. Duration: {duration:.2f}s'
                    )
                )
                
        except Exception as e:
            duration = (timezone.now() - start_time).total_seconds()
            if sync_log:
                sync_log.mark_failed(str(e))
            self.stdout.write(self.style.ERROR(f'Sync failed: {str(e)}'))
            logger.error(f'VCDB sync failed: {str(e)}', exc_info=True)
            raise CommandError(f'Sync failed: {str(e)}')

    def process_makes(self, data, dry_run=False, batch_size=100):
        return self._process_table(Make, data, 'Make', dry_run, batch_size)

    def process_models(self, data, dry_run=False, batch_size=100):
        return self._process_table(Model, data, 'Model', dry_run, batch_size)

    def process_submodels(self, data, dry_run=False, batch_size=100):
        return self._process_table(SubModel, data, 'SubModel', dry_run, batch_size)

    def process_regions(self, data, dry_run=False, batch_size=100):
        return self._process_table(Region, data, 'Region', dry_run, batch_size)

    def process_publication_stages(self, data, dry_run=False, batch_size=100):
        return self._process_table(PublicationStage, data, 'PublicationStage', dry_run, batch_size)

    def process_years(self, data, dry_run=False, batch_size=100):
        return self._process_table(Year, data, 'Year', dry_run, batch_size)

    def process_drive_types(self, data, dry_run=False, batch_size=100):
        return self._process_table(DriveType, data, 'DriveType', dry_run, batch_size)

    def process_fuel_types(self, data, dry_run=False, batch_size=100):
        return self._process_table(FuelType, data, 'FuelType', dry_run, batch_size)

    def process_body_num_doors(self, data, dry_run=False, batch_size=100):
        return self._process_table(BodyNumDoors, data, 'BodyNumDoors', dry_run, batch_size)

    def process_body_types(self, data, dry_run=False, batch_size=100):
        return self._process_table(BodyType, data, 'BodyType', dry_run, batch_size)

    def process_base_vehicles(self, data, dry_run=False):
        return self._process_table_with_relations(
            BaseVehicle, data, 'BaseVehicle', dry_run,
            {'make_id': Make, 'model_id': Model, 'year_id': Year}
        )

    def process_body_style_configs(self, data, dry_run=False):
        return self._process_table_with_relations(
            BodyStyleConfig, data, 'BodyStyleConfig', dry_run,
            {'body_num_doors_id': BodyNumDoors, 'body_type_id': BodyType}
        )

    def process_engine_configs(self, data, dry_run=False):
        return self._process_table_with_relations(
            EngineConfig, data, 'EngineConfig', dry_run,
            {'fuel_type_id': FuelType}
        )

    def process_vehicles(self, data, dry_run=False, batch_size=100):
        return self._process_table_with_relations(
            Vehicle, data, 'Vehicle', dry_run,
            {
                'base_vehicle_id': BaseVehicle, 
                'sub_model_id': SubModel,
                'region_id': Region,
                'publication_stage_id': PublicationStage
            }, batch_size
        )

    def process_vehicle_to_drive_types(self, data, dry_run=False):
        return self._process_table_with_relations(
            VehicleToDriveType, data, 'VehicleToDriveType', dry_run,
            {'vehicle_id': Vehicle, 'drive_type_id': DriveType}
        )

    def process_vehicle_to_body_style_configs(self, data, dry_run=False):
        return self._process_table_with_relations(
            VehicleToBodyStyleConfig, data, 'VehicleToBodyStyleConfig', dry_run,
            {'vehicle_id': Vehicle, 'body_style_config_id': BodyStyleConfig}
        )

    def process_vehicle_to_engine_configs(self, data, dry_run=False):
        return self._process_table_with_relations(
            VehicleToEngineConfig, data, 'VehicleToEngineConfig', dry_run,
            {'vehicle_id': Vehicle, 'engine_config_id': EngineConfig}
        )

    def _process_table(self, model_class, data, table_name, dry_run=False, batch_size=100):
        """Process a simple table without foreign key relations"""
        processed = 0
        created = 0
        updated = 0
        skipped = 0
        
        if dry_run:
            self.stdout.write(f'  [DRY RUN] Would process {len(data)} {table_name} records')
            return len(data), 0, 0, 0
        
        # Process in batches to avoid connection timeouts
        for i in range(0, len(data), batch_size):
            batch = data[i:i + batch_size]
            
            try:
                with transaction.atomic():
                    for record in batch:
                        try:
                            # Convert AutoCare data to Django format
                            django_data = convert_autocare_data_to_django(record, table_name)
                            
                            # Get primary key field name
                            pk_field = model_class._meta.pk.name
                            pk_value = django_data.get(pk_field)
                            
                            if not pk_value:
                                skipped += 1
                                continue
                            
                            # Check if record exists
                            existing = model_class.objects.filter(**{pk_field: pk_value}).first()
                            
                            if existing:
                                # Update existing record
                                for field, value in django_data.items():
                                    if field != pk_field:
                                        setattr(existing, field, value)
                                existing.save()
                                updated += 1
                            else:
                                # Create new record
                                model_class.objects.create(**django_data)
                                created += 1
                            
                            processed += 1
                            
                        except Exception as e:
                            logger.error(f'Error processing {table_name} record {record}: {str(e)}')
                            skipped += 1
                            
            except Exception as e:
                logger.error(f'Error processing {table_name} batch {i//batch_size + 1}: {str(e)}')
                # Mark all records in this batch as skipped
                skipped += len(batch)
            
            # Close database connection after each batch to prevent timeouts
            from django.db import connection
            connection.close()
            
            # Progress update
            if (i + batch_size) % (batch_size * 10) == 0:  # Every 10 batches
                self.stdout.write(f'  Processed {i + batch_size}/{len(data)} {table_name} records...')
        
        return processed, created, updated, skipped

    # Additional processors
    def process_engine_blocks(self, data, dry_run=False):
        return self._process_table(EngineBlock, data, 'EngineBlock', dry_run)
    def process_engine_bore_strokes(self, data, dry_run=False):
        return self._process_table(EngineBoreStroke, data, 'EngineBoreStroke', dry_run)
    def process_engine_base2(self, data, dry_run=False):
        return self._process_table(EngineBase2, data, 'EngineBase2', dry_run)
    def process_engine_designations(self, data, dry_run=False):
        return self._process_table(EngineDesignation, data, 'EngineDesignation', dry_run)
    def process_engine_vins(self, data, dry_run=False):
        return self._process_table(EngineVIN, data, 'EngineVIN', dry_run)
    def process_engine_versions(self, data, dry_run=False):
        return self._process_table(EngineVersion, data, 'EngineVersion', dry_run)
    def process_fuel_delivery_types(self, data, dry_run=False):
        return self._process_table(FuelDeliveryType, data, 'FuelDeliveryType', dry_run)
    def process_fuel_delivery_sub_types(self, data, dry_run=False):
        return self._process_table(FuelDeliverySubType, data, 'FuelDeliverySubType', dry_run)
    def process_fuel_system_control_types(self, data, dry_run=False):
        return self._process_table(FuelSystemControlType, data, 'FuelSystemControlType', dry_run)
    def process_fuel_system_designs(self, data, dry_run=False):
        return self._process_table(FuelSystemDesign, data, 'FuelSystemDesign', dry_run)
    def process_ignition_system_types(self, data, dry_run=False):
        return self._process_table(IgnitionSystemType, data, 'IgnitionSystemType', dry_run)
    def process_mfrs(self, data, dry_run=False):
        return self._process_table(Mfr, data, 'Mfr', dry_run)
    def process_mfr_body_codes(self, data, dry_run=False):
        return self._process_table(MfrBodyCode, data, 'MfrBodyCode', dry_run)
    def process_power_outputs(self, data, dry_run=False):
        return self._process_table(PowerOutput, data, 'PowerOutput', dry_run)
    def process_spring_types(self, data, dry_run=False):
        return self._process_table(SpringType, data, 'SpringType', dry_run)
    def process_spring_type_configs(self, data, dry_run=False):
        return self._process_table(SpringTypeConfig, data, 'SpringTypeConfig', dry_run)
    def process_steering_types(self, data, dry_run=False):
        return self._process_table(SteeringType, data, 'SteeringType', dry_run)
    def process_steering_systems(self, data, dry_run=False):
        return self._process_table(SteeringSystem, data, 'SteeringSystem', dry_run)
    def process_steering_configs(self, data, dry_run=False):
        return self._process_table(SteeringConfig, data, 'SteeringConfig', dry_run)
    def process_transmission_types(self, data, dry_run=False):
        return self._process_table(TransmissionType, data, 'TransmissionType', dry_run)
    def process_transmission_num_speeds(self, data, dry_run=False):
        return self._process_table(TransmissionNumSpeeds, data, 'TransmissionNumSpeeds', dry_run)
    def process_transmission_control_types(self, data, dry_run=False):
        return self._process_table(TransmissionControlType, data, 'TransmissionControlType', dry_run)
    def process_transmission_bases(self, data, dry_run=False):
        return self._process_table(TransmissionBase, data, 'TransmissionBase', dry_run)
    def process_transmission_mfr_codes(self, data, dry_run=False):
        return self._process_table(TransmissionMfrCode, data, 'TransmissionMfrCode', dry_run)
    def process_transmissions(self, data, dry_run=False):
        return self._process_table(Transmission, data, 'Transmission', dry_run)
    def process_valves(self, data, dry_run=False):
        return self._process_table(Valves, data, 'Valves', dry_run)
    def process_vehicle_type_groups(self, data, dry_run=False):
        return self._process_table(VehicleTypeGroup, data, 'VehicleTypeGroup', dry_run)
    def process_vehicle_types(self, data, dry_run=False):
        return self._process_table(VehicleType, data, 'VehicleType', dry_run)
    def process_wheelbases(self, data, dry_run=False):
        return self._process_table(WheelBase, data, 'WheelBase', dry_run)
    def process_vehicle_to_bed_configs(self, data, dry_run=False):
        return self._process_table_with_relations(
            VehicleToBedConfig, data, 'VehicleToBedConfig', dry_run,
            {'vehicle_id': Vehicle}
        )
    def process_vehicle_to_body_configs(self, data, dry_run=False):
        return self._process_table_with_relations(
            VehicleToBodyConfig, data, 'VehicleToBodyConfig', dry_run,
            {'vehicle_id': Vehicle}
        )
    def process_vehicle_to_brake_configs(self, data, dry_run=False):
        return self._process_table_with_relations(
            VehicleToBrakeConfig, data, 'VehicleToBrakeConfig', dry_run,
            {'vehicle_id': Vehicle}
        )
    def process_vehicle_to_classes(self, data, dry_run=False):
        return self._process_table_with_relations(
            VehicleToClass, data, 'VehicleToClass', dry_run,
            {'vehicle_id': Vehicle}
        )
    def process_vehicle_to_mfr_body_codes(self, data, dry_run=False):
        return self._process_table_with_relations(
            VehicleToMfrBodyCode, data, 'VehicleToMfrBodyCode', dry_run,
            {'vehicle_id': Vehicle}
        )
    def process_vehicle_to_spring_type_configs(self, data, dry_run=False):
        return self._process_table_with_relations(
            VehicleToSpringTypeConfig, data, 'VehicleToSpringTypeConfig', dry_run,
            {'vehicle_id': Vehicle}
        )
    def process_vehicle_to_steering_configs(self, data, dry_run=False):
        return self._process_table_with_relations(
            VehicleToSteeringConfig, data, 'VehicleToSteeringConfig', dry_run,
            {'vehicle_id': Vehicle}
        )
    def process_vehicle_to_transmissions(self, data, dry_run=False):
        return self._process_table_with_relations(
            VehicleToTransmission, data, 'VehicleToTransmission', dry_run,
            {'vehicle_id': Vehicle}
        )
    def process_vehicle_to_wheelbases(self, data, dry_run=False):
        return self._process_table_with_relations(
            VehicleToWheelbase, data, 'VehicleToWheelbase', dry_run,
            {'vehicle_id': Vehicle}
        )
    def _process_table_with_relations(self, model_class, data, table_name, dry_run=False, relations=None, batch_size=100):
        """Process a table with foreign key relations"""
        processed = 0
        created = 0
        updated = 0
        skipped = 0
        
        if dry_run:
            self.stdout.write(f'  [DRY RUN] Would process {len(data)} {table_name} records')
            return len(data), 0, 0, 0
        
        # Process in batches to avoid connection timeouts
        for i in range(0, len(data), batch_size):
            batch = data[i:i + batch_size]
            
            try:
                with transaction.atomic():
                    for record in batch:
                        try:
                            # Convert AutoCare data to Django format
                            django_data = convert_autocare_data_to_django(record, table_name)
                            
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
                            
                            # Check if record exists
                            existing = model_class.objects.filter(**{pk_field: pk_value}).first()
                            
                            if existing:
                                # Update existing record
                                for field, value in django_data.items():
                                    if field != pk_field:
                                        setattr(existing, field, value)
                                existing.save()
                                updated += 1
                            else:
                                # Create new record
                                model_class.objects.create(**django_data)
                                created += 1
                            
                            processed += 1
                            
                        except Exception as e:
                            logger.error(f'Error processing {table_name} record {record}: {str(e)}')
                            skipped += 1
                            
            except Exception as e:
                logger.error(f'Error processing {table_name} batch {i//batch_size + 1}: {str(e)}')
                # Mark all records in this batch as skipped
                skipped += len(batch)
            
            # Close database connection after each batch to prevent timeouts
            from django.db import connection
            connection.close()
            
            # Progress update
            if (i + batch_size) % (batch_size * 10) == 0:  # Every 10 batches
                self.stdout.write(f'  Processed {i + batch_size}/{len(data)} {table_name} records...')
        
        return processed, created, updated, skipped
    # Additional processing methods for new VCDB tables
    def process_abbreviations(self, data, dry_run=False):
        return self._process_table(Abbreviation, data, 'Abbreviation', dry_run)
    
    def process_aspirations(self, data, dry_run=False):
        return self._process_table(Aspiration, data, 'Aspiration', dry_run)
    
    def process_bed_configs(self, data, dry_run=False):
        return self._process_table(BedConfig, data, 'BedConfig', dry_run)
    
    def process_bed_lengths(self, data, dry_run=False):
        return self._process_table(BedLength, data, 'BedLength', dry_run)
    
    def process_bed_types(self, data, dry_run=False):
        return self._process_table(BedType, data, 'BedType', dry_run)
    
    def process_brake_abs(self, data, dry_run=False):
        return self._process_table(BrakeABS, data, 'BrakeABS', dry_run)
    
    def process_brake_configs(self, data, dry_run=False):
        return self._process_table(BrakeConfig, data, 'BrakeConfig', dry_run)
    
    def process_brake_systems(self, data, dry_run=False):
        return self._process_table(BrakeSystem, data, 'BrakeSystem', dry_run)
    
    def process_brake_types(self, data, dry_run=False):
        return self._process_table(BrakeType, data, 'BrakeType', dry_run)
    
    def process_classes(self, data, dry_run=False):
        return self._process_table(Class, data, 'Class', dry_run)
    
    def process_cylinder_head_types(self, data, dry_run=False):
        return self._process_table(CylinderHeadType, data, 'CylinderHeadType', dry_run)
    
    def process_elec_controlled(self, data, dry_run=False):
        return self._process_table(ElecControlled, data, 'ElecControlled', dry_run)
    
    def process_engine_bases(self, data, dry_run=False):
        return self._process_table(EngineBase, data, 'EngineBase', dry_run)
