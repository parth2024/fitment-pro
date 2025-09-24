# Tenant-Aware Duplicate Detection Fix

## Problem Identified

The database was throwing unique constraint violations because the existing unique constraints didn't include the `tenant` field:

```
Error creating VCDB record for row Toyota RAV4: duplicate key value violates unique constraint "data_uploads_vcdbdata_year_make_model_submodel_99b48439_uniq"
DETAIL: Key (year, make, model, submodel, drive_type)=(2020, Toyota, RAV4, XLE, AWD) already exists.
```

## Root Cause

### VCDBData Model

- **Old Constraint**: `unique_together = ['year', 'make', 'model', 'submodel', 'drive_type']`
- **Problem**: Global uniqueness prevented same vehicle data across different tenants
- **Fix**: `unique_together = ['year', 'make', 'model', 'submodel', 'drive_type', 'tenant']`

### ProductData Model

- **Old Constraint**: `part_id = models.CharField(max_length=100, unique=True)`
- **Problem**: Global uniqueness prevented same product data across different tenants
- **Fix**: `unique_together = ['part_id', 'tenant']`

## Solution Implemented

### 1. Updated Model Definitions

#### VCDBData Model (`api/sdc/data_uploads/models.py`)

```python
class VCDBData(models.Model):
    # ... fields ...
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='vcdb_data', null=True, blank=True)

    class Meta:
        ordering = ['year', 'make', 'model']
        verbose_name = "VCDB Data"
        verbose_name_plural = "VCDB Data"
        unique_together = ['year', 'make', 'model', 'submodel', 'drive_type', 'tenant']  # Added tenant
```

#### ProductData Model (`api/sdc/data_uploads/models.py`)

```python
class ProductData(models.Model):
    # ... fields ...
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='product_data', null=True, blank=True)
    part_id = models.CharField(max_length=100)  # Removed unique=True

    class Meta:
        ordering = ['part_id']
        verbose_name = "Product Data"
        verbose_name_plural = "Product Data"
        unique_together = ['part_id', 'tenant']  # Added tenant-aware constraint
```

### 2. Created Database Migration

#### Migration File (`api/sdc/data_uploads/migrations/0002_update_unique_constraints_for_tenant.py`)

```python
from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('data_uploads', '0001_initial'),
    ]

    operations = [
        # Remove old VCDBData unique constraint
        migrations.AlterUniqueTogether(
            name='vcdbdata',
            unique_together=set(),
        ),

        # Add new VCDBData unique constraint with tenant
        migrations.AlterUniqueTogether(
            name='vcdbdata',
            unique_together={('year', 'make', 'model', 'submodel', 'drive_type', 'tenant')},
        ),

        # Remove unique constraint from ProductData part_id
        migrations.AlterField(
            model_name='productdata',
            name='part_id',
            field=models.CharField(max_length=100),
        ),

        # Add new ProductData unique constraint with tenant
        migrations.AlterUniqueTogether(
            name='productdata',
            unique_together={('part_id', 'tenant')},
        ),
    ]
```

## Migration Steps

### 1. Backup Database

```bash
# PostgreSQL
pg_dump your_database > backup_before_tenant_migration.sql

# SQLite
cp db.sqlite3 db_backup_before_tenant_migration.sqlite3
```

### 2. Apply Migration

```bash
# Navigate to Django project directory
cd /path/to/your/django/project

# Create migration (if not already created)
python manage.py makemigrations data_uploads

# Apply migration
python manage.py migrate data_uploads
```

### 3. Verify Migration

```bash
# Check migration status
python manage.py showmigrations data_uploads

# Should show:
# [X] 0001_initial
# [X] 0002_update_unique_constraints_for_tenant
```

## Expected Behavior After Migration

### ✅ Same Tenant, Same Data

```bash
# First upload for Tenant A
curl 'http://127.0.0.1:8001/api/data-uploads/sessions/' \
  -H 'X-Tenant-ID: tenant-a-id' \
  -F 'vcdb_file=@upload_data_vcdb.json'
# Result: Creates records

# Second upload of same file for Tenant A
curl 'http://127.0.0.1:8001/api/data-uploads/sessions/' \
  -H 'X-Tenant-ID: tenant-a-id' \
  -F 'vcdb_file=@upload_data_vcdb.json'
# Result: Updates existing records (no duplicates)
```

### ✅ Different Tenants, Same Data

```bash
# Upload for Tenant A
curl 'http://127.0.0.1:8001/api/data-uploads/sessions/' \
  -H 'X-Tenant-ID: tenant-a-id' \
  -F 'vcdb_file=@upload_data_vcdb.json'
# Result: Creates records for Tenant A

# Upload same file for Tenant B
curl 'http://127.0.0.1:8001/api/data-uploads/sessions/' \
  -H 'X-Tenant-ID: tenant-b-id' \
  -F 'vcdb_file=@upload_data_vcdb.json'
# Result: Creates records for Tenant B (duplicates allowed across tenants)
```

## Database Schema Changes

### Before Migration

```sql
-- VCDBData table
ALTER TABLE data_uploads_vcdbdata
ADD CONSTRAINT data_uploads_vcdbdata_year_make_model_submodel_99b48439_uniq
UNIQUE (year, make, model, submodel, drive_type);

-- ProductData table
ALTER TABLE data_uploads_productdata
ADD CONSTRAINT data_uploads_productdata_part_id_key
UNIQUE (part_id);
```

### After Migration

```sql
-- VCDBData table
ALTER TABLE data_uploads_vcdbdata
ADD CONSTRAINT data_uploads_vcdbdata_year_make_model_submodel_99b48439_uniq
UNIQUE (year, make, model, submodel, drive_type, tenant_id);

-- ProductData table
ALTER TABLE data_uploads_productdata
ADD CONSTRAINT data_uploads_productdata_part_id_tenant_id_key
UNIQUE (part_id, tenant_id);
```

## Testing

### Test Script

Run the comprehensive test script to verify the fix:

```bash
python test_tenant_duplicate_detection.py
```

### Expected Test Results

1. ✅ Same tenant, same data: Duplicates prevented (updates existing)
2. ✅ Different tenants, same data: Duplicates allowed (creates new records)
3. ✅ VCDB and Products: Both data types follow tenant-aware duplicate rules
4. ✅ Data isolation: Each tenant only sees their own data

## Troubleshooting

### Migration Fails

If the migration fails due to existing duplicate data:

1. **Option 1: Clear existing data**

   ```python
   # In Django shell
   from api.sdc.data_uploads.models import VCDBData, ProductData
   VCDBData.objects.all().delete()
   ProductData.objects.all().delete()
   ```

2. **Option 2: Handle duplicates in migration**
   ```python
   # Add data migration to handle existing duplicates
   def handle_duplicates(apps, schema_editor):
       # Custom logic to handle existing duplicates
       pass
   ```

### Constraint Violations After Migration

If you still get constraint violations:

1. Check that the migration was applied correctly
2. Verify that all records have tenant associations
3. Check for NULL tenant values that might cause issues

## Benefits

1. **🔒 Data Integrity**: Prevents duplicates within each tenant
2. **🌐 Multi-Tenant Support**: Allows same data across different tenants
3. **⚡ Performance**: Efficient duplicate checking with tenant filtering
4. **🛡️ Data Isolation**: Complete separation of tenant data
5. **🔄 Update Logic**: Existing records are updated with new data

## Files Modified

- `api/sdc/data_uploads/models.py` - Updated unique constraints
- `api/sdc/data_uploads/migrations/0002_update_unique_constraints_for_tenant.py` - Database migration
- `migrate_tenant_constraints.py` - Migration helper script
- `test_tenant_duplicate_detection.py` - Comprehensive test script

The fix ensures that your tenant-aware duplicate detection works correctly, allowing the same data to exist across different tenants while preventing duplicates within the same tenant.
