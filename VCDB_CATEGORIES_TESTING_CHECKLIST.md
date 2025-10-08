# VCDB Categories Integration - Testing Checklist

## Pre-Testing Setup

### ✅ 1. Database Migration

- [ ] Run Django migrations to ensure all models are up-to-date
  ```bash
  cd api/sdc
  python manage.py migrate
  ```

### ✅ 2. Restart Backend Server

- [ ] Restart the Django server to load updated code
  ```bash
  python manage.py runserver
  ```

---

## Test Case 1: Upload Global VCDB Categories

### Steps:

1. [ ] Navigate to **Global VCDB Categories** page
2. [ ] Click **"Create New VCDB Category"**
3. [ ] Fill in form:
   - Name: "Test Light Duty"
   - Description: "Test category for light duty trucks"
   - File: Upload a VCDB CSV/JSON file with vehicles
4. [ ] Click **Save**
5. [ ] Verify category appears in list
6. [ ] Check category shows:
   - ✓ Green "Valid" badge
   - ✓ Record count > 0

### Expected Result:

✅ Category created successfully  
✅ VCDB data parsed and stored  
✅ No validation errors

### Database Verification:

```sql
SELECT * FROM vcdb_categories_vcdbcategory WHERE name = 'Test Light Duty';
SELECT COUNT(*) FROM vcdb_categories_vcdbdata WHERE category_id = '<category-uuid>';
```

---

## Test Case 2: Configure Entity with VCDB Categories

### Steps:

1. [ ] Navigate to **Entity Management**
2. [ ] Click **Edit** on test entity
3. [ ] Scroll to **"VCDB Configuration"** section
4. [ ] In **"VCDB Categories"** multi-select dropdown:
   - [ ] Select "Test Light Duty"
   - [ ] Optionally select additional categories
5. [ ] Click **Save Changes**
6. [ ] Verify success toast appears

### Expected Result:

✅ Entity settings saved  
✅ Selected categories stored in `fitment_settings.vcdb_categories`

### Database Verification:

```sql
SELECT fitment_settings FROM tenants_tenant WHERE name = 'Your Test Entity';
-- Should show: {"vcdb_categories": ["uuid-1", "uuid-2", ...]}
```

---

## Test Case 3: Test Data Status Endpoint

### Steps:

1. [ ] Open browser DevTools → Network tab
2. [ ] Navigate to **Apply Fitments** page
3. [ ] Look for request to `/api/data-uploads/data-status/`
4. [ ] Check response

### Expected Result:

✅ Response shows VCDB data exists:

```json
{
  "vcdb": {
    "exists": true,
    "record_count": 150
  },
  "products": {
    "exists": true,
    "record_count": 50
  }
}
```

### Backend Log Verification:

```
Using global VCDB categories: ['uuid-1'] for tenant TestEntity
```

---

## Test Case 4: Test Dropdown Data Endpoint

### Steps:

1. [ ] Still on **Apply Fitments** page
2. [ ] Select **"Manual Fitment"** method
3. [ ] Check Network tab for `/api/data-uploads/dropdown-data/`
4. [ ] Verify response data

### Expected Result:

✅ Response contains vehicle data from selected categories:

```json
{
  "years": ["2020", "2021", "2022"],
  "makes": ["Ford", "Chevrolet", "Toyota"],
  "models": ["F-150", "Silverado", "Tundra"],
  ...
}
```

### Manual Verification:

- [ ] Years dropdown shows correct years
- [ ] Makes dropdown shows correct makes
- [ ] Models dropdown shows correct models
- [ ] All data is from selected VCDB categories

---

## Test Case 5: Test Vehicle Search (Filtered Vehicles)

### Steps:

1. [ ] On Apply Fitments → Manual Fitment
2. [ ] Fill in Step 1: Vehicle Search Criteria:
   - Year From: 2020
   - Year To: 2022
   - Make: (select one from dropdown)
3. [ ] Click **"Search Vehicles"**
4. [ ] Check Network tab for `/api/data-uploads/filtered-vehicles/`

### Expected Result:

✅ Request body:

```json
{
  "filters": {
    "yearFrom": "2020",
    "yearTo": "2022",
    "make": "Ford"
  }
}
```

✅ Response shows vehicles from selected categories only:

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

### Backend Log Verification:

```
Filtering vehicles from global VCDB categories: ['uuid-1']
```

---

## Test Case 6: Test Category Filtering

### Steps:

1. [ ] Upload 2 different VCDB categories with distinct data:
   - Category A: "Light Trucks" (Ford F-150, Chevy Silverado)
   - Category B: "Passenger Cars" (Honda Civic, Toyota Camry)
2. [ ] Configure Entity 1 to use only Category A
3. [ ] Configure Entity 2 to use only Category B
4. [ ] Login as Entity 1 user
5. [ ] Go to Apply Fitments → Manual Method
6. [ ] Check available makes/models
7. [ ] Switch to Entity 2
8. [ ] Check available makes/models

### Expected Result:

✅ Entity 1 sees ONLY: Ford F-150, Chevy Silverado  
✅ Entity 2 sees ONLY: Honda Civic, Toyota Camry  
✅ Data is properly isolated by category selection

---

## Test Case 7: Test Legacy Fallback (No Categories)

### Steps:

1. [ ] Create a new entity WITHOUT selecting VCDB categories
2. [ ] Upload VCDB file directly to this entity (legacy method)
3. [ ] Navigate to Apply Fitments
4. [ ] Verify data from direct upload is used

### Expected Result:

✅ Entity without categories uses direct uploads  
✅ Backend log shows:

```
Using tenant-specific VCDB data for tenant NewEntity
```

---

## Test Case 8: Test Multiple Categories

### Steps:

1. [ ] Configure entity with 3 categories selected
2. [ ] Go to Apply Fitments
3. [ ] Check that dropdown shows vehicles from ALL 3 categories

### Expected Result:

✅ Vehicles from all selected categories are combined  
✅ No duplicates  
✅ Proper filtering works

---

## Test Case 9: Test AI Fitments with Categories

### Steps:

1. [ ] Configure entity with VCDB categories
2. [ ] Go to Apply Fitments → AI Fitments
3. [ ] Upload product file or select products
4. [ ] Generate AI fitments
5. [ ] Review suggested fitments

### Expected Result:

✅ AI matches products to vehicles from selected categories only  
✅ No vehicles from other categories suggested

---

## Test Case 10: End-to-End Manual Fitment Creation

### Steps:

1. [ ] Configure entity with VCDB categories
2. [ ] Go to Apply Fitments → Manual Fitment
3. [ ] Step 1: Search for vehicles (e.g., 2020-2022 Ford)
4. [ ] Step 2: Select 2-3 vehicles
5. [ ] Step 3: Fill fitment details:
   - Part Type: "Wheel"
   - Position: "Front"
   - Quantity: 2
   - Title: "Test Fitment"
6. [ ] Click **"Apply Fitment"**
7. [ ] Verify success

### Expected Result:

✅ Fitments created successfully  
✅ All selected vehicles have fitments  
✅ Vehicles are from selected VCDB categories

---

## Regression Testing

### ✅ Test Existing Functionality Still Works

1. [ ] Entity with direct VCDB uploads (no categories)

   - Can still upload files
   - Can still create fitments
   - Legacy flow unchanged

2. [ ] Product uploads

   - Still works normally
   - No impact from VCDB changes

3. [ ] Fitment Management

   - View existing fitments
   - Edit fitments
   - Delete fitments

4. [ ] Other pages
   - Coverage page works
   - Analytics page works
   - Reports page works

---

## Performance Testing

### ✅ Check Query Performance

1. [ ] Test with large category (10,000+ vehicles)
2. [ ] Check dropdown load time < 3 seconds
3. [ ] Check vehicle search < 5 seconds
4. [ ] Monitor database query count

---

## Edge Cases

### ✅ Test Edge Scenarios

1. [ ] Entity selects category with NO data
   - Should show "No vehicles found" message
2. [ ] Entity deselects all categories

   - Should fall back to direct uploads

3. [ ] Category is deleted while entity has it selected

   - Should handle gracefully (show error or empty)

4. [ ] Multiple users from same entity

   - All see same filtered data
   - Concurrent access works

5. [ ] Switch between entities
   - Data updates correctly
   - No cache issues
   - Proper filtering per entity

---

## Final Verification

### ✅ Complete System Check

- [ ] All API endpoints return correct data
- [ ] Frontend shows correct filtered data
- [ ] Entity settings persist correctly
- [ ] No JavaScript console errors
- [ ] No Django server errors
- [ ] Backend logs show correct filtering messages
- [ ] Database queries are optimized
- [ ] User experience is smooth

---

## Sign-Off

| Test                | Status            | Notes |
| ------------------- | ----------------- | ----- |
| Upload Categories   | ⬜ Pass / ⬜ Fail |       |
| Configure Entity    | ⬜ Pass / ⬜ Fail |       |
| Data Status API     | ⬜ Pass / ⬜ Fail |       |
| Dropdown Data API   | ⬜ Pass / ⬜ Fail |       |
| Vehicle Search      | ⬜ Pass / ⬜ Fail |       |
| Category Filtering  | ⬜ Pass / ⬜ Fail |       |
| Legacy Fallback     | ⬜ Pass / ⬜ Fail |       |
| Multiple Categories | ⬜ Pass / ⬜ Fail |       |
| AI Fitments         | ⬜ Pass / ⬜ Fail |       |
| Manual Fitments     | ⬜ Pass / ⬜ Fail |       |
| Regression Tests    | ⬜ Pass / ⬜ Fail |       |
| Performance         | ⬜ Pass / ⬜ Fail |       |
| Edge Cases          | ⬜ Pass / ⬜ Fail |       |

---

## Rollback Plan

If issues are found:

1. Revert `api/sdc/data_uploads/views.py` changes
2. Restart Django server
3. Test legacy functionality
4. Report issues for fix

---

**Testing Date**: **\*\*\*\***\_**\*\*\*\***  
**Tested By**: **\*\*\*\***\_**\*\*\*\***  
**Overall Result**: ⬜ PASS / ⬜ FAIL  
**Notes**:

```




```
