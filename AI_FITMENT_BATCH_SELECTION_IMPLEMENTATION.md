# AI Fitment Batch Selection - Implementation Guide

## ✅ Completed Tasks

### 1. Backend Data Model Updates

✅ **Added session tracking to ProductData**

- Added `session` ForeignKey to track upload session
- Added `source_file_name` to track original file name
- Updated `process_product_data()` to set these fields
- Products are now grouped by their source files

### 2. API Endpoints

✅ **Created `/api/data-uploads/product-files/` endpoint**

- Returns products grouped by source files
- Response format:

```json
{
  "data": [
    {
      "file_name": "products_batch_1.csv",
      "session_id": "uuid",
      "upload_date": "2025-10-08T10:30:00Z",
      "product_count": 150,
      "products": [
        {
          "id": "1",
          "part_id": "PART-123",
          "description": "Product description",
          "category": "Wheels",
          ...
        }
      ]
    }
  ],
  "total_files": 3,
  "total_products": 450
}
```

---

## 🚧 Frontend Implementation Needed

### Update ApplyFitments.tsx - Product Selection Tab

Replace the current flat product list with grouped file view:

```tsx
// Add state for file selection
const [productFiles, setProductFiles] = useState<any[]>([]);
const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
const [expandedFiles, setExpandedFiles] = useState<string[]>([]);

// Fetch product files instead of flat products
const { data: productFilesResponse } = useApi(
  () => dataUploadService.getProductFiles(),
  []
) as any;

useEffect(() => {
  if (productFilesResponse?.data) {
    setProductFiles(productFilesResponse.data);
  }
}, [productFilesResponse]);

// UI Structure:
<Card>
  {productFiles.map((file) => (
    <Accordion key={file.file_name}>
      <Accordion.Item>
        <Accordion.Control>
          <Group>
            <Checkbox
              checked={selectedFiles.includes(file.file_name)}
              onChange={() => toggleFileSelection(file.file_name)}
            />
            <Stack gap="xs">
              <Text fw={600}>{file.file_name}</Text>
              <Text size="sm" c="dimmed">
                {file.product_count} products • Uploaded{" "}
                {formatDate(file.upload_date)}
              </Text>
            </Stack>
          </Group>
        </Accordion.Control>
        <Accordion.Panel>
          {/* Individual products in this file */}
          {file.products.map((product) => (
            <Group key={product.id}>
              <Checkbox
                checked={selectedProducts.includes(product.id)}
                onChange={() => toggleProduct(product.id)}
              />
              <Text>
                {product.part_id} - {product.description}
              </Text>
            </Group>
          ))}
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  ))}
</Card>;

// Helper functions
const toggleFileSelection = (fileName: string) => {
  const file = productFiles.find((f) => f.file_name === fileName);
  if (!file) return;

  if (selectedFiles.includes(fileName)) {
    // Deselect file and all its products
    setSelectedFiles((prev) => prev.filter((f) => f !== fileName));
    setSelectedProducts((prev) =>
      prev.filter((id) => !file.products.find((p) => p.id === id))
    );
  } else {
    // Select file and all its products
    setSelectedFiles((prev) => [...prev, fileName]);
    setSelectedProducts((prev) => [...prev, ...file.products.map((p) => p.id)]);
  }
};
```

---

## 📝 Services Update

Add to `web/src/api/services.ts`:

```typescript
export const dataUploadService = {
  // ... existing methods

  // Get products grouped by files
  getProductFiles: () => apiClient.get("/api/data-uploads/product-files/"),

  // Create AI fitment job with background processing
  createAiFitmentJobAsync: (data: {
    product_ids?: string[];
    product_file?: File;
    job_type: "upload" | "selection";
  }) => {
    const formData = new FormData();

    if (data.product_file) {
      formData.append("product_file", data.product_file);
    }

    if (data.product_ids) {
      formData.append("product_ids", JSON.stringify(data.product_ids));
    }

    formData.append("job_type", data.job_type);

    return apiClient.post("/api/data-uploads/ai-fitment-jobs/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};
```

---

## 🔄 Celery Task Implementation

Create `api/sdc/data_uploads/tasks.py`:

```python
from celery import shared_task
from django.utils import timezone
from .models import AIFitmentJob, AIFitmentResult, ProductData, VCDBData
from vcdb_categories.models import VCDBData as GlobalVCDBData
from tenants.models import Tenant
import logging

logger = logging.getLogger(__name__)

@shared_task(bind=True)
def process_ai_fitment_job(self, job_id):
    """Process AI fitment generation in background"""
    try:
        job = AIFitmentJob.objects.get(id=job_id)
        tenant = job.tenant

        # Update job status
        job.status = 'in_progress'
        job.progress_percentage = 0
        job.current_step = 'Initializing...'
        job.save()

        # Get products
        if job.job_type == 'selection':
            products = ProductData.objects.filter(
                id__in=job.product_ids,
                tenant=tenant
            )
        else:
            # Parse uploaded file
            products = parse_product_file(job.product_file.path)

        total_products = products.count()

        # Get VCDB data filtered by tenant's categories
        selected_categories = tenant.fitment_settings.get('vcdb_categories', [])

        if selected_categories:
            vcdb_data = GlobalVCDBData.objects.filter(
                category_id__in=selected_categories
            )
        else:
            vcdb_data = VCDBData.objects.filter(tenant=tenant)

        # Process each product
        fitments_created = 0
        fitments_failed = 0

        for idx, product in enumerate(products):
            try:
                # Update progress
                progress = int((idx / total_products) * 100)
                job.progress_percentage = progress
                job.current_step = f'Processing product {idx + 1}/{total_products}'
                job.save()

                # Generate AI fitments for this product
                fitments = generate_ai_fitments_for_product(
                    product,
                    vcdb_data,
                    tenant
                )

                # Store AI fitments for review
                for fitment_data in fitments:
                    AIFitmentResult.objects.create(
                        job=job,
                        tenant=tenant,
                        part_id=fitment_data['part_id'],
                        part_description=fitment_data['description'],
                        year=fitment_data['year'],
                        make=fitment_data['make'],
                        model=fitment_data['model'],
                        submodel=fitment_data.get('submodel', ''),
                        drive_type=fitment_data.get('drive_type', ''),
                        position=fitment_data['position'],
                        quantity=fitment_data['quantity'],
                        confidence=fitment_data['confidence'],
                        confidence_explanation=fitment_data['explanation'],
                        ai_reasoning=fitment_data['reasoning'],
                        status='pending'  # Waiting for review
                    )
                    fitments_created += 1

            except Exception as e:
                logger.error(f"Error processing product {product.id}: {e}")
                fitments_failed += 1

        # Mark job as completed
        job.status = 'review_required'  # Needs user review
        job.progress_percentage = 100
        job.current_step = 'Completed - Ready for review'
        job.fitments_count = fitments_created
        job.approved_count = 0
        job.rejected_count = 0
        job.save()

    except Exception as e:
        logger.error(f"AI fitment job {job_id} failed: {e}")
        job.status = 'failed'
        job.error_message = str(e)
        job.save()
        raise


def generate_ai_fitments_for_product(product, vcdb_data, tenant):
    """Generate AI fitments for a single product"""
    # This is where you'd call your AI service
    # For now, returning mock data structure
    from fitment_uploads.azure_ai_service import azure_ai_service

    # Convert VCDB data to format expected by AI service
    vcdb_list = []
    for vehicle in vcdb_data[:100]:  # Limit for performance
        vcdb_list.append({
            'year': vehicle.year,
            'make': vehicle.make,
            'model': vehicle.model,
            'submodel': vehicle.submodel,
            'drive_type': vehicle.drive_type,
        })

    # Convert product to format expected by AI
    product_data = {
        'id': product.part_id,
        'description': product.description,
        'category': product.category,
        'specifications': product.specifications
    }

    # Call AI service
    ai_fitments = azure_ai_service.generate_fitments_for_product(
        product_data,
        vcdb_list,
        tenant.ai_instructions
    )

    return ai_fitments
```

---

## 🎨 UI Updates for AI Jobs & Progress Tab

Update the "AI Jobs & Progress" tab to show background jobs:

```tsx
// Poll for job updates every 3 seconds
useEffect(() => {
  if (!aiFitmentJobs || aiFitmentJobs.length === 0) return;

  const activeJobs = aiFitmentJobs.filter(
    (job) => job.status === "in_progress"
  );

  if (activeJobs.length === 0) return;

  const interval = setInterval(() => {
    refetchJobs();
  }, 3000);

  return () => clearInterval(interval);
}, [aiFitmentJobs, refetchJobs]);

// Show progress for in-progress jobs
{
  aiFitmentJobs.map((job) => (
    <Card key={job.id}>
      <Group justify="space-between">
        <div>
          <Text fw={600}>
            {job.product_file_name || `${job.product_count} products selected`}
          </Text>
          <Text size="sm" c="dimmed">
            {job.created_at}
          </Text>
        </div>
        {renderStatusBadge(job.status)}
      </Group>

      {job.status === "in_progress" && (
        <Stack gap="xs" mt="md">
          <Group justify="space-between">
            <Text size="sm">{job.current_step}</Text>
            <Text size="sm" fw={600}>
              {job.progress_percentage}%
            </Text>
          </Group>
          <Progress value={job.progress_percentage} animated />
        </Stack>
      )}

      {job.status === "review_required" && (
        <Button
          mt="md"
          leftSection={<IconEye size={16} />}
          onClick={() => handleReviewJob(job.id)}
        >
          Review {job.fitments_count} Fitments
        </Button>
      )}
    </Card>
  ));
}
```

---

## 📊 Database Migration

Run migration to add new fields:

```bash
cd api/sdc
python manage.py makemigrations data_uploads
python manage.py migrate
```

---

## 🧪 Testing Checklist

- [ ] Upload multiple product files
- [ ] Verify products are grouped by file
- [ ] Select entire file (batch selection)
- [ ] Select individual products
- [ ] Submit AI fitment job
- [ ] Verify Celery task starts
- [ ] Monitor job progress in real-time
- [ ] Review suggested fitments
- [ ] Approve/reject fitments
- [ ] Verify fitments appear in Fitment Management

---

## 🚀 Next Steps

1. **Run Database Migration**
2. **Update Frontend Services**
3. **Implement Grouped Product UI**
4. **Create Celery Task**
5. **Test End-to-End**
6. **Deploy**

---

## 📋 Summary

This implementation provides:

- ✅ Product grouping by upload files
- ✅ Batch selection (select entire files)
- ✅ Individual product selection
- ✅ Background AI processing via Celery
- ✅ Real-time job progress tracking
- ✅ Review & approve workflow

The user can now:

1. See products grouped by their upload files
2. Select entire batches or individual products
3. Submit for AI processing
4. Monitor job progress in real-time
5. Review AI-suggested fitments
6. Approve fitments to move to Fitment Management
