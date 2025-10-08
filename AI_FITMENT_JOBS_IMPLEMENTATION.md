# AI Fitment Jobs Implementation Guide

## Overview

This document describes the new AI Fitment workflow with job tracking, review, and approval process implemented in the Apply Fitments page.

## Architecture

### Frontend Components

#### 1. Apply Fitments Page (`web/src/pages/ApplyFitments.tsx`)

The page has been completely restructured with the following flow:

```
Apply Fitments
├── Method Selection
│   ├── AI Fitments
│   │   ├── Upload Product Data
│   │   ├── Select Products
│   │   └── AI Jobs & Progress
│   └── Manual Fitment
│       ├── Vehicle Search
│       ├── Vehicle Selection
│       └── Fitment Details
```

### 2. AI Fitments Workflow

#### A. Upload Product Data Flow

1. User uploads a product file (CSV, XLSX, XLS, JSON)
2. System validates the product file
3. Product data is processed and stored in ProductData table
4. AI fitment job is created
5. AI processes the products and generates fitments
6. Job status changes to "review_required"
7. User reviews and approves fitments
8. Approved fitments move to Fitment Management

#### B. Select Products Flow

1. User browses existing products from ProductData table
2. User searches and selects specific products
3. User clicks "Generate AI Fitments"
4. AI fitment job is created with selected product IDs
5. AI processes and generates fitments
6. Job status changes to "review_required"
7. User reviews and approves fitments
8. Approved fitments move to Fitment Management

#### C. AI Jobs & Progress Tab

Displays a table of all AI fitment jobs with:

- **Date**: When the job was created
- **Created By**: User who created the job
- **Source**: File Upload or Product Selection
- **Products**: Number of products processed
- **Fitments**: Number of fitments generated
- **Status**:
  - `in_progress`: Job is currently being processed
  - `completed`: All fitments approved and moved to Fitment Management
  - `failed`: Job processing failed
  - `review_required`: Fitments ready for review and approval
- **Actions**: Review button for jobs requiring review

### 3. Review & Approval Workflow

When user clicks "Review" on a job:

1. Modal opens showing all generated fitments
2. User can:
   - Select/deselect individual fitments
   - Edit fitment details
   - Approve selected fitments
   - Close modal to continue later (progress is saved)
3. Upon approval:
   - Selected fitments are moved to Fitment Management table
   - Job status updates (completed if all approved)
   - User can return later to approve remaining fitments

### Backend API Endpoints (To Be Implemented)

#### AI Fitment Jobs Management

```python
# Get all AI fitment jobs
GET /api/ai-fitment-jobs/
Query Params: status, tenant_id
Response: [
  {
    "id": "job_123",
    "created_at": "2025-10-08T10:00:00Z",
    "created_by": "user@example.com",
    "product_file_name": "products.csv",  # For upload type
    "product_count": 150,
    "status": "review_required",
    "fitments_count": 450,
    "approved_count": 0,
    "rejected_count": 0,
    "job_type": "upload" | "selection"
  }
]

# Get specific job details
GET /api/ai-fitment-jobs/{job_id}/

# Create new AI fitment job
POST /api/ai-fitment-jobs/
Body: FormData {
  product_file: File (for upload type),
  product_ids: JSON string array (for selection type),
  job_type: "upload" | "selection"
}
Response: {
  "job_id": "job_123",
  "status": "in_progress",
  "message": "AI fitment generation started"
}

# Get fitments for review
GET /api/ai-fitment-jobs/{job_id}/fitments/
Query Params: page, page_size
Response: {
  "fitments": [
    {
      "id": "fit_1",
      "part_id": "PART001",
      "year": 2020,
      "make": "Toyota",
      "model": "RAV4",
      "submodel": "XLE",
      "drive_type": "AWD",
      "position": "Front",
      "quantity": 1,
      "confidence": 0.95,
      "confidence_explanation": "High confidence match",
      "ai_reasoning": "Exact OEM specifications match",
      "dynamicFields": {...}
    }
  ],
  "total": 450,
  "page": 1,
  "page_size": 100
}

# Approve fitments
POST /api/ai-fitment-jobs/{job_id}/approve/
Body: {
  "fitment_ids": ["fit_1", "fit_2", ...]  # If empty, approves all
}
Response: {
  "approved_count": 25,
  "message": "Fitments approved and moved to Fitment Management"
}

# Reject fitments
POST /api/ai-fitment-jobs/{job_id}/reject/
Body: {
  "fitment_ids": ["fit_1", "fit_2", ...]
}
Response: {
  "rejected_count": 5,
  "message": "Fitments rejected"
}

# Update individual fitment
PUT /api/ai-fitment-jobs/{job_id}/fitments/{fitment_id}/
Body: {
  "part_id": "PART002",
  "year": 2021,
  ... (any fitment fields)
}
```

### Database Schema (To Be Implemented)

```sql
-- AI Fitment Jobs Table
CREATE TABLE ai_fitment_jobs (
    id VARCHAR(50) PRIMARY KEY,
    tenant_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    product_file_name VARCHAR(255),
    product_count INTEGER,
    status VARCHAR(20) CHECK (status IN ('in_progress', 'completed', 'failed', 'review_required')),
    fitments_count INTEGER DEFAULT 0,
    approved_count INTEGER DEFAULT 0,
    rejected_count INTEGER DEFAULT 0,
    job_type VARCHAR(20) CHECK (job_type IN ('upload', 'selection')),
    error_message TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES entities(id)
);

-- AI Generated Fitments (Pending Approval)
CREATE TABLE ai_generated_fitments (
    id VARCHAR(50) PRIMARY KEY,
    job_id VARCHAR(50),
    part_id VARCHAR(255),
    year INTEGER,
    make VARCHAR(255),
    model VARCHAR(255),
    submodel VARCHAR(255),
    drive_type VARCHAR(100),
    position VARCHAR(100),
    quantity INTEGER,
    confidence DECIMAL(3, 2),
    confidence_explanation TEXT,
    ai_reasoning TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    dynamic_fields JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES ai_fitment_jobs(id)
);

-- Index for performance
CREATE INDEX idx_ai_jobs_tenant_status ON ai_fitment_jobs(tenant_id, status);
CREATE INDEX idx_ai_fitments_job_status ON ai_generated_fitments(job_id, status);
```

### Implementation Steps

#### Phase 1: Backend API Development

1. Create Django models for `AiFitmentJob` and `AiGeneratedFitment`
2. Create serializers for API responses
3. Implement job creation endpoint with file upload handling
4. Implement AI processing logic (can reuse existing AI fitment logic)
5. Implement review endpoints
6. Implement approve/reject endpoints that move fitments to main Fitment table

#### Phase 2: Frontend Integration

✅ **COMPLETED**

- Restructured Apply Fitments page
- Added AI Fitments sub-options (Upload, Select, Jobs)
- Implemented job listing UI
- Implemented review & approval modal
- Added progress tracking
- Cleaned up button styling

#### Phase 3: Testing & Deployment

- [ ] Test product file upload validation
- [ ] Test AI processing with real data
- [ ] Test review workflow (pause and resume)
- [ ] Test approval process
- [ ] Verify fitments appear in Fitment Management after approval
- [ ] Test multi-tenant isolation

## User Journey

### Scenario 1: Upload New Products for AI Fitments

1. User navigates to **Apply Fitments**
2. Selects **AI Fitments**
3. Clicks **Upload Product Data** tab
4. Uploads product file (CSV/JSON)
5. Clicks **Generate AI Fitments from Upload**
6. System shows progress logs
7. Job is created and user is redirected to **AI Jobs & Progress** tab
8. Job appears with status "In Progress" → "Review Required"
9. User clicks **Review** button
10. Reviews fitments in modal, selects which to approve
11. Clicks **Approve Selected**
12. Fitments move to Fitment Management
13. Job status updates to "Completed"

### Scenario 2: Select Existing Products for AI Fitments

1. User navigates to **Apply Fitments**
2. Selects **AI Fitments**
3. Clicks **Select Products** tab
4. Searches and selects products from list
5. Clicks **Generate AI Fitments (X products)**
6. System shows progress
7. Job is created and user is redirected to **AI Jobs & Progress** tab
8. User follows same review and approval process

### Scenario 3: Resume Review Later

1. User starts reviewing a job
2. Approves some fitments
3. Closes modal without approving all
4. Job remains in "Review Required" status
5. User returns later (days/weeks)
6. Clicks **Review** on the same job
7. Only remaining fitments are shown
8. User continues approval process

## Features

### ✅ Implemented (Frontend)

- Two-method selection (AI vs Manual)
- AI sub-options with tabs
- Product file upload UI
- Product selection with search
- Jobs list with status tracking
- Review & approval modal
- Edit individual fitments
- Partial approval support
- Progress tracking with logs
- Minimal, professional button styling

### 🔧 Backend Integration Needed

- `/api/ai-fitment-jobs/` endpoints
- AI processing logic integration
- Job status management
- Fitment approval workflow
- Database migrations

## Notes

### Current Implementation Status

The frontend is **fully implemented** with placeholder API calls. All UI/UX is complete and functional. Once backend endpoints are implemented, simply replace the placeholder `Promise.resolve()` calls with the actual `fitmentUploadService` method calls (commented in the code).

### Multi-Tenant Support

The implementation includes tenant_id in all API calls to ensure proper data isolation across entities.

### Resumable Review

Jobs remain in "review_required" status until ALL fitments are approved or rejected. Users can approve in batches and return later to continue.

### Integration with Existing System

- Approved AI fitments move to the same Fitment table used by Manual Fitments
- Fitment Management page (Fitments.tsx) shows all approved fitments regardless of source
- No changes needed to existing Fitment Management functionality

## Next Steps

1. **Backend Development**: Implement the API endpoints listed above
2. **AI Integration**: Connect AI processing logic to job creation
3. **Testing**: Test with real data and various scenarios
4. **Documentation**: Update user manual with new workflow
5. **Deployment**: Deploy to staging for user acceptance testing
