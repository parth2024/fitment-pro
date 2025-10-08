# AI Fitment Quick Start Guide

## Prerequisites

1. **Celery Worker Running:**

```bash
cd api/sdc
celery -A sdc worker --loglevel=info
```

2. **Redis Running:**

```bash
redis-server
```

3. **Django Server Running:**

```bash
cd api/sdc
python manage.py runserver
```

4. **Frontend Running:**

```bash
cd web
npm run dev
```

## Usage

### Option 1: Upload Product Data

1. Navigate to **Apply Fitments** page
2. Select **AI Fitments** method
3. Click **Upload Product Data** tab
4. Click the upload area and select your product file (CSV, XLSX, or JSON)
5. Click **Generate AI Fitments from Upload**
6. Watch real-time progress:
   - File validation
   - Database checks
   - AI processing
   - Fitments generation
7. When complete, you'll be auto-navigated to **AI Jobs & Progress** tab
8. Click **Review** to see generated fitments
9. Select fitments and click **Approve** or **Reject**

### Option 2: Select Existing Products

1. Navigate to **Apply Fitments** page
2. Select **AI Fitments** method
3. Click **Select Products** tab
4. Use search to find products
5. Select products using checkboxes (or Select All)
6. Click **Generate AI Fitments**
7. Watch real-time progress
8. Review and approve as above

### What Happens Behind the Scenes

**Upload Flow:**

```
File Upload
  ↓
Validate File (check structure, required fields)
  ↓
Check Database (create only new products)
  ↓
Fetch VCDB Data (from tenant's configured categories)
  ↓
Send to Azure AI (async via Celery)
  ↓
Generate Fitments (stored with status 'pending')
  ↓
Ready for Review
```

**Selection Flow:**

```
Product Selection
  ↓
Fetch VCDB Data (from tenant's configured categories)
  ↓
Send to Azure AI (async via Celery)
  ↓
Generate Fitments (stored with status 'pending')
  ↓
Ready for Review
```

### Approval Flow

When you approve fitments:

- Status changes to 'approved'
- **Active Fitment records created** in main Fitments table
- Visible in Fitment Management

When you reject fitments:

- Fitments are **permanently deleted**
- Confirmation required

## Job Statuses

| Status             | Description                                     |
| ------------------ | ----------------------------------------------- |
| 🔵 Queued          | Job created, waiting for Celery worker          |
| 🔄 Processing      | Celery task running (validating, AI processing) |
| 🟠 Review Required | Fitments ready for your review                  |
| ✅ Completed       | All fitments reviewed and approved              |
| ❌ Failed          | Error occurred (check error message)            |

## Troubleshooting

### "Failed to create AI fitment job"

- Check if Celery worker is running
- Check Redis connection
- Check Django logs

### "No VCDB data available"

- Ensure VCDB data is uploaded
- Check tenant has VCDB categories configured
- Verify tenant ID in header

### Job stuck in "Processing"

- Check Celery worker logs
- Check if Azure AI service is responding
- Task timeout is 30 minutes - large files may take time

### Fitments not appearing after approval

- Check if fitments were successfully approved (refresh Jobs tab)
- Check Fitment Management page
- Check tenant filter

## File Format Requirements

### Product File (CSV/XLSX/JSON)

**Required Fields:**

- `id` or `part_id` - Unique product identifier
- `description` - Product description

**Optional Fields:**

- `category` - Product category
- `part_type` or `partType` - Type of part
- `brand` - Manufacturer/brand
- `sku` - Stock keeping unit
- `compatibility` - Compatibility notes
- `specifications` - JSON object with specs

**Example CSV:**

```csv
id,description,category,brand
P001,Front Brake Pads,Brakes,Brembo
P002,Oil Filter,Engine,K&N
```

**Example JSON:**

```json
[
  {
    "id": "P001",
    "description": "Front Brake Pads",
    "category": "Brakes",
    "brand": "Brembo"
  }
]
```

## Real-Time Progress

The frontend polls the job status every 3 seconds and displays:

- Current progress percentage (0-100%)
- Status messages from Celery task
- Success/failure notifications
- Fitments count when complete

## Performance Notes

- Small files (< 100 products): ~30 seconds
- Medium files (100-500 products): 1-3 minutes
- Large files (500-1000 products): 3-10 minutes
- Very large files (> 1000 products): 10+ minutes

Progress is shown in real-time, so you can monitor the job.

## API Endpoints Used

- `POST /api/data-uploads/ai-fitment-jobs/` - Create job
- `GET /api/data-uploads/ai-fitment-jobs/{id}/status/` - Poll status
- `GET /api/data-uploads/ai-fitment-jobs/{id}/fitments/` - Get fitments for review
- `POST /api/data-uploads/ai-fitment-jobs/{id}/approve/` - Approve fitments
- `POST /api/data-uploads/ai-fitment-jobs/{id}/reject/` - Reject fitments

---

**Ready to use!** 🚀

For detailed technical documentation, see `AI_FITMENT_COMPLETE_WORKFLOW_IMPLEMENTATION.md`
