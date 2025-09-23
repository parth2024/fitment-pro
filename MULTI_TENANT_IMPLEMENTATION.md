# Multi-Tenant Implementation Guide

This document describes the multi-tenant architecture implementation for the Mass Fitment Tool (MFT) system.

## Overview

The system now supports multiple entities (tenants) where each entity represents a separate workspace or company. Each entity has isolated data, settings, and configurations.

## Key Features

### 🏢 Entity Management

- **Separate Workspaces**: Each entity acts as an isolated workspace
- **Entity Settings**: Custom fitment settings and AI instructions per entity
- **Contact Information**: Entity-specific contact details
- **User Management**: Users are assigned to specific entities

### 📊 Data Isolation

- **Fitments**: All fitments are scoped to their respective entity
- **Uploads**: Data uploads are entity-specific
- **Settings**: Field configurations and presets are per-entity
- **Reports**: All reporting is entity-scoped

### 🔐 Access Control

- **Entity-based Permissions**: Users can only access their assigned entity's data
- **Admin Interface**: Dedicated admin interface for entity management
- **Entity Switching**: Users can switch between entities they have access to

## Database Schema Changes

### New Models

#### Enhanced Tenant Model

```python
class Tenant(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200, unique=True)
    slug = models.SlugField(max_length=120, unique=True)
    description = models.TextField(blank=True, null=True)

    # Entity settings and configuration
    fitment_settings = models.JSONField(default=dict, blank=True)
    ai_instructions = models.TextField(blank=True, null=True)

    # Contact and company info
    contact_email = models.EmailField(blank=True, null=True)
    contact_phone = models.CharField(max_length=20, blank=True, null=True)
    company_address = models.TextField(blank=True, null=True)

    # Status and metadata
    is_active = models.BooleanField(default=True)
    is_default = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
```

#### User Profile Model

```python
class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='users')
    display_name = models.CharField(max_length=200, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    roles = models.ManyToManyField(Role, related_name='users', blank=True)
```

### Updated Models with Tenant Foreign Keys

All major models now include a `tenant` foreign key:

- `Fitment` - Entity-specific fitments
- `DataUploadSession` - Entity-specific upload sessions
- `VCDBData` - Entity-specific vehicle data
- `ProductData` - Entity-specific product data
- `FieldConfiguration` - Entity-specific field configurations
- `Upload` - Entity-specific file uploads
- `Job` - Entity-specific processing jobs
- `Preset` - Entity-specific presets

## API Changes

### New Endpoints

#### Entity Management

- `GET /api/tenants/` - List all entities
- `POST /api/tenants/` - Create new entity
- `GET /api/tenants/{id}/` - Get entity details
- `PUT /api/tenants/{id}/` - Update entity
- `DELETE /api/tenants/{id}/` - Delete entity
- `GET /api/tenants/current/` - Get current user's entity
- `POST /api/tenants/switch/{id}/` - Switch to different entity
- `GET /api/tenants/{id}/stats/` - Get entity statistics

#### Enhanced Existing Endpoints

All existing endpoints now automatically filter data by the current user's entity:

- Fitments endpoints filter by tenant
- Upload endpoints filter by tenant
- Analytics endpoints filter by tenant

### Request Headers

The API client automatically includes tenant context:

- `X-Tenant-ID`: Current tenant ID in request headers
- `Authorization`: Bearer token for authentication

## Frontend Changes

### New Components

#### EntitySelector Component

```tsx
<EntitySelector
  compact={true}
  onEntityChange={handleEntityChange}
  showStats={false}
/>
```

#### EntityContext

```tsx
const { currentEntity, switchEntity, refreshEntities } = useEntity();
```

### Updated Pages

- **Entity Management**: New admin page for managing entities
- **App Header**: Entity selector in the top navigation
- **All Pages**: Automatically scoped to current entity

## Migration Process

### 1. Database Migration

```bash
cd api/sdc
python3 manage.py makemigrations
python3 manage.py migrate
```

### 2. Data Migration

Run the migration command to assign existing data to a default tenant:

```bash
# Dry run to see what would be migrated
python3 manage.py migrate_to_tenants --dry-run

# Perform actual migration
python3 manage.py migrate_to_tenants

# Or with custom tenant name
python3 manage.py migrate_to_tenants --tenant-name "My Company" --tenant-slug "my-company"
```

### 3. User Profile Creation

The migration script automatically creates user profiles for existing admin users.

## Usage Guide

### For Administrators

#### Creating New Entities

1. Navigate to **Entity Management** in the admin panel
2. Click **Create Entity**
3. Fill in entity details:
   - Name and slug
   - Description
   - Contact information
   - AI instructions
   - Settings

#### Managing Users

1. Go to **Admin** → **User Profiles**
2. Assign users to entities
3. Set user roles and permissions

### For Users

#### Switching Entities

1. Use the entity selector in the top navigation
2. Select from available entities
3. All data will automatically filter to the selected entity

#### Entity-Specific Settings

- Each entity can have custom fitment settings
- AI instructions can be customized per entity
- Field configurations are entity-specific

## Security Considerations

### Data Isolation

- All database queries automatically filter by tenant
- Users cannot access data from other entities
- API endpoints validate tenant access

### Access Control

- Users are assigned to specific entities
- Entity switching is validated against user permissions
- Admin users can manage entities and user assignments

## Best Practices

### Entity Design

1. **Logical Separation**: Create entities based on business units or companies
2. **Naming Convention**: Use clear, descriptive names and slugs
3. **Settings Management**: Configure entity-specific settings as needed

### Data Management

1. **Regular Backups**: Backup entity data separately when possible
2. **Monitoring**: Monitor entity usage and performance
3. **Cleanup**: Regularly review and clean up unused entities

### User Management

1. **Role Assignment**: Assign appropriate roles to users
2. **Access Review**: Regularly review user access to entities
3. **Profile Maintenance**: Keep user profiles up to date

## Troubleshooting

### Common Issues

#### Entity Not Found

- Check if user has a valid user profile
- Verify entity is active and accessible
- Ensure user has permissions to access the entity

#### Data Not Loading

- Verify entity context is properly set
- Check API request headers include tenant ID
- Ensure database migrations have been applied

#### Migration Issues

- Run migration with `--dry-run` first
- Check database constraints and foreign keys
- Verify all models have been updated with tenant fields

### Debug Commands

```bash
# Check entity status
python3 manage.py shell
>>> from tenants.models import Tenant
>>> Tenant.objects.all()

# Verify user profiles
>>> from tenants.models import UserProfile
>>> UserProfile.objects.all()

# Check data migration
python3 manage.py migrate_to_tenants --dry-run
```

## Future Enhancements

### Planned Features

1. **Cross-Entity Sharing**: Allow sharing of specific data between entities
2. **Advanced Permissions**: Role-based permissions within entities
3. **Entity Templates**: Pre-configured entity templates
4. **Bulk Operations**: Bulk entity management operations
5. **Audit Logging**: Entity-specific audit trails

### API Enhancements

1. **Entity Statistics**: Enhanced entity analytics
2. **Bulk Operations**: Bulk data operations per entity
3. **Export/Import**: Entity data export and import
4. **Webhooks**: Entity-specific webhook notifications

## Support

For technical support or questions about the multi-tenant implementation:

1. Check this documentation
2. Review the migration logs
3. Contact the development team
4. Create an issue in the project repository

---

_Last updated: January 2025_
