from django.core.management.base import BaseCommand
from field_config.models import FieldConfiguration


class Command(BaseCommand):
    help = 'Populate database with initial field configurations'

    def handle(self, *args, **options):
        # VCDB Field Configurations
        vcdb_fields = [
            {
                'name': 'year',
                'display_name': 'Year',
                'description': 'Vehicle model year',
                'field_type': 'integer',
                'reference_type': 'vcdb',
                'requirement_level': 'required',
                'is_enabled': True,
                'display_order': 1,
                'show_in_filters': True,
                'show_in_forms': True,
                'min_value': 1900,
                'max_value': 2030,
            },
            {
                'name': 'make',
                'display_name': 'Make',
                'description': 'Vehicle manufacturer',
                'field_type': 'string',
                'reference_type': 'vcdb',
                'requirement_level': 'required',
                'is_enabled': True,
                'display_order': 2,
                'show_in_filters': True,
                'show_in_forms': True,
                'min_length': 1,
                'max_length': 50,
            },
            {
                'name': 'model',
                'display_name': 'Model',
                'description': 'Vehicle model',
                'field_type': 'string',
                'reference_type': 'vcdb',
                'requirement_level': 'required',
                'is_enabled': True,
                'display_order': 3,
                'show_in_filters': True,
                'show_in_forms': True,
                'min_length': 1,
                'max_length': 100,
            },
            {
                'name': 'submodel',
                'display_name': 'Submodel',
                'description': 'Vehicle submodel or trim level',
                'field_type': 'string',
                'reference_type': 'vcdb',
                'requirement_level': 'optional',
                'is_enabled': True,
                'display_order': 4,
                'show_in_filters': True,
                'show_in_forms': True,
                'min_length': 1,
                'max_length': 100,
            },
            {
                'name': 'drive_type',
                'display_name': 'Drive Type',
                'description': 'Vehicle drive type (FWD, RWD, AWD, 4WD)',
                'field_type': 'enum',
                'reference_type': 'vcdb',
                'requirement_level': 'optional',
                'is_enabled': True,
                'display_order': 5,
                'show_in_filters': True,
                'show_in_forms': True,
                'enum_options': ['FWD', 'RWD', 'AWD', '4WD', 'Unknown'],
            },
            {
                'name': 'fuel_type',
                'display_name': 'Fuel Type',
                'description': 'Vehicle fuel type',
                'field_type': 'enum',
                'reference_type': 'vcdb',
                'requirement_level': 'optional',
                'is_enabled': True,
                'display_order': 6,
                'show_in_filters': True,
                'show_in_forms': True,
                'enum_options': ['Gasoline', 'Diesel', 'Electric', 'Hybrid', 'Unknown'],
            },
            {
                'name': 'body_type',
                'display_name': 'Body Type',
                'description': 'Vehicle body type',
                'field_type': 'string',
                'reference_type': 'vcdb',
                'requirement_level': 'optional',
                'is_enabled': True,
                'display_order': 7,
                'show_in_filters': True,
                'show_in_forms': True,
                'min_length': 1,
                'max_length': 50,
            },
            {
                'name': 'num_doors',
                'display_name': 'Number of Doors',
                'description': 'Number of doors on the vehicle',
                'field_type': 'integer',
                'reference_type': 'vcdb',
                'requirement_level': 'optional',
                'is_enabled': True,
                'display_order': 8,
                'show_in_filters': True,
                'show_in_forms': True,
                'min_value': 2,
                'max_value': 6,
            },
        ]

        # Product Field Configurations
        product_fields = [
            {
                'name': 'part_id',
                'display_name': 'Part ID',
                'description': 'Unique part identifier',
                'field_type': 'string',
                'reference_type': 'product',
                'requirement_level': 'required',
                'is_enabled': True,
                'display_order': 1,
                'show_in_filters': True,
                'show_in_forms': True,
                'is_unique': True,
                'min_length': 1,
                'max_length': 50,
            },
            {
                'name': 'description',
                'display_name': 'Description',
                'description': 'Part description',
                'field_type': 'text',
                'reference_type': 'product',
                'requirement_level': 'required',
                'is_enabled': True,
                'display_order': 2,
                'show_in_filters': True,
                'show_in_forms': True,
                'min_length': 1,
                'max_length': 500,
            },
            {
                'name': 'category',
                'display_name': 'Category',
                'description': 'Part category',
                'field_type': 'string',
                'reference_type': 'product',
                'requirement_level': 'optional',
                'is_enabled': True,
                'display_order': 3,
                'show_in_filters': True,
                'show_in_forms': True,
                'min_length': 1,
                'max_length': 100,
            },
            {
                'name': 'brand',
                'display_name': 'Brand',
                'description': 'Part brand or manufacturer',
                'field_type': 'string',
                'reference_type': 'product',
                'requirement_level': 'optional',
                'is_enabled': True,
                'display_order': 4,
                'show_in_filters': True,
                'show_in_forms': True,
                'min_length': 1,
                'max_length': 100,
            },
            {
                'name': 'part_type',
                'display_name': 'Part Type',
                'description': 'Type of part',
                'field_type': 'string',
                'reference_type': 'product',
                'requirement_level': 'optional',
                'is_enabled': True,
                'display_order': 5,
                'show_in_filters': True,
                'show_in_forms': True,
                'min_length': 1,
                'max_length': 100,
            },
            {
                'name': 'unit_of_measure',
                'display_name': 'Unit of Measure',
                'description': 'Unit of measure for the part',
                'field_type': 'enum',
                'reference_type': 'product',
                'requirement_level': 'optional',
                'is_enabled': True,
                'display_order': 6,
                'show_in_filters': True,
                'show_in_forms': True,
                'enum_options': ['EA', 'FT', 'IN', 'LB', 'KG', 'GAL', 'L', 'SET', 'PAIR'],
            },
            {
                'name': 'item_status',
                'display_name': 'Item Status',
                'description': 'Status of the item',
                'field_type': 'enum',
                'reference_type': 'product',
                'requirement_level': 'optional',
                'is_enabled': True,
                'display_order': 7,
                'show_in_filters': True,
                'show_in_forms': True,
                'enum_options': ['Active', 'Inactive', 'Discontinued', 'New'],
            },
        ]

        # Create VCDB fields
        for field_data in vcdb_fields:
            field, created = FieldConfiguration.objects.get_or_create(
                name=field_data['name'],
                reference_type=field_data['reference_type'],
                defaults=field_data
            )
            if created:
                self.stdout.write(
                    self.style.SUCCESS(f'Created VCDB field: {field.display_name}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'VCDB field already exists: {field.display_name}')
                )

        # Create Product fields
        for field_data in product_fields:
            field, created = FieldConfiguration.objects.get_or_create(
                name=field_data['name'],
                reference_type=field_data['reference_type'],
                defaults=field_data
            )
            if created:
                self.stdout.write(
                    self.style.SUCCESS(f'Created Product field: {field.display_name}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'Product field already exists: {field.display_name}')
                )

        total_fields = FieldConfiguration.objects.count()
        self.stdout.write(
            self.style.SUCCESS(f'Total field configurations: {total_fields}')
        )
