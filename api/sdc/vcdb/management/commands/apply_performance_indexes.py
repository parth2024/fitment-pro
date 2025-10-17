from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = 'Apply performance indexes for VCDB vehicle search'

    def handle(self, *args, **options):
        indexes = [
            "CREATE INDEX IF NOT EXISTS idx_vehicle_base_vehicle ON vcdb_vehicle (base_vehicle_id);",
            "CREATE INDEX IF NOT EXISTS idx_base_vehicle_make_model ON vcdb_basevehicle (make_id, model_id);",
            "CREATE INDEX IF NOT EXISTS idx_vehicle_type_group ON vcdb_vehicletype (vehicle_type_group_id);",
            "CREATE INDEX IF NOT EXISTS idx_vehicle_to_drive_type ON vcdb_vehicletodrivetype (vehicle_id, drive_type_id);",
            "CREATE INDEX IF NOT EXISTS idx_vehicle_to_body_style ON vcdb_vehicletobodystyleconfig (vehicle_id, body_style_config_id);",
            "CREATE INDEX IF NOT EXISTS idx_vehicle_to_engine ON vcdb_vehicletotoengineconfig (vehicle_id, engine_config_id);",
            "CREATE INDEX IF NOT EXISTS idx_base_vehicle_year_make ON vcdb_basevehicle (year_id, make_id);",
            "CREATE INDEX IF NOT EXISTS idx_vehicle_region ON vcdb_vehicle (region_id);",
        ]

        with connection.cursor() as cursor:
            for index_sql in indexes:
                try:
                    cursor.execute(index_sql)
                    self.stdout.write(
                        self.style.SUCCESS(f'Successfully created index: {index_sql.split("idx_")[1].split(" ")[0]}')
                    )
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(f'Failed to create index: {e}')
                    )

        self.stdout.write(
            self.style.SUCCESS('Performance indexes application completed!')
        )
