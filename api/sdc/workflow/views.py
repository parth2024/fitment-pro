from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from django.conf import settings
from django.db.models import Q
import os
import uuid
import requests

from azure.storage.blob import BlobServiceClient, ContentSettings
from azure.core.exceptions import ResourceExistsError
from .utils import preflight, compute_checksum

from .models import Upload, Job, NormalizationResult, Lineage, Preset
from tenants.models import Tenant
from django.core.exceptions import ValidationError


def _storage_dir() -> str:
    base = os.environ.get("STORAGE_DIR") or os.path.join(settings.BASE_DIR, "..", "storage", "customer")
    os.makedirs(base, exist_ok=True)
    return base


@api_view(["GET", "POST"]) 
def uploads(request):
    if request.method == "GET":
        tenant_id = request.query_params.get("tenantId")
        qs = Upload.objects.all()
        if tenant_id:
            qs = qs.filter(tenant_id=tenant_id)
        items = list(qs.order_by("-created_at").values())
        return Response({"items": items, "totalCount": len(items)})

    # POST multipart upload
    file_obj = request.FILES.get("file")
    if not file_obj:
        return Response({"message": "file is required"}, status=status.HTTP_400_BAD_REQUEST)

    tenant_param = request.POST.get("tenantId") or request.query_params.get("tenantId")
    # Resolve tenant: accept UUID or slug/name, or fallback to slug 'default'
    tenant_obj = None
    if tenant_param:
        try:
            tenant_obj = Tenant.objects.get(id=tenant_param)
        except Exception:
            tenant_obj = Tenant.objects.filter(slug=tenant_param).first() or Tenant.objects.filter(name=tenant_param).first()
    if tenant_obj is None:
        tenant_obj = Tenant.objects.filter(slug="default").first()
    if tenant_obj is None:
        return Response({"message": "Invalid or missing tenantId; no default tenant found"}, status=status.HTTP_400_BAD_REQUEST)
    preset_id = request.POST.get("presetId")

    # read bytes (bounded by server max upload settings)
    file_bytes = file_obj.read()
    file_obj.seek(0)
    pf = preflight(file_bytes, file_obj.name)
    checksum = pf.get("checksum") or compute_checksum(file_bytes)

    # size limit (default 250MB)
    max_mb = int(os.getenv("MAX_UPLOAD_MB", "250"))
    if len(file_bytes) > max_mb * 1024 * 1024:
        return Response({"message": f"File too large (> {max_mb} MB)"}, status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE)

    # Azure Blob if configured
    container = os.getenv("AZURE_STORAGE_CONTAINER")
    account = os.getenv("AZURE_STORAGE_ACCOUNT_NAME")
    key = os.getenv("AZURE_STORAGE_ACCOUNT_KEY")
    storage_url = ""
    if container and account and key:
        try:
            service = BlobServiceClient(account_url=f"https://{account}.blob.core.windows.net", credential=key)
            try:
                service.create_container(container)
            except ResourceExistsError:
                pass
            blob_name = f"uploads/{uuid.uuid4().hex}_{file_obj.name}"
            blob_client = service.get_blob_client(container=container, blob=blob_name)
            content_settings = ContentSettings(content_type=file_obj.content_type or "application/octet-stream")
            blob_client.upload_blob(file_bytes, overwrite=True, content_settings=content_settings)
            storage_url = blob_client.url
        except Exception:
            # Fallback to local if Azure upload fails
            safe_name = f"{uuid.uuid4().hex}_{file_obj.name}"
            dest_dir = _storage_dir()
            dest_path = os.path.join(dest_dir, safe_name)
            with open(dest_path, "wb") as out:
                out.write(file_bytes)
            storage_url = dest_path
    else:
        safe_name = f"{uuid.uuid4().hex}_{file_obj.name}"
        dest_dir = _storage_dir()
        dest_path = os.path.join(dest_dir, safe_name)
        with open(dest_path, "wb") as out:
            out.write(file_bytes)
        storage_url = dest_path

    upload = Upload(
        tenant_id=str(tenant_obj.id),
        filename=file_obj.name,
        content_type=file_obj.content_type or "application/octet-stream",
        storage_url=storage_url,
        file_size_bytes=len(file_bytes),
        status="received",
        checksum=checksum,
        file_format=pf.get("fileFormat"),
        preflight_report=pf,
        preset_id=preset_id,
    )
    upload.save()

    # lineage
    Lineage.objects.create(
        tenant_id=str(tenant_obj.id),
        entity_type="upload",
        entity_id=str(upload.id),
        meta={"storage_path": storage_url},
    )
    return Response({"id": str(upload.id), "message": "uploaded"}, status=status.HTTP_201_CREATED)


@api_view(["POST"]) 
def ai_map(request, upload_id: str):
    # create job
    upload = Upload.objects.get(id=upload_id)
    job = Job.objects.create(
        tenant_id=upload.tenant_id,
        upload_id=upload.id,
        job_type="ai-map",
        status="queued",
        params={"presetId": upload.preset_id},
    )
    # mock AI suggestions
    suggestions = {
        "columnMappings": [
            {"source": "PartNumber", "target": "partId", "confidence": 0.94},
            {"source": "Make", "target": "makeName", "confidence": 0.91},
            {"source": "Model", "target": "modelName", "confidence": 0.90},
            {"source": "Year", "target": "year", "confidence": 0.88},
        ],
        "entityResolutions": [
            {"value": "ADX", "entity": "modelName", "canonical": "ADX", "confidence": 0.86}
        ],
    }
    job.status = "completed"
    job.result = suggestions
    job.finished_at = timezone.now()
    job.save()

    # Optional: call Azure AI Foundry if configured
    endpoint = os.getenv("AIFOUNDRY_ENDPOINT")
    api_key = os.getenv("AIFOUNDRY_API_KEY")
    if endpoint and api_key:
        try:
            resp = requests.post(
                endpoint.rstrip('/') + "/map-columns",
                json={"headers": job.params or {}, "sample": []},
                timeout=30,
                headers={"Authorization": f"Bearer {api_key}"},
            )
            if resp.ok:
                suggestions = resp.json()
        except Exception:
            pass

    return Response({"jobId": str(job.id), "suggestions": suggestions})


@api_view(["POST"]) 
def vcdb_validate(request, upload_id: str):
    upload = Upload.objects.get(id=upload_id)
    # create job
    job = Job.objects.create(
        tenant_id=upload.tenant_id,
        upload_id=upload.id,
        job_type="vcdb-validate",
        status="queued",
    )
    # write a few normalization results (pending)
    rows = [
        {
            "row_index": 1,
            "mapped_entities": {"partId": "P-12345", "makeName": "Acura", "modelName": "ADX", "year": 2025},
            "confidence": 0.92,
        },
        {
            "row_index": 2,
            "mapped_entities": {"partId": "P-67890", "makeName": "Toyota", "modelName": "RAV4", "year": 2024},
            "confidence": 0.84,
        },
    ]
    created = []
    for r in rows:
        nr = NormalizationResult.objects.update_or_create(
            tenant_id=upload.tenant_id,
            upload_id=upload.id,
            row_index=r["row_index"],
            defaults={
                "mapped_entities": r["mapped_entities"],
                "confidence": r["confidence"],
                "status": "pending",
            },
        )[0]
        created.append({"id": str(nr.id), "rowIndex": nr.row_index, "confidence": nr.confidence})

    job.status = "completed"
    job.result = {"created": len(created)}
    job.finished_at = timezone.now()
    job.save()
    return Response({"jobId": str(job.id), "results": created})


@api_view(["GET"]) 
def review_queue(request):
    tenant_id = request.query_params.get("tenantId")
    status_filter = request.query_params.get("status", "pending")
    qs = NormalizationResult.objects.filter(status=status_filter)
    if tenant_id:
        qs = qs.filter(tenant_id=tenant_id)
    items = list(qs.order_by("-created_at").values())
    return Response({"items": items, "totalCount": len(items)})


@api_view(["POST"]) 
def review_actions(request):
    action = request.data.get("action")  # approve|reject
    ids = request.data.get("ids") or []
    if action not in ("approve", "reject"):
        return Response({"message": "invalid action"}, status=status.HTTP_400_BAD_REQUEST)
    new_status = "approved" if action == "approve" else "rejected"
    updated = NormalizationResult.objects.filter(id__in=ids).update(
        status=new_status, reviewed_at=timezone.now()
    )
    return Response({"updated": updated})


@api_view(["POST"]) 
def publish(request, upload_id: str):
    upload = Upload.objects.get(id=upload_id)
    job = Job.objects.create(
        tenant_id=upload.tenant_id,
        upload_id=upload.id,
        job_type="publish",
        status="queued",
    )
    # pretend publish to FitmentPro API
    job.status = "completed"
    job.result = {"publishedCount": NormalizationResult.objects.filter(upload_id=upload.id, status="approved").count()}
    job.finished_at = timezone.now()
    job.save()
    return Response({"jobId": str(job.id), "result": job.result})


@api_view(["GET", "POST"]) 
def presets(request):
    if request.method == "GET":
        tenant_id = request.query_params.get("tenantId")
        qs = Preset.objects.all()
        if tenant_id:
            qs = qs.filter(tenant_id=tenant_id)
        items = list(qs.order_by("name").values())
        return Response({"items": items, "totalCount": len(items)})
    # POST create
    data = request.data or {}
    preset = Preset.objects.create(
        tenant_id=data.get("tenantId"),
        name=data.get("name"),
        attribute_priorities=data.get("attributePriorities") or {},
        created_by_user_id=None,
    )
    return Response({"id": str(preset.id)}, status=status.HTTP_201_CREATED)


@api_view(["PUT", "PATCH"]) 
def preset_detail(request, preset_id: str):
    try:
        preset = Preset.objects.get(id=preset_id)
    except Preset.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    data = request.data or {}
    if "name" in data:
        preset.name = data["name"]
    if "attributePriorities" in data:
        preset.attribute_priorities = data["attributePriorities"]
    preset.save()
    return Response({"id": str(preset.id), "name": preset.name, "attributePriorities": preset.attribute_priorities})


@api_view(["POST"]) 
def ai_fitments(request):
    """Accept two files (vcdb, parts) and return AI-suggested fitments.
    Multipart fields: vcdb_file, parts_file
    Optional: tenantId, presetId
    """
    vcdb_file = request.FILES.get('vcdb_file')
    parts_file = request.FILES.get('parts_file')
    if not vcdb_file or not parts_file:
        return Response({"message": "vcdb_file and parts_file are required"}, status=400)

    # For MVP we store files and return mock combos; hook to Foundry if configured
    tenant_param = request.POST.get("tenantId") or request.query_params.get("tenantId")
    tenant_obj = None
    if tenant_param:
        try:
            tenant_obj = Tenant.objects.get(id=tenant_param)
        except Exception:
            tenant_obj = Tenant.objects.filter(slug=tenant_param).first() or Tenant.objects.filter(name=tenant_param).first()
    if tenant_obj is None:
        tenant_obj = Tenant.objects.filter(slug="default").first()
    if tenant_obj is None:
        return Response({"message": "Invalid or missing tenantId; no default tenant found"}, status=400)

    # Store files locally (or in blob; reuse uploads flow if desired)
    base_dir = _storage_dir()
    vcdb_path = os.path.join(base_dir, f"vcdb_{uuid.uuid4().hex}_{vcdb_file.name}")
    with open(vcdb_path, 'wb') as f:
        for c in vcdb_file.chunks():
            f.write(c)
    parts_path = os.path.join(base_dir, f"parts_{uuid.uuid4().hex}_{parts_file.name}")
    with open(parts_path, 'wb') as f:
        for c in parts_file.chunks():
            f.write(c)

    # Call Foundry if configured; otherwise mock a small suggestion set
    endpoint = os.getenv("AIFOUNDRY_ENDPOINT")
    api_key = os.getenv("AIFOUNDRY_API_KEY")
    fitments = []
    if endpoint and api_key:
        try:
            resp = requests.post(endpoint.rstrip('/') + "/fitments/suggest", timeout=60, headers={"Authorization": f"Bearer {api_key}"}, json={
                "tenantId": str(tenant_obj.id),
                "vcdbFile": os.path.basename(vcdb_path),
                "partsFile": os.path.basename(parts_path),
                "presetId": request.POST.get("presetId")
            })
            if resp.ok:
                fitments = resp.json().get('fitments', [])
        except Exception:
            pass
    if not fitments:
        fitments = [
            {"configurationId": "cfg-1001", "partId": "P-12345", "position": "Front", "quantity": 1, "confidence": 0.93},
            {"configurationId": "cfg-1002", "partId": "P-67890", "position": "Engine Bay", "quantity": 1, "confidence": 0.88},
        ]

    return Response({"vcdbPath": vcdb_path, "partsPath": parts_path, "fitments": fitments})


@api_view(["POST"]) 
def apply_fitments_batch(request):
    """Persist selected fitments array into DB Fitment table (MVP: append basic rows). Body: { fitments: [{configurationId, partId, position, quantity, ...}], tenantId? }"""
    body = request.data or {}
    items = body.get('fitments') or []
    if not isinstance(items, list) or not items:
        return Response({"message": "fitments array required"}, status=400)
    created = 0
    for it in items:
        try:
            Fitment.objects.create(
                hash=uuid.uuid4().hex,
                partId=it.get('partId', ''),
                itemStatus='Active',
                itemStatusCode=0,
                baseVehicleId=it.get('baseVehicleId', ''),
                year=int(it.get('year', 0) or 0),
                makeName=it.get('make', it.get('makeName', '')),
                modelName=it.get('model', it.get('modelName', '')),
                subModelName=it.get('submodel', it.get('subModelName', '')),
                driveTypeName=it.get('driveType', it.get('driveTypeName', '')),
                fuelTypeName=it.get('fuelType', it.get('fuelTypeName', '')),
                bodyNumDoors=int(it.get('numDoors', it.get('bodyNumDoors', 0) or 0)),
                bodyTypeName=it.get('bodyType', it.get('bodyTypeName', '')),
                ptid=it.get('partTypeId', it.get('ptid', '')),
                partTypeDescriptor=it.get('partTypeDescriptor', ''),
                uom='EA',
                quantity=int(it.get('quantity', 1) or 1),
                fitmentTitle=it.get('title', ''),
                fitmentDescription=it.get('description', ''),
                fitmentNotes=it.get('notes', ''),
                position=it.get('position', ''),
                positionId=int(it.get('positionId', 0) or 0),
                liftHeight=it.get('liftHeight', ''),
                wheelType=it.get('wheelType', ''),
                createdBy='api', updatedBy='api'
            )
            created += 1
        except Exception:
            continue
    return Response({"created": created})
