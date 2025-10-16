# VCDB AutoCare API Integration

This document describes the implementation of the VCDB (Vehicle Configuration Database) integration with AutoCare APIs for quarterly data synchronization.

## Overview

The system now fetches VCDB data directly from AutoCare APIs instead of relying on file uploads. This provides:

- Real-time access to the latest vehicle data
- Automated quarterly synchronization
- Comprehensive vehicle information including makes, models, years, drive types, fuel types, etc.
- Advanced search capabilities

## Architecture

### Backend Components

1. **Database Models** (`api/sdc/vcdb/models.py`)

   - `Make` - Vehicle manufacturers
   - `Model` - Vehicle models
   - `SubModel` - Vehicle sub-models
   - `BaseVehicle` - Base vehicle configurations
   - `DriveType` - Drive type configurations
   - `FuelType` - Fuel type configurations
   - `BodyNumDoors` - Number of doors
   - `BodyType` - Body type configurations
   - `BodyStyleConfig` - Body style configurations
   - `EngineConfig` - Engine configurations
   - `Vehicle` - Complete vehicle records
   - `VehicleToDriveType` - Vehicle-drive type mappings
   - `VehicleToBodyStyleConfig` - Vehicle-body style mappings
   - `VehicleToEngineConfig` - Vehicle-engine mappings
   - `VCDBSyncLog` - Sync operation logs

2. **AutoCare API Client** (`api/sdc/vcdb/autocare_api.py`)

   - Handles authentication with AutoCare APIs
   - Fetches data from all VCDB endpoints
   - Manages token refresh and error handling
   - Converts AutoCare data format to Django models

3. **Management Command** (`api/sdc/vcdb/management/commands/sync_vcdb_data.py`)

   - Django management command for manual sync
   - Processes data in dependency order
   - Handles foreign key relationships
   - Provides detailed logging and error reporting

4. **Celery Tasks** (`api/sdc/vcdb/tasks.py`)

   - `sync_vcdb_data_task` - Main sync task
   - `schedule_quarterly_vcdb_sync` - Schedules next sync
   - `check_vcdb_sync_status` - Status monitoring

5. **API Views** (`api/sdc/vcdb/views.py`)
   - RESTful API endpoints for all VCDB data
   - Advanced vehicle search functionality
   - Sync status and management endpoints

### Frontend Components

1. **VCDBDataNew Component** (`web/src/pages/VCDBDataNew.tsx`)
   - Replaces the old file upload interface
   - Shows VCDB statistics and sync status
   - Provides advanced vehicle search
   - Displays sync logs and results

## AutoCare API Integration

### Authentication

The system authenticates with AutoCare using OAuth2 password flow:

```bash
curl --location 'https://autocare-identity.autocare.org/connect/token' \
--header 'Content-Type: application/x-www-form-urlencoded' \
--data-urlencode 'grant_type=password' \
--data-urlencode 'client_id=37744C6D561F4B8A' \
--data-urlencode 'client_secret=eu6X8vyRTX$#' \
--data-urlencode 'username=hkanani@ridefox.com' \
--data-urlencode 'password=Mahadev@6028' \
--data-urlencode 'scope=VcdbApis CommonApis openid profile offline_access'
```

### API Endpoints

The system fetches data from these AutoCare endpoints:

- `https://vcdb.autocarevip.com/api/v1.0/vcdb/BaseVehicle`
- `https://vcdb.autocarevip.com/api/v1.0/vcdb/BodyNumDoors`
- `https://vcdb.autocarevip.com/api/v1.0/vcdb/Make`
- `https://vcdb.autocarevip.com/api/v1.0/vcdb/Model`
- `https://vcdb.autocarevip.com/api/v1.0/vcdb/SubModel`
- `https://vcdb.autocarevip.com/api/v1.0/vcdb/DriveType`
- `https://vcdb.autocarevip.com/api/v1.0/vcdb/FuelType`
- `https://vcdb.autocarevip.com/api/v1.0/vcdb/BodyStyleConfig`
- `https://vcdb.autocarevip.com/api/v1.0/vcdb/EngineConfig`
- `https://vcdb.autocarevip.com/api/v1.0/vcdb/Vehicle`
- `https://vcdb.autocarevip.com/api/v1.0/vcdb/VehicleToDriveType`
- `https://vcdb.autocarevip.com/api/v1.0/vcdb/VehicleToBodyStyleConfig`
- `https://vcdb.autocarevip.com/api/v1.0/vcdb/VehicleToEngineConfig`
- `https://vcdb.autocarevip.com/api/v1.0/vcdb/BodyType`

## Usage

### Manual Sync

To manually trigger a VCDB sync:

```bash
cd api/sdc
python3 manage.py sync_vcdb_data
```

Options:

- `--dry-run` - Run without making database changes
- `--force` - Force sync even if recent sync exists

### API Endpoints

#### VCDB Data Endpoints

- `GET /api/vcdb-data/makes/` - List all makes
- `GET /api/vcdb-data/models/` - List all models
- `GET /api/vcdb-data/vehicles/` - List all vehicles
- `POST /api/vcdb-data/vehicles/search/` - Advanced vehicle search

#### Sync Management Endpoints

- `GET /api/vcdb-data/sync-logs/` - List sync logs
- `POST /api/vcdb-data/sync-logs/trigger_sync/` - Trigger manual sync
- `GET /api/vcdb-data/sync-logs/status/` - Get sync status

### Frontend Usage

1. **View VCDB Statistics**

   - Navigate to the VCDB Data page
   - View total counts of makes, models, and vehicles
   - Check last sync status and timing

2. **Search Vehicles**

   - Click "Search Vehicles" button
   - Use filters for make, model, year, sub-model, drive type, fuel type, body type, and number of doors
   - View detailed results with all vehicle configurations

3. **Monitor Sync Operations**
   - View sync logs with detailed statistics
   - Trigger manual syncs when needed
   - Monitor sync status and error reports

## Quarterly Sync Schedule

The system is configured to run quarterly syncs automatically:

- **Schedule**: Every 3 months on the 1st at 2:00 AM
- **Months**: January, April, July, October
- **Task**: `vcdb.tasks.sync_vcdb_data_task`

### Starting Celery Beat

To enable automatic quarterly syncs, start the Celery Beat scheduler:

```bash
./start_celery_beat.sh
```

Or manually:

```bash
cd api/sdc
celery -A sdc beat --loglevel=info
```

## Data Flow

1. **Authentication**: System authenticates with AutoCare API
2. **Data Fetching**: Fetches data from all VCDB endpoints
3. **Data Processing**: Converts AutoCare format to Django models
4. **Database Update**: Updates or creates records in dependency order
5. **Logging**: Records sync statistics and any errors
6. **Scheduling**: Schedules next quarterly sync

## Error Handling

- **Authentication Failures**: Automatic retry with exponential backoff
- **API Errors**: Detailed error logging and partial success handling
- **Database Errors**: Transaction rollback and error reporting
- **Network Issues**: Retry mechanisms and timeout handling

## Monitoring

- **Sync Logs**: Detailed logs of all sync operations
- **Status Endpoints**: Real-time sync status and data counts
- **Error Tracking**: Comprehensive error logging and reporting
- **Performance Metrics**: Sync duration and record processing statistics

## Security

- **API Credentials**: Stored securely in environment variables
- **Token Management**: Automatic token refresh and secure storage
- **Access Control**: JWT-based authentication for API endpoints
- **Data Validation**: Input validation and sanitization

## Migration from File Uploads

The new system replaces the old file upload functionality:

1. **Old System**: Manual file uploads of VCDB data
2. **New System**: Automated API-based data synchronization
3. **Benefits**:
   - Always up-to-date data
   - No manual intervention required
   - Comprehensive vehicle information
   - Advanced search capabilities

## Troubleshooting

### Common Issues

1. **Authentication Failures**

   - Check AutoCare API credentials
   - Verify network connectivity
   - Check token expiration

2. **Sync Failures**

   - Review sync logs for detailed error messages
   - Check database connectivity
   - Verify foreign key relationships

3. **Data Inconsistencies**
   - Run manual sync with `--force` flag
   - Check for missing related records
   - Review sync logs for skipped records

### Logs

- **Django Logs**: Application-level logging
- **Celery Logs**: Task execution logging
- **Sync Logs**: Database-stored sync operation logs
- **API Logs**: AutoCare API interaction logs

## Future Enhancements

1. **Real-time Updates**: WebSocket-based real-time data updates
2. **Data Validation**: Enhanced data quality checks
3. **Performance Optimization**: Caching and query optimization
4. **Monitoring Dashboard**: Advanced monitoring and alerting
5. **Data Analytics**: Vehicle data analytics and reporting
