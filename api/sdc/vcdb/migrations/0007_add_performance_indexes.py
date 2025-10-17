# Generated manually for performance optimization

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('vcdb', '0006_add_more_vcdb_models'),
    ]

    operations = [
        # Add indexes for vehicle search performance
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_vehicle_base_vehicle ON vcdb_vehicle (base_vehicle_id);",
            reverse_sql="DROP INDEX IF EXISTS idx_vehicle_base_vehicle;"
        ),
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_base_vehicle_make_model ON vcdb_basevehicle (make_id, model_id);",
            reverse_sql="DROP INDEX IF EXISTS idx_base_vehicle_make_model;"
        ),
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_vehicle_type_group ON vcdb_vehicletype (vehicle_type_group_id);",
            reverse_sql="DROP INDEX IF EXISTS idx_vehicle_type_group;"
        ),
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_vehicle_to_drive_type ON vcdb_vehicletodrivetype (vehicle_id, drive_type_id);",
            reverse_sql="DROP INDEX IF EXISTS idx_vehicle_to_drive_type;"
        ),
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_vehicle_to_body_style ON vcdb_vehicletobodystyleconfig (vehicle_id, body_style_config_id);",
            reverse_sql="DROP INDEX IF EXISTS idx_vehicle_to_body_style;"
        ),
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_vehicle_to_engine ON vcdb_vehicletotoengineconfig (vehicle_id, engine_config_id);",
            reverse_sql="DROP INDEX IF EXISTS idx_vehicle_to_engine;"
        ),
        # Add composite indexes for common filter combinations
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_base_vehicle_year_make ON vcdb_basevehicle (year_id, make_id);",
            reverse_sql="DROP INDEX IF EXISTS idx_base_vehicle_year_make;"
        ),
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_vehicle_region ON vcdb_vehicle (region_id);",
            reverse_sql="DROP INDEX IF EXISTS idx_vehicle_region;"
        ),
    ]
