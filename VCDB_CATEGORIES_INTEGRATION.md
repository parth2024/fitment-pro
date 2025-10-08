# VCDB Categories Integration Guide

## Overview

This document explains how the system integrates **Global VCDB Categories** with entity-specific VCDB configuration.

---

## System Architecture

### 1. **Global VCDB Categories** (Global Level)

- **Model**: `vcdb_categories.VCDBCategory`
- **Data Model**: `vcdb_categories.VCDBData`
- **Purpose**: Admin uploads VCDB data files globally (e.g., "Light Duty Trucks", "Heavy Duty", "Passenger Cars")
- **Storage**: Each category contains vehicle configuration data from uploaded files
- **Access**: Available to all entities, but each entity selects which categories to use

### 2. **Entity VCDB Configuration** (Entity Level)

- **Storage**: `Tenant.fitment_settings.vcdb_categories` (JSON array of category IDs)
- **Configuration**: Entities select which global VCDB categories they want to use via Entity Settings
- **Example**: `['uuid-1', 'uuid-2', 'uuid-3']` - Array of VCDBCategory IDs

### 3. **Legacy Tenant-Specific VCDB** (Fallback)

- **Model**: `data_uploads.VCDBData`
- **Purpose**: Direct VCDB uploads by entities (legacy system)
- **Usage**: Fallback when entity hasn't selected global categories

---

## Data Flow

```
1. Admin uploads Global VCDB Categories
   └─> VCDBCategory created with file
   └─> File parsed and stored in vcdb_categories.VCDBData

2. Entity configures VCDB in Settings
   └─> Selects categories from global list
   └─> Stored in entity.fitment_settings.vcdb_categories

3. Entity uses Apply Fitments
   └─> System checks entity.fitment_settings.vcdb_categories
   └─> If categories selected → Use global VCDB data filtered by categories
   └─> If no categories → Fall back to tenant-specific VCDB data
```

---

## Backend Implementation

### Updated API Endpoints

All VCDB-related endpoints now support the global categories filtering:

#### 1. **`GET /api/data-uploads/dropdown-data/`**

- **Purpose**: Get dropdown options for vehicle filters
- **Logic**:
  ```python
  if entity has selected_categories:
      use vcdb_categories.VCDBData filtered by categories
  else:
      use data_uploads.VCDBData (tenant-specific)
  ```

#### 2. **`POST /api/data-uploads/filtered-vehicles/`**

- **Purpose**: Search for vehicles based on filters
- **Logic**: Same as dropdown-data, filters from selected categories

#### 3. **`GET /api/data-uploads/data-status/`**

- **Purpose**: Check if VCDB and Product data exists
- **Logic**: Counts records from selected categories or tenant data

#### 4. **`GET /api/data-uploads/vcdb/`**

- **Purpose**: Get VCDB vehicle records
- **Logic**: Returns vehicles from selected categories

---

## Code Changes

### `api/sdc/data_uploads/views.py`

**Modified Functions:**

1. `get_dropdown_data()` (line 1332)
2. `get_filtered_vehicles()` (line 1422)
3. `get_data_status()` (line 1266)
4. `get_vcdb_data()` (line 1112)

**Key Logic Pattern:**

```python
from tenants.models import Tenant
from vcdb_categories.models import VCDBData as GlobalVCDBData

tenant = Tenant.objects.get(id=tenant_id)
selected_categories = tenant.fitment_settings.get('vcdb_categories', [])

if selected_categories and len(selected_categories) > 0:
    # Use global VCDB categories
    vcdb_queryset = GlobalVCDBData.objects.filter(category_id__in=selected_categories)
else:
    # Fall back to tenant-specific VCDB data
    vcdb_queryset = VCDBData.objects.filter(tenant=tenant)
```

---

## Frontend Flow (ApplyFitments.tsx)

### Current Implementation

The frontend already:

1. Sends `X-Tenant-ID` header with all API requests (via `apiClient`)
2. Uses entity context from `useEntity()` hook
3. Calls backend endpoints that now support category filtering

### No Frontend Changes Needed

The frontend doesn't need to change because:

- Backend automatically detects and filters by categories based on tenant ID
- All existing API calls continue to work
- Category selection happens in Entity Settings (already implemented)

---

## Testing the Integration

### 1. **Upload Global VCDB Categories**

```
1. Go to "Global VCDB Categories" page (admin)
2. Click "Create New VCDB Category"
3. Enter name (e.g., "Light Duty Trucks")
4. Upload VCDB file (CSV/JSON/XLSX)
5. Category is validated and vehicles are stored
```

### 2. **Configure Entity VCDB Categories**

```
1. Go to "Entity Management" → Select Entity → Edit
2. Scroll to "VCDB Configuration" section
3. Select one or more VCDB categories from dropdown
4. Save entity settings
```

### 3. **Test Apply Fitments**

```
1. Go to "Apply Fitments" page
2. Select "Manual Fitment" method
3. The vehicle dropdowns should show ONLY vehicles from selected categories
4. Search for vehicles - results filtered by categories
```

---

## Verification Steps

### Backend Logs

Check server logs for these messages:

```
Using global VCDB categories: ['uuid-1', 'uuid-2'] for tenant EntityName
Filtering vehicles from global VCDB categories: ['uuid-1', 'uuid-2']
```

Or fallback:

```
Using tenant-specific VCDB data for tenant EntityName
```

### Database Query

To verify correct category filtering:

```sql
-- Check entity's selected categories
SELECT fitment_settings FROM tenants_tenant WHERE name = 'Your Entity';

-- Check VCDB data for a category
SELECT COUNT(*) FROM vcdb_categories_vcdbdata WHERE category_id = 'uuid-1';
```

---

## Migration Path

### For Existing Entities

**Option 1: Use Global Categories (Recommended)**

1. Admin uploads global VCDB categories
2. Entity selects categories in settings
3. System automatically uses filtered global data

**Option 2: Continue Legacy Uploads**

1. Entity doesn't select categories
2. System falls back to tenant-specific uploads
3. Works exactly as before

---

## Benefits

✅ **Centralized VCDB Management**: Admin manages global categories  
✅ **Entity Flexibility**: Each entity chooses relevant categories  
✅ **Data Efficiency**: Shared VCDB data, no duplication  
✅ **Backward Compatible**: Legacy uploads still work  
✅ **Automatic Filtering**: Backend handles all filtering logic  
✅ **No Frontend Changes**: Works with existing UI

---

## API Request Examples

### Get Dropdown Data

```http
GET /api/data-uploads/dropdown-data/
Headers:
  X-Tenant-ID: entity-uuid
```

**Response** (with categories selected):

```json
{
  "years": ["2020", "2021", "2022"],
  "makes": ["Ford", "Chevrolet", "Toyota"],
  "models": ["F-150", "Silverado", "Tacoma"],
  ...
}
```

### Get Filtered Vehicles

```http
POST /api/data-uploads/filtered-vehicles/
Headers:
  X-Tenant-ID: entity-uuid
Body:
{
  "filters": {
    "yearFrom": "2020",
    "yearTo": "2022",
    "make": "Ford"
  }
}
```

**Response**:

```json
{
  "vehicles": [
    {
      "id": "123",
      "year": 2020,
      "make": "Ford",
      "model": "F-150",
      ...
    }
  ]
}
```

---

## Troubleshooting

### Issue: "No vehicles found"

**Cause**: Entity hasn't selected VCDB categories  
**Solution**: Go to Entity Settings → Select VCDB categories

### Issue: "Wrong vehicles showing"

**Cause**: Entity selected wrong categories  
**Solution**: Edit entity settings, update selected categories

### Issue: "Can't see global categories"

**Cause**: No global categories uploaded  
**Solution**: Admin uploads VCDB categories first

---

## Summary

The system now supports **two modes** for VCDB data:

1. **Global Categories Mode** (new): Entities select from global VCDB categories
2. **Direct Upload Mode** (legacy): Entities upload their own VCDB files

The backend automatically detects which mode to use based on entity settings and applies the appropriate filtering. No frontend changes are required.
