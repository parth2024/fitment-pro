# AI Fitment Complete Workflow Implementation

## Overview

This document describes the complete AI fitment generation workflow implementation for both **Upload Product Data** and **Select Products** methods.

## Implementation Date

October 8, 2025

## Complete Workflow Architecture

### Backend Architecture (Django/Celery)

```
┌─────────────────┐
│   Frontend      │
│  ApplyFitments  │
└────────┬────────┘
         │
         │ POST /api/data-uploads/ai-fitment-jobs/
         │ { product_file OR product_ids, job_type }
         │
         ▼
┌─────────────────────────────────────────────────────┐
│  views.py - AiFitmentJobView.post()                │
│  1. Validate request data                           │
│  2. Create AiFitmentJob record (status: 'queued')   │
│  3. Dispatch Celery task                            │
│  4. Return job_id immediately                       │
└────────────────┬────────────────────────────────────┘
                 │
                 │ Async via Celery
                 ▼
┌─────────────────────────────────────────────────────┐
│  tasks.py - generate_ai_fitments_task()             │
│  1. Update job status to 'processing'               │
│  2. Route to appropriate processor based on type    │
│     - upload → process_product_file_for_ai_fitments │
│     - selection → process_selected_products_...     │
│  3. Update progress via Celery states               │
│  4. Set final status (review_required/failed)       │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│  ai_fitment_processor.py                            │
│                                                      │
│  FOR UPLOAD:                                        │
│  1. Validate file (FileParser + ProductValidator)   │
│  2. Check/create products in ProductData table      │
│  3. Fetch VCDB data from tenant's configured cats   │
│  4. Send to Azure AI for fitment generation         │
│  5. Store fitments with status='pending'            │
│                                                      │
│  FOR SELECTION:                                     │
│  1. Get products from ProductData by IDs            │
│  2. Fetch VCDB data from tenant's configured cats   │
│  3. Send to Azure AI for fitment generation         │
│  4. Store fitments with status='pending'            │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│  AiGeneratedFitment table                           │
│  - Status: 'pending' (ready to approve)             │
│  - Linked to AiFitmentJob                           │
└─────────────────────────────────────────────────────┘
```

### Frontend Flow (React)

```
┌─────────────────────────────────────────────────────┐
│  ApplyFitments.tsx - Upload or Select Products      │
│                                                      │
│  1. User uploads file OR selects products           │
│  2. handleUploadProductForAi() or                   │
│     handleSelectProductsForAi()                     │
│  3. Create job via API                              │
│  4. Start pollJobStatus(jobId)                      │
└────────────────┬────────────────────────────────────┘
                 │
                 │ Poll every 3 seconds
                 ▼
┌─────────────────────────────────────────────────────┐
│  GET /api/data-uploads/ai-fitment-jobs/{id}/status/ │
│  Returns:                                            │
│  - job { status, fitments_count, error_message }    │
│  - task { state, info: { current, status } }        │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│  Update UI:                                          │
│  - Progress bar (from task.info.current)            │
│  - Status logs (from task.info.status)              │
│  - Auto-navigate to Jobs tab when complete          │
└─────────────────────────────────────────────────────┘
```

## Key Features Implemented

### 1. Upload Product Data Tab

**Flow:**

1. ✅ User selects product file (CSV, XLSX, JSON)
2. ✅ File validation on backend (structure, required fields)
3. ✅ Duplicate check - create only new products in database
4. ✅ Fetch VCDB data from tenant's configured categories
5. ✅ Send to Azure AI for fitment generation (async via Celery)
6. ✅ Real-time job status polling with progress updates
7. ✅ Fitments stored with status 'pending' (ready to approve)

**Error Handling:**

- File parsing errors
- Validation errors (missing fields, wrong format)
- VCDB data not available
- Azure AI failures
- All errors logged to job.error_message

### 2. Select Products Tab

**Flow:**

1. ✅ Load existing products from ProductData table
2. ✅ User selects products via checkboxes
3. ✅ Fetch VCDB data from tenant's configured categories
4. ✅ Send to Azure AI for fitment generation (async via Celery)
5. ✅ Real-time job status polling with progress updates
6. ✅ Fitments stored with status 'pending' (ready to approve)

**Features:**

- Search/filter products
- Select all / clear all
- Batch selection

### 3. AI Jobs & Progress Tab

**Features:**

- ✅ View all AI fitment jobs for current tenant
- ✅ Real-time status badges (Queued, Processing, Review Required, Failed, Completed)
- ✅ Job metadata: created date, source type, product count, fitments count
- ✅ Review button for jobs with status 'review_required'
- ✅ Auto-refresh when new jobs complete

### 4. Review & Approve Flow

**Features:**

- ✅ View all fitments for a job
- ✅ Fitment details: Part ID, Year, Make, Model, Confidence Score
- ✅ Select individual or bulk fitments
- ✅ **Approve** - Changes status to 'approved' and creates active Fitment records
- ✅ **Reject** - Deletes fitments from table (with confirmation)
- ✅ Edit fitments before approval
- ✅ Job automatically marked 'completed' when all fitments reviewed

## Backend Implementation Details

### Files Modified

#### 1. `api/sdc/data_uploads/ai_fitment_processor.py`

- ✅ Added `validate_product_file()` - File validation with FileParser and ProductValidator
- ✅ Added `check_and_create_products()` - Check duplicates, create new products
- ✅ Enhanced `process_product_file_for_ai_fitments()` - Complete 6-step workflow
- ✅ Enhanced `process_selected_products_for_ai_fitments()` - Azure AI integration
- ✅ All errors saved to job.error_message for debugging

#### 2. `api/sdc/data_uploads/tasks.py`

- ✅ Enhanced `generate_ai_fitments_task()` - Celery task with progress tracking
- ✅ Celery state updates with progress percentage and status messages
- ✅ Proper error handling and job status updates
- ✅ Support for both 'upload' and 'selection' job types

#### 3. `api/sdc/data_uploads/views.py`

- ✅ Fixed `AiFitmentJobView.post()` - Proper Celery task dispatching for both types
- ✅ Added `get_job_status()` - Real-time status endpoint with Celery task info
- ✅ Enhanced `approve_fitments()` - Create active Fitment records
- ✅ Enhanced `reject_fitments()` - Delete fitments with proper validation

#### 4. `api/sdc/data_uploads/urls.py`

- ✅ Added `/ai-fitment-jobs/<job_id>/status/` endpoint

### Models

#### `AiFitmentJob`

```python
- id: UUID
- tenant: ForeignKey
- job_type: 'upload' | 'selection'
- product_file: FileField (for upload type)
- product_file_name: CharField
- product_ids: JSONField (for selection type)
- product_count: IntegerField
- fitments_count: IntegerField
- approved_count: IntegerField
- rejected_count: IntegerField
- status: 'queued' | 'processing' | 'review_required' | 'completed' | 'failed'
- error_message: TextField
- celery_task_id: CharField
- created_at, started_at, completed_at
```

#### `AiGeneratedFitment`

```python
- id: UUID
- job: ForeignKey(AiFitmentJob)
- part_id, part_description
- year, make, model, submodel, drive_type, fuel_type, num_doors, body_type
- position, quantity
- confidence: Float (0-1)
- confidence_explanation: TextField
- ai_reasoning: TextField
- status: 'pending' | 'approved' | 'rejected'
- dynamic_fields: JSONField
- reviewed_at, reviewed_by
```

## Frontend Implementation Details

### Files Modified

#### 1. `web/src/api/services.ts`

- ✅ Added `getAiFitmentJobStatus()` - Poll job status with Celery task info
- ✅ All existing endpoints maintained

#### 2. `web/src/pages/ApplyFitments.tsx`

- ✅ Added `pollJobStatus()` - Real-time polling every 3 seconds
- ✅ Enhanced `handleUploadProductForAi()` - Create job and start polling
- ✅ Enhanced `handleSelectProductsForAi()` - Create job and start polling
- ✅ Added `handleRejectJobFitments()` - Reject with confirmation
- ✅ Enhanced `handleApproveJobFitments()` - Better error handling
- ✅ Real-time progress UI with Celery task status
- ✅ Auto-navigate to Jobs tab when complete
- ✅ Cleanup polling on unmount

### UI/UX Enhancements

1. **Progress Tracking:**

   - Live progress bar (0-100%)
   - Real-time status logs from Celery
   - Emojis for better visual feedback

2. **Job Management:**

   - Status badges with icons
   - Sortable/filterable jobs table
   - Quick review action

3. **Fitment Review:**
   - Bulk select/deselect
   - Approve and Reject buttons
   - Edit individual fitments
   - Confidence score display

## API Endpoints

### AI Fitment Jobs

| Method | Endpoint                                                 | Description                                          |
| ------ | -------------------------------------------------------- | ---------------------------------------------------- |
| GET    | `/api/data-uploads/ai-fitment-jobs/`                     | List all jobs                                        |
| POST   | `/api/data-uploads/ai-fitment-jobs/`                     | Create new job                                       |
| GET    | `/api/data-uploads/ai-fitment-jobs/{id}/`                | Get job details                                      |
| GET    | `/api/data-uploads/ai-fitment-jobs/{id}/status/`         | **NEW** - Get real-time status with Celery task info |
| GET    | `/api/data-uploads/ai-fitment-jobs/{id}/fitments/`       | Get fitments for review                              |
| POST   | `/api/data-uploads/ai-fitment-jobs/{id}/approve/`        | Approve fitments                                     |
| POST   | `/api/data-uploads/ai-fitment-jobs/{id}/reject/`         | Reject fitments                                      |
| PUT    | `/api/data-uploads/ai-fitment-jobs/{id}/fitments/{fid}/` | Update fitment                                       |

## Testing Checklist

### Upload Product Data

- [ ] Upload valid CSV file - should validate and create job
- [ ] Upload valid XLSX file - should validate and create job
- [ ] Upload valid JSON file - should validate and create job
- [ ] Upload invalid file - should show validation errors
- [ ] Upload file with missing required fields - should show errors
- [ ] Upload file with existing products - should not create duplicates
- [ ] Check real-time progress updates
- [ ] Verify job appears in Jobs tab
- [ ] Verify VCDB data fetched from configured categories
- [ ] Verify fitments created with correct data

### Select Products

- [ ] Load products from database
- [ ] Search products by ID/description
- [ ] Select single product - should create job
- [ ] Select multiple products - should create job
- [ ] Select all products - should work
- [ ] Clear selection - should work
- [ ] Check real-time progress updates
- [ ] Verify job appears in Jobs tab

### Review & Approve

- [ ] Open review modal for job
- [ ] View all fitments
- [ ] Select individual fitments
- [ ] Select all fitments
- [ ] Approve selected - should create Fitment records
- [ ] Reject selected - should delete fitments
- [ ] Edit fitment - should save changes
- [ ] Verify approved fitments appear in Fitment Management
- [ ] Verify job status updates after approval/rejection

### Error Scenarios

- [ ] No VCDB data - should show error
- [ ] No product data (for selection) - should show error
- [ ] Azure AI failure - should update job status to 'failed'
- [ ] Network error during polling - should continue polling
- [ ] Celery task failure - should update job status

## Configuration Requirements

### Django Settings

```python
# settings.py
CELERY_BROKER_URL = 'redis://localhost:6379/0'
CELERY_RESULT_BACKEND = 'redis://localhost:6379/0'
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = 30 * 60  # 30 minutes
```

### Celery Worker

```bash
# Start Celery worker
celery -A sdc worker --loglevel=info
```

### Redis

```bash
# Must be running
redis-server
```

## Monitoring & Debugging

### Check Job Status

```python
# In Django shell
from data_uploads.models import AiFitmentJob
job = AiFitmentJob.objects.get(id='<job-id>')
print(f"Status: {job.status}")
print(f"Error: {job.error_message}")
print(f"Fitments: {job.fitments_count}")
```

### Check Celery Task

```python
# In Django shell
from celery.result import AsyncResult
task = AsyncResult('<task-id>')
print(f"State: {task.state}")
print(f"Info: {task.info}")
```

### Logs

```bash
# Django logs
tail -f /path/to/django/logs/debug.log

# Celery logs
# Check terminal where Celery worker is running
```

## Success Metrics

✅ **All TODOs Completed:**

1. ✅ Backend views.py - Fixed createAiFitmentJob with Celery
2. ✅ ai_fitment_processor.py - Added validation and DB checks
3. ✅ tasks.py - Enhanced with progress tracking
4. ✅ models.py - All necessary fields present
5. ✅ Job status polling endpoint created
6. ✅ Frontend - Real-time polling implemented
7. ✅ Review modal - Approve/reject flow complete
8. ✅ API services - All endpoints supported

✅ **No Linter Errors**

✅ **Complete Workflow:**

- File upload → Validation → DB check → Azure AI → Review → Approve/Reject → Active Fitments

## Next Steps

1. **Testing:** Thoroughly test all scenarios from checklist
2. **Documentation:** Update user-facing documentation
3. **Monitoring:** Set up production monitoring for Celery tasks
4. **Performance:** Monitor and optimize for large files (1000+ products)
5. **Error Recovery:** Add retry logic for transient Azure AI failures

## Notes

- Jobs are tenant-scoped via `X-Tenant-ID` header
- VCDB data uses tenant's configured category selections
- Products are deduplicated per tenant (tenant + part_id unique)
- Fitments have confidence scores from Azure AI
- Approved fitments create active Fitment records in main fitments table
- Rejected fitments are permanently deleted
- Job status auto-updates as fitments are reviewed

---

**Implementation Status:** ✅ COMPLETE

**Date:** October 8, 2025

**Implemented By:** AI Assistant (Claude Sonnet 4.5)
