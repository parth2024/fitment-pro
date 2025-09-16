# Field Configuration System Guide

This guide explains how to use the dynamic field configuration system for VCDB and Product data validation and form generation.

## Overview

The field configuration system allows you to:

- Define custom fields for VCDB (Vehicle Configuration Database) and Product data
- Set validation rules (required/optional, min/max values, length limits, etc.)
- Control where fields appear (forms, filters, or both)
- Enable/disable fields dynamically
- Track field configuration changes with history

## Backend Components

### Models

#### FieldConfiguration

- **name**: Internal field name (used as column name)
- **display_name**: Human-readable label for forms
- **field_type**: Type of field (string, number, boolean, enum, date, text, decimal, integer)
- **reference_type**: Where field applies (vcdb, product, both)
- **requirement_level**: Required, optional, or disabled
- **validation_rules**: Min/max values, length limits, enum options
- **display_options**: Show in forms, filters, display order

#### FieldConfigurationHistory

- Tracks all changes to field configurations
- Records who made changes and when
- Stores old and new values for audit trail

### API Endpoints

```
GET /api/field-config/fields/                    # List all field configurations
POST /api/field-config/fields/                   # Create new field configuration
GET /api/field-config/fields/{id}/               # Get specific field configuration
PUT /api/field-config/fields/{id}/               # Update field configuration
DELETE /api/field-config/fields/{id}/            # Delete field configuration
POST /api/field-config/fields/{id}/toggle_enabled/ # Enable/disable field

GET /api/field-config/form-fields/?reference_type=vcdb    # Get form fields for VCDB
GET /api/field-config/filter-fields/?reference_type=product # Get filter fields for Product
POST /api/field-config/validate-data/            # Validate data against configuration
GET /api/field-config/validation-rules/?reference_type=vcdb # Get validation rules
```

### Validation Logic

The system provides comprehensive validation:

- **Required fields**: Must have values, validation enforced during uploads
- **Optional fields**: Can be empty, validation applied if value provided
- **Disabled fields**: Hidden from forms, no validation applied

Field types supported:

- **String/Text**: Length validation, required checks
- **Number/Decimal/Integer**: Range validation, numeric type checking
- **Boolean**: True/false validation
- **Enum**: Must match one of predefined options
- **Date**: Date format validation

## Frontend Components

### Services

#### fieldConfigService

```typescript
// Get form fields for rendering
const formFields = await fieldConfigService.getFormFields("vcdb");

// Get filter fields
const filterFields = await fieldConfigService.getFilterFields("product");

// Validate data
const result = await fieldConfigService.validateFieldData("vcdb", formData);

// Get validation rules
const rules = await fieldConfigService.getValidationRules("product");
```

### Hooks

#### useFieldConfiguration

```typescript
const {
  fields,
  formFields,
  filterFields,
  loading,
  error,
  validateData,
  refreshFields,
} = useFieldConfiguration({
  referenceType: "vcdb",
  autoLoad: true,
  validateOnChange: false,
});
```

#### useFormWithFieldValidation

```typescript
const {
  formData,
  formFields,
  validationErrors,
  updateFormData,
  validateFormData,
  isFieldRequired,
} = useFormWithFieldValidation("vcdb", initialValues);
```

#### useFilterWithFieldConfiguration

```typescript
const {
  activeFilters,
  filterFields,
  hasActiveFilters,
  updateFilters,
  clearFilters,
  setFilterValue,
} = useFilterWithFieldConfiguration("vcdb", onFilterChange);
```

### Components

#### DynamicFieldForm

Renders forms based on field configuration:

```typescript
<DynamicFieldForm
  referenceType="vcdb"
  initialValues={formData}
  onSubmit={handleSubmit}
  onValidate={validateData}
  loading={loading}
  showValidationErrors={true}
/>
```

#### DynamicFieldFilter

Renders filters based on field configuration:

```typescript
<DynamicFieldFilter
  referenceType="vcdb"
  onFilter={handleFilter}
  onClear={handleClear}
  loading={loading}
  showAdvancedToggle={true}
/>
```

## Usage Examples

### 1. Vehicle Filter Form

Replace static form fields with dynamic configuration:

```typescript
// Before (static)
<TextInput label="Make" value={make} onChange={setMake} />
<NumberInput label="Year" value={year} onChange={setYear} />

// After (dynamic)
<DynamicFieldFilter
  referenceType="vcdb"
  onFilter={applyFilters}
  onClear={clearFilters}
/>
```

### 2. Product Fitment Form

Use dynamic form for fitment details:

```typescript
<DynamicFieldForm
  referenceType="product"
  initialValues={fitmentData}
  onSubmit={createFitment}
  onValidate={validateFitment}
/>
```

### 3. Data Upload Validation

The system automatically validates uploaded data:

```python
# Backend validation
from field_config.utils import validate_vcdb_data, validate_product_data

is_valid, errors = validate_vcdb_data(uploaded_data)
if not is_valid:
    # Handle validation errors
    for field, field_errors in errors.items():
        print(f"{field}: {field_errors}")
```

## Configuration Workflow

### 1. Access Settings

Navigate to the Settings tab in the application.

### 2. Configure VCDB Fields

- Go to "VCDB Fields" tab
- Click "Add VCDB Field"
- Configure field properties:
  - **Name**: Internal identifier (e.g., `engine_type`)
  - **Display Name**: User-friendly label (e.g., `Engine Type`)
  - **Field Type**: Choose from string, number, boolean, enum, etc.
  - **Requirement Level**: Required, optional, or disabled
  - **Validation Rules**: Min/max values, length limits, enum options
  - **Display Options**: Show in forms, filters, display order

### 3. Configure Product Fields

- Go to "Product Fields" tab
- Click "Add Product Field"
- Configure similar to VCDB fields

### 4. Test Configuration

- Use the Manual Fitment page to test vehicle filters
- Check that required fields are enforced
- Verify optional fields work correctly
- Test validation rules

## Field Types and Validation

### String Fields

- **min_length**: Minimum character count
- **max_length**: Maximum character count
- **default_value**: Default text value

### Numeric Fields (Number, Decimal, Integer)

- **min_value**: Minimum allowed value
- **max_value**: Maximum allowed value
- **default_value**: Default numeric value

### Boolean Fields

- **default_value**: Default true/false value

### Enum Fields

- **enum_options**: Array of allowed values
- **default_value**: Default selected option

### Date Fields

- **default_value**: Default date value

## Best Practices

### Field Naming

- Use descriptive, lowercase names with underscores
- Examples: `engine_type`, `part_category`, `fuel_type`
- Avoid spaces and special characters

### Validation Rules

- Set reasonable min/max values for numeric fields
- Use enum options for controlled vocabularies
- Set appropriate length limits for text fields

### Display Configuration

- Order fields logically (most important first)
- Use clear, user-friendly display names
- Provide helpful descriptions

### Requirement Levels

- **Required**: Fields that must always have values
- **Optional**: Fields that can be empty but validated if provided
- **Disabled**: Fields that are hidden and not validated

## Integration Points

### Data Upload

- VCDB file uploads validate against VCDB field configuration
- Product file uploads validate against Product field configuration
- Required fields must be present in uploaded files
- Optional fields are validated if present

### Manual Fitment

- Vehicle filter uses VCDB field configuration
- Fitment details form uses Product field configuration
- Dynamic validation based on current configuration

### Bulk Upload

- Same validation rules apply to bulk operations
- Configuration changes affect all upload methods

### AI Fitment Generation

- Generated fitments respect field configuration
- Required fields are enforced before applying fitments
- Optional fields can be edited during review

## Troubleshooting

### Common Issues

1. **Fields not appearing in forms**

   - Check if field is enabled (`is_enabled = true`)
   - Verify `show_in_forms = true`
   - Ensure field is not disabled (`requirement_level != 'disabled'`)

2. **Validation not working**

   - Check field configuration is saved
   - Verify validation rules are properly set
   - Clear browser cache and reload

3. **Required fields not enforced**

   - Confirm `requirement_level = 'required'`
   - Check field is enabled
   - Verify validation is being called

4. **Upload validation failing**
   - Check uploaded file has required columns
   - Verify column names match field names
   - Review validation error messages

### Debugging

1. **Check field configuration**

   ```typescript
   const fields = await fieldConfigService.getFormFields("vcdb");
   console.log("VCDB fields:", fields);
   ```

2. **Validate data manually**

   ```typescript
   const result = await fieldConfigService.validateFieldData("vcdb", testData);
   console.log("Validation result:", result);
   ```

3. **Check validation rules**
   ```typescript
   const rules = await fieldConfigService.getValidationRules("vcdb");
   console.log("Validation rules:", rules);
   ```

## Migration from Static Forms

### Step 1: Identify Static Forms

- Find forms with hardcoded fields
- Document current validation logic
- Note field requirements and types

### Step 2: Create Field Configurations

- Add fields to Settings → VCDB Fields or Product Fields
- Set appropriate validation rules
- Configure display options

### Step 3: Replace Static Components

- Replace static form components with DynamicFieldForm
- Replace static filters with DynamicFieldFilter
- Update form submission logic

### Step 4: Test Integration

- Verify all fields appear correctly
- Test validation rules
- Confirm data submission works

### Step 5: Clean Up

- Remove old static form code
- Update API calls if needed
- Update documentation

This system provides a flexible, maintainable way to manage form fields and validation across the application while maintaining a professional user experience.
