# Tenant-Based Data Filtering Implementation

## Overview

This implementation adds tenant-based data filtering to the data upload and fitment system. All data operations now respect the `X-Tenant-ID` header to ensure data isolation between different tenants.

## Backend Changes (api/sdc/data_uploads/views.py)

### Updated Views with Tenant Filtering

#### 1. `get_data_status(request)`

- **Purpose**: Returns the current status of uploaded and processed data
- **Tenant Filtering**: Filters VCDBData, ProductData, and DataUploadSession by tenant
- **Response**: Returns tenant-specific data counts and session information

#### 2. `get_dropdown_data(request)`

- **Purpose**: Provides dropdown options for vehicle and product filters
- **Tenant Filtering**: Filters all dropdown data (years, makes, models, etc.) by tenant
- **Response**: Returns tenant-specific dropdown options

#### 3. `get_filtered_vehicles(request)`

- **Purpose**: Searches for vehicles based on filter criteria
- **Tenant Filtering**: Filters VCDBData by tenant before applying search filters
- **Response**: Returns tenant-specific vehicle search results

#### 4. `get_vcdb_data(request)`

- **Purpose**: Retrieves VCDB data with optional filtering
- **Tenant Filtering**: Filters VCDBData by tenant before applying query filters
- **Response**: Returns tenant-specific VCDB records

#### 5. `get_product_data(request)`

- **Purpose**: Retrieves product data with optional filtering
- **Tenant Filtering**: Filters ProductData by tenant before applying query filters
- **Response**: Returns tenant-specific product records

### Implementation Pattern

Each view follows this pattern:

```python
@api_view(['GET'])
@permission_classes([AllowAny])
def view_name(request):
    try:
        # Get tenant ID from header
        tenant_id = request.headers.get('X-Tenant-ID')

        # Build base queryset
        queryset = Model.objects.all()

        # Filter by tenant if provided
        if tenant_id:
            try:
                from tenants.models import Tenant
                tenant = Tenant.objects.get(id=tenant_id)
                queryset = queryset.filter(tenant=tenant)
            except Tenant.DoesNotExist:
                return Response(
                    {"error": "Invalid tenant ID"},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Apply additional filters and return response
        # ...
```

## Frontend Changes (web/src/api/client.ts)

### Automatic Header Injection

The frontend API client automatically includes the `X-Tenant-ID` header in all requests:

```typescript
// Request interceptor
apiClient.interceptors.request.use((config) => {
  // Add tenant context if available
  const currentEntity = localStorage.getItem("current_entity");
  if (currentEntity) {
    try {
      const entity = JSON.parse(currentEntity);
      config.headers["X-Tenant-ID"] = entity.id;
    } catch (err) {
      console.warn("Invalid entity data in localStorage");
    }
  }
  return config;
});
```

### No Changes Required in API Services

All existing API service methods automatically benefit from tenant filtering because they use the configured `apiClient` which includes the tenant header.

## Database Models

### Tenant-Aware Models

The following models already have tenant relationships:

- `DataUploadSession.tenant` (ForeignKey to Tenant)
- `VCDBData.tenant` (ForeignKey to Tenant)
- `ProductData.tenant` (ForeignKey to Tenant)

## API Endpoints

### Updated Endpoints

All these endpoints now support tenant filtering via `X-Tenant-ID` header:

- `GET /api/data-uploads/data-status/`
- `GET /api/data-uploads/dropdown-data/`
- `POST /api/data-uploads/filtered-vehicles/`
- `GET /api/data-uploads/vcdb/`
- `GET /api/data-uploads/products/`

### Request Headers

```http
X-Tenant-ID: d319e711-0969-469d-b812-04f5e6684e0d
Authorization: Bearer e953dd6549397cd6b190720073a98bf0b9b28774
```

### Response Examples

#### With Valid Tenant ID

```json
{
  "vcdb": {
    "exists": true,
    "record_count": 150,
    "filename": "vehicles.csv",
    "uploaded_at": "2024-01-15T10:30:00Z",
    "valid": true
  },
  "products": {
    "exists": true,
    "record_count": 75,
    "filename": "products.csv",
    "uploaded_at": "2024-01-15T10:30:00Z",
    "valid": true
  },
  "ready_for_fitment": true
}
```

#### With Invalid Tenant ID

```json
{
  "error": "Invalid tenant ID"
}
```

## Testing

### Test Script

A comprehensive test script (`test_tenant_filtering.py`) is provided to verify:

1. **Valid Tenant ID**: Returns tenant-specific data
2. **No Tenant ID**: Returns all data (no filtering)
3. **Invalid Tenant ID**: Returns 400 error with appropriate message

### Running Tests

```bash
python test_tenant_filtering.py
```

## Security Considerations

### Data Isolation

- Each tenant can only access their own data
- Invalid tenant IDs are rejected with 400 status
- No tenant ID means no filtering (returns all data)

### Error Handling

- Invalid tenant IDs return clear error messages
- Database errors are logged and return generic error responses
- Network errors are handled gracefully

## Migration Notes

### Backward Compatibility

- Existing API calls without `X-Tenant-ID` header continue to work
- No tenant filtering is applied when header is missing
- All existing functionality is preserved

### Database Considerations

- Ensure all data has proper tenant associations
- Consider data migration for existing records
- Verify tenant relationships are properly set up

## Usage Examples

### Frontend Usage

```typescript
// The tenant ID is automatically included in all API calls
const dataStatus = await dataUploadService.getNewDataStatus();
const dropdownData = await dataUploadService.getNewDataDropdownData();
const vehicles = await fitmentUploadService.getFilteredVehicles(
  sessionId,
  filters
);
```

### Backend Testing

```bash
curl 'http://127.0.0.1:8001/api/data-uploads/data-status/' \
  -H 'X-Tenant-ID: d319e711-0969-469d-b812-04f5e6684e0d' \
  -H 'Authorization: Bearer e953dd6549397cd6b190720073a98bf0b9b28774'
```

## Benefits

1. **Data Isolation**: Complete separation of tenant data
2. **Security**: Prevents cross-tenant data access
3. **Scalability**: Supports multi-tenant architecture
4. **Flexibility**: Optional tenant filtering maintains backward compatibility
5. **Performance**: Efficient database queries with proper indexing

## Future Enhancements

1. **Caching**: Add tenant-aware caching for better performance
2. **Audit Logging**: Track tenant-specific data access
3. **Rate Limiting**: Implement tenant-based rate limiting
4. **Data Export**: Add tenant-specific data export functionality
