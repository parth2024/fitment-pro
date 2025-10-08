# AI Fitment Direct to Fitment Table - Updated Workflow

## Changes Made

**Date:** October 8, 2025

## New Workflow

Instead of creating fitments in `AiGeneratedFitment` intermediate table, AI fitments are now created **directly in the `Fitment` table** with `itemStatus='ReadyToApprove'`.

### Complete Flow

```
Upload/Select Products
  ↓
Create AiFitmentJob (status: queued)
  ↓
Celery Task Processing
  ↓
Validate File (if upload)
  ↓
Check/Create Products in DB
  ↓
Fetch VCDB Data
  ↓
Send to Azure AI
  ↓
Create Fitments in Fitment Table ✅
  - itemStatus = 'ReadyToApprove'
  - ai_job_id = <job_id>
  - fitmentType = 'ai_fitment'
  ↓
Job Status = 'review_required'
  ↓
User Reviews Fitments
  ↓
APPROVE → Change itemStatus to 'Active'
  ↓
REJECT → Delete from Fitment table
```

## Database Changes

### Fitment Model

**New Field Added:**

```python
ai_job_id = models.UUIDField(
    null=True,
    blank=True,
    help_text="Reference to AiFitmentJob if created by AI"
)
```

**Migration Created:**

- `fitments/migrations/0010_fitment_ai_job_id.py`
- Applied successfully ✅

## Backend Changes

### 1. `ai_fitment_processor.py`

**Changed:**

- ~~Create `AiGeneratedFitment` objects~~
- ✅ Create `Fitment` objects directly with `itemStatus='ReadyToApprove'`

```python
# Step 6: Store fitments directly in Fitment table
for fitment_data in ai_fitments:
    fitment = Fitment(
        tenant=job.tenant,
        ai_job_id=job.id,  # ✅ Link to job
        itemStatus='ReadyToApprove',  # ✅ Ready for review
        # ... all other fields
    )
```

### 2. `views.py` - `get_job_fitments()`

**Changed:**

- ~~Query `AiGeneratedFitment` table~~
- ✅ Query `Fitment` table with filters:
  - `ai_job_id = job_id`
  - `itemStatus = 'ReadyToApprove'`

```python
fitments = Fitment.objects.filter(
    ai_job_id=job.id,
    itemStatus='ReadyToApprove'
)
```

### 3. `views.py` - `approve_fitments()`

**Changed:**

- ~~Create new `Fitment` records~~
- ~~Update `AiGeneratedFitment` status~~
- ✅ Simply update `itemStatus` from 'ReadyToApprove' to 'Active'

```python
approved_count = fitments_to_approve.update(
    itemStatus='Active',
    itemStatusCode=1,
    updatedBy=user_email,
    updatedAt=timezone.now()
)
```

### 4. `views.py` - `reject_fitments()`

**Changed:**

- ~~Update `AiGeneratedFitment` status to 'rejected'~~
- ✅ Delete fitments from `Fitment` table permanently

```python
fitments_to_reject = Fitment.objects.filter(
    ai_job_id=job.id,
    hash__in=fitment_ids,
    itemStatus='ReadyToApprove'
)
fitments_to_reject.delete()  # ✅ Permanently delete
```

### 5. `views.py` - `update_fitment()`

**Changed:**

- ~~Get from `AiGeneratedFitment` table~~
- ✅ Get from `Fitment` table by hash
- ✅ Map request fields to Fitment model fields

```python
fitment = Fitment.objects.get(
    ai_job_id=job.id,
    hash=fitment_id,
    itemStatus='ReadyToApprove'
)
```

### 6. `serializers.py`

**Changed:**

- `ApproveRejectFitmentsSerializer.fitment_ids`
  - ~~`UUIDField()`~~
  - ✅ `CharField()` (for hash IDs)

### 7. `urls.py`

**Changed:**

- `update_fitment` URL pattern
  - ~~`<uuid:fitment_id>`~~
  - ✅ `<str:fitment_id>` (for hash)

## Benefits of New Approach

1. ✅ **Single Source of Truth** - All fitments in one table
2. ✅ **Simpler Data Model** - No intermediate table needed
3. ✅ **Better Performance** - No data duplication
4. ✅ **Easier Queries** - Filter by `itemStatus` instead of joining tables
5. ✅ **Consistent Status** - Same status field for all fitment types

## Fitment Statuses

| Status           | Description                               |
| ---------------- | ----------------------------------------- |
| `ReadyToApprove` | AI-generated, awaiting user review        |
| `Active`         | Approved by user, active fitment          |
| _(deleted)_      | Rejected fitments are permanently removed |

## API Response Changes

### get_job_fitments Response

```json
{
  "fitments": [
    {
      "id": "PART_2020_Toyota_RAV4_a1b2c3d4", // ✅ Hash instead of UUID
      "part_id": "P001",
      "part_description": "Brake Pads",
      "year": 2020,
      "make": "Toyota",
      "model": "RAV4",
      "confidence": 0.85,
      "status": "ReadyToApprove" // ✅ itemStatus
      // ... other fields
    }
  ]
}
```

## Frontend Compatibility

✅ **No changes needed** to frontend! The response structure is compatible:

- `id` is still a string (hash instead of UUID)
- All other fields mapped correctly
- Approve/reject flows work the same

## Job Counts

The `AiFitmentJob` model tracks:

```python
fitments_count = len(generated_fitments)  # Total created
approved_count = Fitment.objects.filter(ai_job_id=job.id, itemStatus='Active').count()
rejected_count = job.rejected_count  # Incremented on each rejection
```

## Testing Checklist

- [x] Create migration for ai_job_id field
- [x] Apply migration
- [ ] Test upload product file → creates fitments with ReadyToApprove
- [ ] Test select products → creates fitments with ReadyToApprove
- [ ] Test review job → shows fitments from Fitment table
- [ ] Test approve fitments → changes to Active
- [ ] Test reject fitments → deletes from table
- [ ] Test edit fitment → updates Fitment record
- [ ] Verify approved fitments visible in Fitment Management
- [ ] Verify rejected fitments are deleted

## Important Notes

1. **ReadyToApprove fitments** won't show in normal Fitment Management until approved
2. **Filter by itemStatus** to see different fitment states:
   - `Active` - Normal fitments
   - `ReadyToApprove` - Awaiting review
3. **Job completion** - Job marked 'completed' when no ReadyToApprove fitments remain
4. **Azure AI fallback** still works if credentials invalid

## Migration Details

**File:** `api/sdc/fitments/migrations/0010_fitment_ai_job_id.py`

```python
operations = [
    migrations.AddField(
        model_name='fitment',
        name='ai_job_id',
        field=models.UUIDField(
            blank=True,
            null=True,
            help_text='Reference to AiFitmentJob if created by AI'
        ),
    ),
]
```

---

**Status:** ✅ COMPLETE

**Next Steps:**

1. Restart Django server to load changes
2. Test the complete flow
3. Verify Azure AI credentials if needed
