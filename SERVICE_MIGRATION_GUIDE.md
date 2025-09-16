# Service Migration Guide

This guide explains how to migrate from scattered API calls to the centralized service architecture.

## Overview

The new centralized service architecture provides:

- **Consistent API patterns** across the application
- **Centralized error handling** and logging
- **Type-safe API calls** with proper TypeScript support
- **Easier testing** and maintenance
- **Better caching** and performance optimization

## Migration Steps

### Step 1: Import the Services

**Before:**

```typescript
// Scattered fetch calls throughout components
const response = await fetch("/api/field-config/fields/");
const data = await response.json();
```

**After:**

```typescript
import { services } from "../api/services";

// Use centralized services
const data = await services.fieldConfig.getFields();
```

### Step 2: Replace Direct Fetch Calls

#### Field Configuration API Calls

**Before:**

```typescript
// Fetch fields
const response = await fetch("/api/field-config/fields/?reference_type=vcdb");
const fields = await response.json();

// Create field
const response = await fetch("/api/field-config/fields/", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(fieldData),
});

// Update field
const response = await fetch(`/api/field-config/fields/${id}/`, {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(fieldData),
});

// Delete field
const response = await fetch(`/api/field-config/fields/${id}/`, {
  method: "DELETE",
});
```

**After:**

```typescript
// Fetch fields
const fields = await services.fieldConfig.getFields({ reference_type: "vcdb" });

// Create field
await services.fieldConfig.createField(fieldData);

// Update field
await services.fieldConfig.updateField(id, fieldData);

// Delete field
await services.fieldConfig.deleteField(id);
```

#### Data Upload API Calls

**Before:**

```typescript
// Upload file
const formData = new FormData();
formData.append("vcdb_file", file);
const response = await fetch("/api/data-uploads/sessions/123/upload-vcdb/", {
  method: "POST",
  body: formData,
});
```

**After:**

```typescript
// Upload file
await services.dataUpload.uploadVcdbFile("123", file);
```

#### Fitment API Calls

**Before:**

```typescript
// Get fitments with filters
const params = new URLSearchParams({ year: "2023", make: "Toyota" });
const response = await fetch(`/api/fitments/?${params}`);
const fitments = await response.json();
```

**After:**

```typescript
// Get fitments with filters
const fitments = await services.fitment.getFitments({
  year: 2023,
  make: "Toyota",
});
```

### Step 3: Update Error Handling

**Before:**

```typescript
try {
  const response = await fetch("/api/field-config/fields/");
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  const data = await response.json();
} catch (error) {
  console.error("API Error:", error);
  // Handle error...
}
```

**After:**

```typescript
try {
  const data = await services.fieldConfig.getFields();
} catch (error) {
  console.error("API Error:", error);
  // Error handling is consistent across all services
}
```

### Step 4: Update Component State Management

**Before:**

```typescript
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

const fetchData = async () => {
  setLoading(true);
  try {
    const response = await fetch("/api/field-config/fields/");
    if (!response.ok) throw new Error("Failed to fetch");
    const data = await response.json();
    setFields(data.results || data);
  } catch (error) {
    setError(error.message);
  } finally {
    setLoading(false);
  }
};
```

**After:**

```typescript
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

const fetchData = async () => {
  setLoading(true);
  try {
    const data = await services.fieldConfig.getFields();
    setFields(data.results || data);
  } catch (error) {
    setError(error.message);
  } finally {
    setLoading(false);
  }
};
```

## Service Reference

### Field Configuration Service

```typescript
// Get all fields with optional filtering
await services.fieldConfig.getFields({
  reference_type: "vcdb", // 'vcdb' | 'product' | 'both'
  requirement_level: "required", // 'required' | 'optional' | 'disabled'
  is_enabled: true,
  field_type: "string",
  search: "search term",
  ordering: "display_order",
});

// Get specific field
await services.fieldConfig.getField(id);

// Create field
await services.fieldConfig.createField({
  name: "field_name",
  display_name: "Field Name",
  field_type: "string",
  reference_type: "vcdb",
  requirement_level: "optional",
  // ... other field properties
});

// Update field
await services.fieldConfig.updateField(id, fieldData);

// Delete field
await services.fieldConfig.deleteField(id);

// Toggle field enabled status
await services.fieldConfig.toggleField(id);

// Get form fields for rendering
await services.fieldConfig.getFormFields("vcdb");

// Get filter fields for rendering
await services.fieldConfig.getFilterFields("product");

// Validate data
const result = await services.fieldConfig.validateFieldData("vcdb", {
  year: 2023,
  make: "Toyota",
  model: "RAV4",
});

// Get validation rules
const rules = await services.fieldConfig.getValidationRules("vcdb");
```

### Data Upload Service

```typescript
// Get upload sessions
await services.dataUpload.getUploadSessions();

// Create upload session
await services.dataUpload.createUploadSession({
  name: "Session Name",
  description: "Session Description",
});

// Get upload session details
await services.dataUpload.getUploadSession(sessionId);

// Upload VCDB file
await services.dataUpload.uploadVcdbFile(sessionId, file);

// Upload Product file
await services.dataUpload.uploadProductFile(sessionId, file);

// Validate uploaded files
await services.dataUpload.validateFiles(sessionId);

// Process uploaded data
await services.dataUpload.processData(sessionId);

// Get processing status
await services.dataUpload.getProcessingStatus(sessionId);
```

### Fitment Service

```typescript
// Get fitments with filtering
await services.fitment.getFitments({
  search: "search term",
  year: 2023,
  make: "Toyota",
  model: "RAV4",
  part_id: "PART123",
  page: 1,
  page_size: 50,
  ordering: "-created_at",
});

// Get specific fitment
await services.fitment.getFitment(fitmentHash);

// Create fitment
await services.fitment.createFitment({
  part_id: "PART123",
  year: 2023,
  make: "Toyota",
  model: "RAV4",
  position: "Front",
  quantity: 1,
});

// Update fitment
await services.fitment.updateFitment(fitmentHash, fitmentData);

// Delete fitment
await services.fitment.deleteFitment(fitmentHash);

// Get filter options
await services.fitment.getFilterOptions();

// Export fitments
await services.fitment.exportFitments("csv", { year: 2023 });
await services.fitment.exportFitments("xlsx", { make: "Toyota" });
```

### VCDB Service

```typescript
// Get VCDB data with filtering
await services.vcdb.getVcdbData({
  year: 2023,
  make: "Toyota",
  model: "RAV4",
  submodel: "XLE",
  drive_type: "AWD",
  fuel_type: "Gas",
  body_type: "SUV",
  search: "search term",
  page: 1,
  page_size: 50,
  ordering: "year",
});

// Get filter options
await services.vcdb.getFilterOptions();

// Get year range
await services.vcdb.getYearRange();

// Get configurations
await services.vcdb.getConfigurations({
  year: 2023,
  make: "Toyota",
});
```

### Product Service

```typescript
// Get products with filtering
await services.product.getProducts({
  part_id: "PART123",
  category: "Wheels",
  part_type: "Rim",
  brand: "Toyota",
  search: "search term",
  page: 1,
  page_size: 50,
  ordering: "part_id",
});

// Get specific product
await services.product.getProduct(partId);

// Create product
await services.product.createProduct({
  part_id: "PART123",
  description: "Product Description",
  category: "Wheels",
  brand: "Toyota",
});

// Update product
await services.product.updateProduct(partId, productData);

// Delete product
await services.product.deleteProduct(partId);

// Get filter options
await services.product.getFilterOptions();
```

### Analytics Service

```typescript
// Get dashboard analytics
await services.analytics.getDashboard();

// Get coverage analytics
await services.analytics.getCoverage({
  year: 2023,
  make: "Toyota",
});

// Get detailed coverage
await services.analytics.getDetailedCoverage({
  group_by: "make",
  period: "monthly",
});

// Get coverage trends
await services.analytics.getCoverageTrends({
  start_date: "2023-01-01",
  end_date: "2023-12-31",
});

// Get coverage gaps
await services.analytics.getCoverageGaps({
  threshold: 0.8,
});
```

### AI Fitment Service

```typescript
// Generate AI fitments
await services.aiFitment.generateFitments(sessionId, {
  confidence_threshold: 0.8,
  max_results: 100,
});

// Apply fitments batch
await services.aiFitment.applyFitmentsBatch([
  {
    part_id: "PART123",
    year: 2023,
    make: "Toyota",
    model: "RAV4",
    confidence: 0.95,
  },
]);

// Get potential fitments
await services.aiFitment.getPotentialFitments(partId);

// Apply potential fitments
await services.aiFitment.applyPotentialFitments([
  {
    part_id: "PART123",
    vehicle_configs: ["config1", "config2"],
  },
]);
```

## Benefits of Migration

### 1. **Consistency**

- All API calls follow the same pattern
- Consistent error handling across the application
- Uniform response format handling

### 2. **Maintainability**

- Centralized API logic makes updates easier
- Single place to modify API endpoints or add new functionality
- Easier to add features like caching, retries, or logging

### 3. **Type Safety**

- Full TypeScript support with proper typing
- IDE autocomplete and error checking
- Compile-time validation of API calls

### 4. **Error Handling**

- Consistent error messages and handling
- Centralized logging and monitoring
- Better debugging and troubleshooting

### 5. **Performance**

- Built-in caching mechanisms
- Optimized request handling
- Reduced code duplication

## Testing

The centralized services make testing easier:

```typescript
// Mock the services for testing
jest.mock("../api/services", () => ({
  services: {
    fieldConfig: {
      getFields: jest.fn(),
      createField: jest.fn(),
      updateField: jest.fn(),
      deleteField: jest.fn(),
    },
  },
}));

// In your tests
import { services } from "../api/services";

test("should load fields", async () => {
  const mockFields = [{ id: 1, name: "test" }];
  services.fieldConfig.getFields.mockResolvedValue(mockFields);

  // Test your component logic
});
```

## Migration Checklist

- [ ] Import services in components that make API calls
- [ ] Replace direct fetch calls with service methods
- [ ] Update error handling to use consistent patterns
- [ ] Remove unused fetch-related imports
- [ ] Update tests to mock services instead of fetch
- [ ] Verify all API functionality still works
- [ ] Update documentation and comments

## Common Patterns

### Loading States

```typescript
const [loading, setLoading] = useState(false);

const handleAction = async () => {
  setLoading(true);
  try {
    await services.fieldConfig.createField(data);
    // Handle success
  } catch (error) {
    // Handle error
  } finally {
    setLoading(false);
  }
};
```

### Error Handling

```typescript
try {
  const data = await services.fieldConfig.getFields();
  setFields(data.results || data);
} catch (error) {
  console.error("Failed to load fields:", error);
  showError(error.message || "Failed to load fields");
}
```

### Conditional API Calls

```typescript
const loadData = async () => {
  if (!shouldLoad) return;

  try {
    const data = await services.fieldConfig.getFields(params);
    setData(data);
  } catch (error) {
    // Handle error
  }
};
```

This migration will significantly improve the maintainability and consistency of your API layer while providing better developer experience and error handling.
