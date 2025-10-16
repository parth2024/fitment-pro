from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone
from datetime import datetime
import logging

from vcdb.models import (
    Make, Model, SubModel, Region, PublicationStage, Year, BaseVehicle, DriveType, FuelType,
    BodyNumDoors, BodyType, BodyStyleConfig, EngineConfig, Vehicle,
    VehicleToDriveType, VehicleToBodyStyleConfig, VehicleToEngineConfig,
    VCDBSyncLog
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

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        force = options['force']
        
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
            ]
            
            for table_name, processor in table_processors:
                if table_name in vcdb_data and vcdb_data[table_name]:
                    self.stdout.write(f'Processing {table_name}...')
                    try:
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

    def process_makes(self, data, dry_run=False):
        return self._process_table(Make, data, 'Make', dry_run)

    def process_models(self, data, dry_run=False):
        return self._process_table(Model, data, 'Model', dry_run)

    def process_submodels(self, data, dry_run=False):
        return self._process_table(SubModel, data, 'SubModel', dry_run)

    def process_regions(self, data, dry_run=False):
        return self._process_table(Region, data, 'Region', dry_run)

    def process_publication_stages(self, data, dry_run=False):
        return self._process_table(PublicationStage, data, 'PublicationStage', dry_run)

    def process_years(self, data, dry_run=False):
        return self._process_table(Year, data, 'Year', dry_run)

    def process_drive_types(self, data, dry_run=False):
        return self._process_table(DriveType, data, 'DriveType', dry_run)

    def process_fuel_types(self, data, dry_run=False):
        return self._process_table(FuelType, data, 'FuelType', dry_run)

    def process_body_num_doors(self, data, dry_run=False):
        return self._process_table(BodyNumDoors, data, 'BodyNumDoors', dry_run)

    def process_body_types(self, data, dry_run=False):
        return self._process_table(BodyType, data, 'BodyType', dry_run)

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

    def process_vehicles(self, data, dry_run=False):
        return self._process_table_with_relations(
            Vehicle, data, 'Vehicle', dry_run,
            {
                'base_vehicle_id': BaseVehicle, 
                'sub_model_id': SubModel,
                'region_id': Region,
                'publication_stage_id': PublicationStage
            }
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

    def _process_table(self, model_class, data, table_name, dry_run=False):
        """Process a simple table without foreign key relations"""
        processed = 0
        created = 0
        updated = 0
        skipped = 0
        
        if dry_run:
            self.stdout.write(f'  [DRY RUN] Would process {len(data)} {table_name} records')
            return len(data), 0, 0, 0
        
        with transaction.atomic():
            for record in data:
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
        
        return processed, created, updated, skipped

    def _process_table_with_relations(self, model_class, data, table_name, dry_run=False, relations=None):
        """Process a table with foreign key relations"""
        processed = 0
        created = 0
        updated = 0
        skipped = 0
        
        if dry_run:
            self.stdout.write(f'  [DRY RUN] Would process {len(data)} {table_name} records')
            return len(data), 0, 0, 0
        
        with transaction.atomic():
            for record in data:
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
        
        return processed, created, updated, skipped
