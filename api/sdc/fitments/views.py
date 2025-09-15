from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q, Count, Case, When, IntegerField, Min, Max
from django.http import StreamingHttpResponse, HttpResponse, JsonResponse
from django.core.paginator import Paginator
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from .models import Fitment, FitmentUploadSession, FitmentValidationResult
from .validators import validate_fitment_row
import os
import csv
import json
import openpyxl
from openpyxl.styles import Font, PatternFill
from io import BytesIO
import uuid
from datetime import datetime
import logging
import pandas as pd

logger = logging.getLogger(__name__)


# Create your views here.


def _apply_filters(queryset, params):
    """Apply comprehensive filtering to fitments queryset"""
    # Global search
    search = params.get("search")
    if search:
        q = Q(partId__icontains=search) | Q(makeName__icontains=search) | Q(modelName__icontains=search) | Q(fitmentTitle__icontains=search) | Q(fitmentDescription__icontains=search)
        queryset = queryset.filter(q)
    
    # Column-wise filtering
    if params.get("partId"):
        queryset = queryset.filter(partId__icontains=params.get("partId"))
    
    if params.get("itemStatus"):
        queryset = queryset.filter(itemStatus__icontains=params.get("itemStatus"))
    
    if params.get("yearFrom"):
        try:
            queryset = queryset.filter(year__gte=int(params.get("yearFrom")))
        except ValueError:
            pass
    
    if params.get("yearTo"):
        try:
            queryset = queryset.filter(year__lte=int(params.get("yearTo")))
        except ValueError:
            pass
    
    if params.get("makeName"):
        queryset = queryset.filter(makeName__icontains=params.get("makeName"))
    
    if params.get("modelName"):
        queryset = queryset.filter(modelName__icontains=params.get("modelName"))
    
    if params.get("subModelName"):
        queryset = queryset.filter(subModelName__icontains=params.get("subModelName"))
    
    if params.get("driveTypeName"):
        queryset = queryset.filter(driveTypeName__icontains=params.get("driveTypeName"))
    
    if params.get("fuelTypeName"):
        queryset = queryset.filter(fuelTypeName__icontains=params.get("fuelTypeName"))
    
    if params.get("bodyTypeName"):
        queryset = queryset.filter(bodyTypeName__icontains=params.get("bodyTypeName"))
    
    if params.get("partTypeDescriptor"):
        queryset = queryset.filter(partTypeDescriptor__icontains=params.get("partTypeDescriptor"))
    
    if params.get("position"):
        queryset = queryset.filter(position__icontains=params.get("position"))
    
    if params.get("liftHeight"):
        queryset = queryset.filter(liftHeight__icontains=params.get("liftHeight"))
    
    if params.get("wheelType"):
        queryset = queryset.filter(wheelType__icontains=params.get("wheelType"))
    
    if params.get("fitmentType"):
        queryset = queryset.filter(fitmentType=params.get("fitmentType"))
    
    if params.get("createdBy"):
        queryset = queryset.filter(createdBy__icontains=params.get("createdBy"))
    
    # Date range filtering
    if params.get("createdAtFrom"):
        try:
            date_from = datetime.fromisoformat(params.get("createdAtFrom").replace('Z', '+00:00'))
            queryset = queryset.filter(createdAt__gte=date_from)
        except ValueError:
            pass
    
    if params.get("createdAtTo"):
        try:
            date_to = datetime.fromisoformat(params.get("createdAtTo").replace('Z', '+00:00'))
            queryset = queryset.filter(createdAt__lte=date_to)
        except ValueError:
            pass
    
    if params.get("updatedAtFrom"):
        try:
            date_from = datetime.fromisoformat(params.get("updatedAtFrom").replace('Z', '+00:00'))
            queryset = queryset.filter(updatedAt__gte=date_from)
        except ValueError:
            pass
    
    if params.get("updatedAtTo"):
        try:
            date_to = datetime.fromisoformat(params.get("updatedAtTo").replace('Z', '+00:00'))
            queryset = queryset.filter(updatedAt__lte=date_to)
        except ValueError:
            pass
    
    return queryset


def _apply_sort(queryset, sort_by: str | None, sort_order: str | None):
    """Apply sorting to fitments queryset"""
    allowed = {
        "partId", "makeName", "modelName", "year", "updatedAt", "createdAt", 
        "itemStatus", "subModelName", "driveTypeName", "fuelTypeName", 
        "bodyTypeName", "partTypeDescriptor", "position", "liftHeight", 
        "wheelType", "fitmentType", "createdBy", "updatedBy", "quantity"
    }
    field = sort_by if sort_by in allowed else "updatedAt"
    if sort_order == "desc":
        field = f"-{field}"
    return queryset.order_by(field)


@api_view(["GET", "POST", "DELETE"]) 
def fitments_root(request):
    if request.method == "GET":
        params = request.query_params
        qs = Fitment.objects.all()
        qs = _apply_filters(qs, params)
        qs = _apply_sort(qs, params.get("sortBy"), params.get("sortOrder"))
        # pagination
        page = int(params.get("page", 1))
        page_size = int(params.get("pageSize", 50))
        start = (page - 1) * page_size
        end = start + page_size
        total = qs.count()
        items = list(qs[start:end].values())
        return Response({"fitments": items, "totalCount": total})

    if request.method == "POST":
        payload = request.data or {}
        part_ids = payload.get("partIDs") or []
        confs = payload.get("configurationIDs") or []
        part_id = part_ids[0] if part_ids else ""
        # Minimal create: insert a placeholder fitment
        fitment = Fitment(
            partId=part_id, itemStatus="Active", itemStatusCode=0,
            baseVehicleId=str(confs[0]) if confs else "",
            year=payload.get("year", 2025), makeName=payload.get("make", "Acura"),
            modelName=payload.get("model", "ADX"), subModelName=payload.get("submodel", "Advance"),
            driveTypeName=payload.get("driveType", "AWD"), fuelTypeName=payload.get("fuelType", "Gas"),
            bodyNumDoors=int(payload.get("numDoors", 4)), bodyTypeName=payload.get("bodyType", "Crossover"),
            ptid=payload.get("ptid", "PT-22"), partTypeDescriptor=payload.get("partTypeDescriptor", "Brake Pads"),
            uom=payload.get("uom", "Set"), quantity=int(payload.get("quantity", 1)),
            fitmentTitle=payload.get("fitmentTitle", "New Fitment"), fitmentDescription=payload.get("fitmentDescription", ""),
            fitmentNotes=payload.get("fitmentNotes", ""), position=payload.get("position", "Front"),
            positionId=int(payload.get("positionId", 1)), liftHeight=payload.get("liftHeight", "Stock"),
            wheelType=payload.get("wheelType", "Alloy"), createdBy="api", updatedBy="api",
        )
        fitment.save()
        return Response({
            "message": "Fitment created successfully",
            "hash": fitment.hash,
        })

    # DELETE (bulk by hashes param) - Soft delete
    hashes = request.query_params.getlist("hashes") or []
    deleted_by = request.data.get('deletedBy', 'api_user')
    deleted_count = 0
    
    for fitment_hash in hashes:
        try:
            fitment = Fitment.all_objects.get(hash=fitment_hash)
            fitment.soft_delete(deleted_by=deleted_by)
            deleted_count += 1
        except Fitment.DoesNotExist:
            continue
    
    return Response({"message": f"Deleted {deleted_count} fitments"})


@api_view(["GET"]) 
def coverage(request):
    # Sample VCDB configurations (as total universe) - reuse same as vcdb.views
    sample_configs = [
        {"year": 2025, "make": "Acura", "model": "ADX"},
        {"year": 2024, "make": "Acura", "model": "ADX"},
        {"year": 2024, "make": "Toyota", "model": "RAV4"},
        {"year": 2023, "make": "Ford", "model": "F-150"},
        {"year": 2023, "make": "Honda", "model": "Civic"},
    ]
    qp = request.query_params
    try:
        yf = int(qp.get("yearFrom", 2010))
    except ValueError:
        yf = 2010
    try:
        yt = int(qp.get("yearTo", 2030))
    except ValueError:
        yt = 2030

    # Filter VCDB universe by year range
    universe = [c for c in sample_configs if yf <= c["year"] <= yt]
    # Compute total configs per make and models list
    make_to_total = {}
    make_to_models = {}
    for c in universe:
        make_to_total[c["make"]] = make_to_total.get(c["make"], 0) + 1
        make_to_models.setdefault(c["make"], set()).add(c["model"])

    # Fitted configs from Fitments intersecting the universe (distinct year/make/model)
    fitted_qs = Fitment.objects.filter(year__gte=yf, year__lte=yt)
    fitted_set = set()
    for f in fitted_qs.values("year", "makeName", "modelName"):
        key = (f["year"], f["makeName"], f["modelName"])
        fitted_set.add(key)

    # Count fitted per make only if present in universe
    universe_set = set((c["year"], c["make"], c["model"]) for c in universe)
    make_to_fitted = {}
    for (y, mk, md) in fitted_set:
        if (y, mk, md) in universe_set:
            make_to_fitted[mk] = make_to_fitted.get(mk, 0) + 1

    # Build rows
    rows = []
    for make, total in make_to_total.items():
        fitted = make_to_fitted.get(make, 0)
        coverage_percent = int(round((fitted / total) * 100)) if total else 0
        models = sorted(list(make_to_models.get(make, set())))
        rows.append({
            "make": make,
            "configsCount": total,
            "fittedConfigsCount": fitted,
            "coveragePercent": coverage_percent,
            "models": models,
        })

    # Sorting
    sort_by = qp.get("sortBy", "make")
    sort_order = qp.get("sortOrder", "asc")
    def sort_key(r):
        return r.get(sort_by) if sort_by != "models" else len(r.get("models", []))
    rows.sort(key=sort_key, reverse=(sort_order == "desc"))

    return Response({"items": rows, "totalCount": len(rows)})


@api_view(["GET"]) 
def property_values(request, property_name: str):
    return Response([])


VALIDATION_CACHE = {"result": None}


@api_view(["POST"]) 
def validate(request):
    uploaded = request.FILES.get("fitments")
    if not uploaded:
        return Response({"message": "fitments file is required"}, status=400)

    max_mb = int(os.getenv("MAX_UPLOAD_MB", "10"))
    payload = uploaded.read()
    if len(payload) > max_mb * 1024 * 1024:
        return Response({"message": f"File too large (> {max_mb} MB)"}, status=413)

    # Allow CSV and basic TSV
    text = payload.decode("utf-8", errors="ignore")
    sample = text[:2048]
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=",\t;|")
        delimiter = dialect.delimiter
    except Exception:
        delimiter = ","

    reader = csv.reader(text.splitlines(), delimiter=delimiter)
    try:
        headers = next(reader)
    except StopIteration:
        headers = []

    headers = [h.strip() for h in headers]
    allowed = {
        "partId","partTypeId","configurationId","quantity","position","liftHeight","wheelType",
        "wheelDiameter1","tireDiameter1","backspacing1","title","description","notes"
    }
    ignored_columns = [h for h in headers if h not in allowed]

    repaired_rows = {}
    invalid_rows = {}

    def set_repair(ridx, col, val):
        repaired_rows.setdefault(ridx, {})[col] = val

    def set_invalid(ridx, col, msg):
        invalid_rows.setdefault(ridx, {})[col] = msg

    # Process rows
    for idx, row in enumerate(reader, start=1):
        row_map = {headers[i]: row[i].strip() if i < len(row) else "" for i in range(len(headers))}

        part_id = row_map.get("partId", "")
        if part_id and not part_id.startswith("P-"):
            set_invalid(idx, "partId", "Invalid format - must start with P-")

        qty_raw = row_map.get("quantity", "").strip()
        if qty_raw:
            try:
                qty = int(qty_raw)
                if qty <= 0:
                    set_invalid(idx, "quantity", "Must be a positive number")
            except ValueError:
                set_invalid(idx, "quantity", "Must be a positive number")

        # Normalize liftHeight
        lh = row_map.get("liftHeight", "")
        if lh:
            norm_lh = lh.strip()
            if norm_lh.lower() == "stock":
                set_repair(idx, "liftHeight", "Stock")

        # Normalize tireDiameter1 casing
        td = row_map.get("tireDiameter1", "")
        if td:
            up = td.upper()
            if up != td:
                set_repair(idx, "tireDiameter1", up)

        # Derive or normalize wheelDiameter1
        wd = row_map.get("wheelDiameter1", "").strip()
        if not wd and td:
            # extract digits after 'R' pattern (e.g., 255/55R18 -> 18)
            up = td.upper()
            if "R" in up:
                try:
                    val = "".join(ch for ch in up.split("R")[-1] if ch.isdigit())
                    if val:
                        set_repair(idx, "wheelDiameter1", val)
                except Exception:
                    pass
        elif wd:
            try:
                iv = int(float(wd))
                if str(iv) != wd:
                    set_repair(idx, "wheelDiameter1", str(iv))
            except Exception:
                # keep as-is
                pass

    result = {
        "repairedRows": repaired_rows,
        "invalidRows": invalid_rows,
        "ignoredColumns": ignored_columns,
    }
    VALIDATION_CACHE["result"] = result
    return Response(result)


@api_view(["POST"]) 
def submit(request):
    if not VALIDATION_CACHE.get("result"):
        return Response({"message": "No validated data in memory. Please validate first."}, status=400)
    # For MVP, we acknowledge submission without DB writes.
    return Response({"message": "Fitments submitted"})


class Echo:
    def write(self, value):
        return value


@api_view(["GET"]) 
def export_csv(request):
    qs = Fitment.objects.all()
    qs = _apply_filters(qs, request.query_params)
    qs = _apply_sort(qs, request.query_params.get("sortBy"), request.query_params.get("sortOrder"))
    pseudo_buffer = Echo()
    writer = csv.writer(pseudo_buffer)
    headers = [
        "hash","partId","itemStatus","itemStatusCode","baseVehicleId","year","makeName","modelName","subModelName",
        "driveTypeName","fuelTypeName","bodyNumDoors","bodyTypeName","ptid","partTypeDescriptor","uom","quantity",
        "fitmentTitle","fitmentDescription","fitmentNotes","position","positionId","liftHeight","wheelType","createdAt","createdBy","updatedAt","updatedBy"
    ]
    def row_iter():
        yield writer.writerow(headers)
        for f in qs.iterator():
            yield writer.writerow([
                f.hash,f.partId,f.itemStatus,f.itemStatusCode,f.baseVehicleId,f.year,f.makeName,f.modelName,f.subModelName,
                f.driveTypeName,f.fuelTypeName,f.bodyNumDoors,f.bodyTypeName,f.ptid,f.partTypeDescriptor,f.uom,f.quantity,
                f.fitmentTitle,f.fitmentDescription or "",f.fitmentNotes or "",f.position,f.positionId,f.liftHeight,f.wheelType,
                f.createdAt.isoformat(),f.createdBy,f.updatedAt.isoformat(),f.updatedBy
            ])
    response = StreamingHttpResponse(row_iter(), content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="fitments.csv"'
    return response


@api_view(["GET"]) 
def coverage_export(request):
    # Reuse coverage rows
    data = coverage(request).data
    rows = data.get("items", [])
    pseudo_buffer = Echo()
    writer = csv.writer(pseudo_buffer)
    headers = ["make", "configsCount", "fittedConfigsCount", "coveragePercent", "models"]
    def row_iter():
        yield writer.writerow(headers)
        for r in rows:
            yield writer.writerow([
                r["make"], r["configsCount"], r["fittedConfigsCount"], r["coveragePercent"], ", ".join(r.get("models", []))
            ])
    response = StreamingHttpResponse(row_iter(), content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="coverage.csv"'
    return response


@api_view(["GET"]) 
def export_ai_fitments(request):
    """
    Export AI fitments in JSON, XLS, or CSV export_format.
    Query parameters:
    - export_format: json|xls|csv (default: json)
    - session_id: UUID for session tracking (optional)
    - fitment_ids: comma-separated list of fitment hashes (optional)
    """
    format_type = request.query_params.get('export_format', 'json').lower()
    session_id = request.query_params.get('session_id')
    fitment_ids_param = request.query_params.get('fitment_ids', '')
    
    # Parse fitment IDs
    fitment_ids = []
    if fitment_ids_param:
        fitment_ids = [id.strip() for id in fitment_ids_param.split(',') if id.strip()]
    
    # Get fitments based on parameters
    if fitment_ids:
        # Filter by specific fitment IDs
        qs = Fitment.objects.filter(hash__in=fitment_ids)
    elif session_id:
        # For session-based filtering, we'll use a simple approach
        # In a real implementation, you might have a session model
        # For now, we'll filter by createdBy='api' and recent creation
        qs = Fitment.objects.filter(createdBy='api').order_by('-createdAt')[:100]
    else:
        # Get all fitments
        qs = Fitment.objects.all()
    
    # Apply additional filters if needed
    qs = _apply_filters(qs, request.query_params)
    qs = _apply_sort(qs, request.query_params.get("sortBy"), request.query_params.get("sortOrder"))
    
    # Convert to list of dictionaries
    fitments_data = list(qs.values())
    
    if format_type == 'json':
        return Response({
            'session_id': session_id,
            'fitment_ids': fitment_ids,
            'total_count': len(fitments_data),
            'fitments': fitments_data
        })
    
    elif format_type == 'csv':
        return _export_csv_response(fitments_data, 'ai_fitments')
    
    elif format_type in ['xls', 'xlsx']:
        return _export_xls_response(fitments_data, 'ai_fitments')
    
    else:
        return Response({'error': 'Invalid export_format. Use json, csv, or xlsx'}, status=400)


def _export_csv_response(fitments_data, filename_prefix):
    """Helper function to create CSV export response"""
    pseudo_buffer = Echo()
    writer = csv.writer(pseudo_buffer)
    headers = [
        "hash","partId","itemStatus","itemStatusCode","baseVehicleId","year","makeName","modelName","subModelName",
        "driveTypeName","fuelTypeName","bodyNumDoors","bodyTypeName","ptid","partTypeDescriptor","uom","quantity",
        "fitmentTitle","fitmentDescription","fitmentNotes","position","positionId","liftHeight","wheelType","createdAt","createdBy","updatedAt","updatedBy"
    ]
    
    def row_iter():
        yield writer.writerow(headers)
        for f in fitments_data:
            yield writer.writerow([
                f.get('hash', ''), f.get('partId', ''), f.get('itemStatus', ''), f.get('itemStatusCode', ''),
                f.get('baseVehicleId', ''), f.get('year', ''), f.get('makeName', ''), f.get('modelName', ''),
                f.get('subModelName', ''), f.get('driveTypeName', ''), f.get('fuelTypeName', ''),
                f.get('bodyNumDoors', ''), f.get('bodyTypeName', ''), f.get('ptid', ''),
                f.get('partTypeDescriptor', ''), f.get('uom', ''), f.get('quantity', ''),
                f.get('fitmentTitle', ''), f.get('fitmentDescription', '') or "", f.get('fitmentNotes', '') or "",
                f.get('position', ''), f.get('positionId', ''), f.get('liftHeight', ''), f.get('wheelType', ''),
                f.get('createdAt', ''), f.get('createdBy', ''), f.get('updatedAt', ''), f.get('updatedBy', '')
            ])
    
    response = StreamingHttpResponse(row_iter(), content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="{filename_prefix}.csv"'
    return response


def _export_xls_response(fitments_data, filename_prefix):
    """Helper function to create XLS export response"""
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "AI Fitments"
    
    # Define headers
    headers = [
        "Hash", "Part ID", "Item Status", "Item Status Code", "Base Vehicle ID", "Year", "Make Name", "Model Name", "Sub Model Name",
        "Drive Type Name", "Fuel Type Name", "Body Num Doors", "Body Type Name", "PTID", "Part Type Descriptor", "UOM", "Quantity",
        "Fitment Title", "Fitment Description", "Fitment Notes", "Position", "Position ID", "Lift Height", "Wheel Type", "Created At", "Created By", "Updated At", "Updated By"
    ]
    
    # Style for headers
    header_font = Font(bold=True)
    header_fill = PatternFill(start_color="CCCCCC", end_color="CCCCCC", fill_type="solid")
    
    # Write headers
    for col, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col, value=header)
        cell.font = header_font
        cell.fill = header_fill
    
    # Write data
    for row, fitment in enumerate(fitments_data, 2):
        ws.cell(row=row, column=1, value=fitment.get('hash', ''))
        ws.cell(row=row, column=2, value=fitment.get('partId', ''))
        ws.cell(row=row, column=3, value=fitment.get('itemStatus', ''))
        ws.cell(row=row, column=4, value=fitment.get('itemStatusCode', ''))
        ws.cell(row=row, column=5, value=fitment.get('baseVehicleId', ''))
        ws.cell(row=row, column=6, value=fitment.get('year', ''))
        ws.cell(row=row, column=7, value=fitment.get('makeName', ''))
        ws.cell(row=row, column=8, value=fitment.get('modelName', ''))
        ws.cell(row=row, column=9, value=fitment.get('subModelName', ''))
        ws.cell(row=row, column=10, value=fitment.get('driveTypeName', ''))
        ws.cell(row=row, column=11, value=fitment.get('fuelTypeName', ''))
        ws.cell(row=row, column=12, value=fitment.get('bodyNumDoors', ''))
        ws.cell(row=row, column=13, value=fitment.get('bodyTypeName', ''))
        ws.cell(row=row, column=14, value=fitment.get('ptid', ''))
        ws.cell(row=row, column=15, value=fitment.get('partTypeDescriptor', ''))
        ws.cell(row=row, column=16, value=fitment.get('uom', ''))
        ws.cell(row=row, column=17, value=fitment.get('quantity', ''))
        ws.cell(row=row, column=18, value=fitment.get('fitmentTitle', ''))
        ws.cell(row=row, column=19, value=fitment.get('fitmentDescription', '') or '')
        ws.cell(row=row, column=20, value=fitment.get('fitmentNotes', '') or '')
        ws.cell(row=row, column=21, value=fitment.get('position', ''))
        ws.cell(row=row, column=22, value=fitment.get('positionId', ''))
        ws.cell(row=row, column=23, value=fitment.get('liftHeight', ''))
        ws.cell(row=row, column=24, value=fitment.get('wheelType', ''))
        ws.cell(row=row, column=25, value=str(fitment.get('createdAt', '')))
        ws.cell(row=row, column=26, value=fitment.get('createdBy', ''))
        ws.cell(row=row, column=27, value=str(fitment.get('updatedAt', '')))
        ws.cell(row=row, column=28, value=fitment.get('updatedBy', ''))
    
    # Auto-adjust column widths
    for column in ws.columns:
        max_length = 0
        column_letter = column[0].column_letter
        for cell in column:
            try:
                if len(str(cell.value)) > max_length:
                    max_length = len(str(cell.value))
            except:
                pass
        adjusted_width = min(max_length + 2, 50)
        ws.column_dimensions[column_letter].width = adjusted_width
    
    # Save to BytesIO
    output = BytesIO()
    wb.save(output)
    output.seek(0)
    
    response = HttpResponse(
        output.getvalue(),
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    response['Content-Disposition'] = f'attachment; filename="{filename_prefix}.xlsx"'
    return response


@api_view(["GET"]) 
def ai_fitments_list(request):
    """
    Retrieve AI-generated fitments for a session.
    Query parameters:
    - session_id: UUID for session tracking (optional)
    - limit: Number of results to return (default: 100)
    - offset: Number of results to skip (default: 0)
    """
    session_id = request.query_params.get('session_id')
    limit = int(request.query_params.get('limit', 100))
    offset = int(request.query_params.get('offset', 0))
    
    # Get AI-generated fitments (those created by 'api' user)
    qs = Fitment.objects.filter(createdBy='api')
    
    # Apply session filtering if provided
    if session_id:
        # For now, we'll use a simple approach based on creation time
        # In a real implementation, you might have a session model
        qs = qs.order_by('-createdAt')
    
    # Apply additional filters
    qs = _apply_filters(qs, request.query_params)
    qs = _apply_sort(qs, request.query_params.get("sortBy"), request.query_params.get("sortOrder"))
    
    # Apply pagination
    total_count = qs.count()
    fitments = list(qs[offset:offset + limit].values())
    
    return Response({
        'session_id': session_id,
        'total_count': total_count,
        'limit': limit,
        'offset': offset,
        'fitments': fitments
    })


@api_view(["GET"]) 
def applied_fitments_list(request):
    """
    Get all applied fitments with optional session filter.
    Query parameters:
    - session_id: UUID for session tracking (optional)
    - limit: Number of results to return (default: 100)
    - offset: Number of results to skip (default: 0)
    """
    session_id = request.query_params.get('session_id')
    limit = int(request.query_params.get('limit', 100))
    offset = int(request.query_params.get('offset', 0))
    
    # Get all fitments (applied fitments are those in the main Fitment table)
    qs = Fitment.objects.all()
    
    # Apply session filtering if provided
    if session_id:
        # For session-based filtering, we'll use a simple approach
        # In a real implementation, you might have a session model
        qs = qs.filter(createdBy='api').order_by('-createdAt')
    
    # Apply additional filters
    qs = _apply_filters(qs, request.query_params)
    qs = _apply_sort(qs, request.query_params.get("sortBy"), request.query_params.get("sortOrder"))
    
    # Apply pagination
    total_count = qs.count()
    fitments = list(qs[offset:offset + limit].values())
    
    return Response({
        'session_id': session_id,
        'total_count': total_count,
        'limit': limit,
        'offset': offset,
        'fitments': fitments
    })


@api_view(["GET"])
def fitment_detail(request, fitment_hash):
    """Get detailed information for a specific fitment"""
    try:
        # Allow access to soft deleted fitments for detail view
        fitment = Fitment.all_objects.get(hash=fitment_hash)
        fitment_data = {
            'hash': fitment.hash,
            'partId': fitment.partId,
            'itemStatus': fitment.itemStatus,
            'itemStatusCode': fitment.itemStatusCode,
            'baseVehicleId': fitment.baseVehicleId,
            'year': fitment.year,
            'makeName': fitment.makeName,
            'modelName': fitment.modelName,
            'subModelName': fitment.subModelName,
            'driveTypeName': fitment.driveTypeName,
            'fuelTypeName': fitment.fuelTypeName,
            'bodyNumDoors': fitment.bodyNumDoors,
            'bodyTypeName': fitment.bodyTypeName,
            'ptid': fitment.ptid,
            'partTypeDescriptor': fitment.partTypeDescriptor,
            'uom': fitment.uom,
            'quantity': fitment.quantity,
            'fitmentTitle': fitment.fitmentTitle,
            'fitmentDescription': fitment.fitmentDescription,
            'fitmentNotes': fitment.fitmentNotes,
            'position': fitment.position,
            'positionId': fitment.positionId,
            'liftHeight': fitment.liftHeight,
            'wheelType': fitment.wheelType,
            'fitmentType': fitment.fitmentType,
            'createdAt': fitment.createdAt.isoformat(),
            'createdBy': fitment.createdBy,
            'updatedAt': fitment.updatedAt.isoformat(),
            'updatedBy': fitment.updatedBy,
        }
        return Response(fitment_data)
    except Fitment.DoesNotExist:
        return Response(
            {"error": "Fitment not found"}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Error getting fitment detail: {str(e)}")
        return Response(
            {"error": "Failed to get fitment details"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["PUT", "PATCH"])
def update_fitment(request, fitment_hash):
    """Update a specific fitment"""
    try:
        # Allow updating soft deleted fitments (they can be restored during update)
        fitment = Fitment.all_objects.get(hash=fitment_hash)
        
        # Get the data from request
        data = request.data
        
        # Update allowed fields
        allowed_fields = [
            'itemStatus', 'itemStatusCode', 'year', 'makeName', 'modelName', 
            'subModelName', 'driveTypeName', 'fuelTypeName', 'bodyNumDoors', 
            'bodyTypeName', 'ptid', 'partTypeDescriptor', 'uom', 'quantity',
            'fitmentTitle', 'fitmentDescription', 'fitmentNotes', 'position',
            'positionId', 'liftHeight', 'wheelType', 'fitmentType'
        ]
        
        for field in allowed_fields:
            if field in data:
                setattr(fitment, field, data[field])
        
        # Always update the updatedBy and updatedAt fields
        fitment.updatedBy = data.get('updatedBy', 'api_user')
        
        # If the fitment was soft deleted, restore it
        if fitment.isDeleted:
            fitment.restore(restored_by=fitment.updatedBy)
        else:
            fitment.save()
        
        return Response({
            "message": "Fitment updated successfully",
            "hash": fitment.hash,
            "updatedAt": fitment.updatedAt.isoformat()
        })
        
    except Fitment.DoesNotExist:
        return Response(
            {"error": "Fitment not found"}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Error updating fitment: {str(e)}")
        return Response(
            {"error": "Failed to update fitment"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["GET"])
def fitment_filter_options(request):
    """Get filter options for fitments (unique values for dropdowns)"""
    try:
        # Get unique values for various filter fields
        options = {
            'itemStatus': list(Fitment.objects.values_list('itemStatus', flat=True).distinct().order_by('itemStatus')),
            'makeName': list(Fitment.objects.values_list('makeName', flat=True).distinct().order_by('makeName')),
            'modelName': list(Fitment.objects.values_list('modelName', flat=True).distinct().order_by('modelName')),
            'driveTypeName': list(Fitment.objects.values_list('driveTypeName', flat=True).distinct().order_by('driveTypeName')),
            'fuelTypeName': list(Fitment.objects.values_list('fuelTypeName', flat=True).distinct().order_by('fuelTypeName')),
            'bodyTypeName': list(Fitment.objects.values_list('bodyTypeName', flat=True).distinct().order_by('bodyTypeName')),
            'partTypeDescriptor': list(Fitment.objects.values_list('partTypeDescriptor', flat=True).distinct().order_by('partTypeDescriptor')),
            'position': list(Fitment.objects.values_list('position', flat=True).distinct().order_by('position')),
            'liftHeight': list(Fitment.objects.values_list('liftHeight', flat=True).distinct().order_by('liftHeight')),
            'wheelType': list(Fitment.objects.values_list('wheelType', flat=True).distinct().order_by('wheelType')),
            'fitmentType': list(Fitment.objects.values_list('fitmentType', flat=True).distinct().order_by('fitmentType')),
            'createdBy': list(Fitment.objects.values_list('createdBy', flat=True).distinct().order_by('createdBy')),
            'yearRange': {
                'min': Fitment.objects.aggregate(min_year=Min('year'))['min_year'] or 2000,
                'max': Fitment.objects.aggregate(max_year=Max('year'))['max_year'] or 2030
            }
        }
        
        return Response(options)
        
    except Exception as e:
        logger.error(f"Error getting filter options: {str(e)}")
        return Response(
            {"error": "Failed to get filter options"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["GET"])
def export_fitments_advanced_csv(request):
    """Export fitments with advanced filtering in CSV or XLSX format"""
    try:
        print(request.query_params)
        
        # Get filtered queryset
        qs = Fitment.objects.all()
        qs = _apply_filters(qs, request.query_params)
        qs = _apply_sort(qs, request.query_params.get("sortBy"), request.query_params.get("sortOrder"))
        
        # Convert to list of dictionaries
        fitments_data = list(qs.values())
        
        
        return _export_csv_response(fitments_data, 'fitments_export')
        
            
    except Exception as e:
        logger.error(f"Error exporting fitments: {str(e)}")
        return Response(
            {"error": "Failed to export fitments"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(["GET"])
def export_fitments_advanced_xlsx(request):
    """Export fitments with advanced filtering in CSV or XLSX format"""
    try:
        print(request.query_params)
        
        # Get filtered queryset
        qs = Fitment.objects.all()
        qs = _apply_filters(qs, request.query_params)
        qs = _apply_sort(qs, request.query_params.get("sortBy"), request.query_params.get("sortOrder"))
        
        # Convert to list of dictionaries
        fitments_data = list(qs.values())
        

        return _export_xls_response(fitments_data, 'fitments_export')
        
            
    except Exception as e:
        logger.error(f"Error exporting fitments: {str(e)}")
        return Response(
            {"error": "Failed to export fitments"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["DELETE"])
def delete_fitment(request, fitment_hash):
    """Soft delete a specific fitment"""
    try:
        fitment = Fitment.all_objects.get(hash=fitment_hash)
        deleted_by = request.data.get('deletedBy', 'api_user')
        fitment.soft_delete(deleted_by=deleted_by)
        
        return Response({
            "message": "Fitment deleted successfully",
            "hash": fitment_hash,
            "deletedAt": fitment.deletedAt.isoformat() if fitment.deletedAt else None
        })
        
    except Fitment.DoesNotExist:
        return Response(
            {"error": "Fitment not found"}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Error deleting fitment: {str(e)}")
        return Response(
            {"error": "Failed to delete fitment"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@csrf_exempt
@require_http_methods(["POST"])
def validate_fitments_csv(request):
    """Validate uploaded CSV file"""
    try:
        # Get uploaded file
        if 'fitments' not in request.FILES:
            return JsonResponse({'error': 'No file uploaded'}, status=400)
            
        csv_file = request.FILES['fitments']
        
        # Validate file type
        if not csv_file.name.lower().endswith(('.csv', '.xlsx', '.xls')):
            return JsonResponse({'error': 'Only CSV and Excel files are allowed'}, status=400)
        
        # Validate file size (10MB limit)
        if csv_file.size > 10 * 1024 * 1024:
            return JsonResponse({'error': 'File size must be less than 10MB'}, status=400)
        
        # Create session
        session_id = uuid.uuid4()
        session = FitmentUploadSession.objects.create(
            user=request.user if hasattr(request, 'user') and request.user.is_authenticated else None,
            session_id=session_id,
            status='validating',
            file_name=csv_file.name
        )
        
        # Read CSV/Excel file
        try:
            if csv_file.name.lower().endswith('.csv'):
                df = pd.read_csv(csv_file)
            else:
                df = pd.read_excel(csv_file)
        except Exception as e:
            session.status = 'failed'
            session.save()
            return JsonResponse({'error': f'Error reading file: {str(e)}'}, status=400)
        
        # Update session with total rows
        session.total_rows = len(df)
        session.save()
        
        validation_results = []
        repaired_rows = {}
        invalid_rows = {}
        ignored_columns = []
        
        # Validate each row
        for index, row in df.iterrows():
            row_number = index + 2  # +2 for header and 0-based indexing
            
            validation_result = validate_fitment_row(row, row_number)
            
            if validation_result['is_valid']:
                # Row is valid - store all fields as valid
                for column, value in row.items():
                    FitmentValidationResult.objects.create(
                        session=session,
                        row_number=row_number,
                        column_name=column,
                        original_value=str(value) if not pd.isna(value) else '',
                        is_valid=True
                    )
            elif validation_result['can_repair']:
                # Row can be auto-repaired
                repaired_rows[row_number] = validation_result['repairs']
                for column, value in row.items():
                    corrected_value = validation_result['repairs'].get(column, value)
                    FitmentValidationResult.objects.create(
                        session=session,
                        row_number=row_number,
                        column_name=column,
                        original_value=str(value) if not pd.isna(value) else '',
                        corrected_value=str(corrected_value) if not pd.isna(corrected_value) else '',
                        is_valid=True,
                        error_message='Auto-corrected' if column in validation_result['repairs'] else None
                    )
            else:
                # Row has errors that cannot be auto-repaired
                invalid_rows[row_number] = validation_result['errors']
                for column, value in row.items():
                    error_message = validation_result['errors'].get(column)
                    FitmentValidationResult.objects.create(
                        session=session,
                        row_number=row_number,
                        column_name=column,
                        original_value=str(value) if not pd.isna(value) else '',
                        is_valid=column not in validation_result['errors'],
                        error_message=error_message
                    )
        
        # Calculate statistics
        valid_rows = session.total_rows - len(invalid_rows)
        session.valid_rows = valid_rows
        session.invalid_rows = len(invalid_rows)
        session.status = 'validated'
        session.save()
        
        return JsonResponse({
            'session_id': str(session_id),
            'repairedRows': repaired_rows,
            'invalidRows': invalid_rows,
            'ignoredColumns': ignored_columns,
            'totalRows': session.total_rows,
            'validRows': valid_rows,
            'invalidRowsCount': len(invalid_rows)
        })
        
    except Exception as e:
        logger.error(f"Error validating CSV: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def submit_validated_fitments(request, session_id):
    """Submit validated fitments to database"""
    try:
        session = FitmentUploadSession.objects.get(
            session_id=session_id,
            user=request.user if hasattr(request, 'user') and request.user.is_authenticated else None,
            status='validated'
        )
        
        # Get all valid validation results
        valid_results = FitmentValidationResult.objects.filter(
            session=session,
            is_valid=True
        )
        
        if not valid_results.exists():
            return JsonResponse({
                'error': 'No valid fitments to submit'
            }, status=400)
        
        # Group by row number and create fitment records
        rows_data = {}
        for result in valid_results:
            row_num = result.row_number
            if row_num not in rows_data:
                rows_data[row_num] = {}
            
            # Use corrected value if available, otherwise original
            value = result.corrected_value or result.original_value
            rows_data[row_num][result.column_name] = value
        
        # Create fitment records
        created_count = 0
        skipped_count = 0
        errors = []
        
        for row_number, row_data in rows_data.items():
            try:
                # Validate required fields
                required_fields = ['PartID', 'YearID', 'MakeName', 'ModelName', 'PTID']
                for field in required_fields:
                    if not row_data.get(field):
                        raise ValueError(f'Missing required field: {field}')
                
                # Check for existing fitment with same key data
                existing_fitment = Fitment.objects.filter(
                    partId=row_data['PartID'],
                    year=int(row_data['YearID']),
                    makeName=row_data['MakeName'],
                    modelName=row_data['ModelName'],
                    ptid=row_data['PTID'],
                    isDeleted=False
                ).first()
                
                if existing_fitment:
                    skipped_count += 1
                    continue  # Skip creating duplicate
                
                # Create fitment record
                fitment = Fitment.objects.create(
                    partId=row_data['PartID'],
                    year=int(row_data['YearID']),
                    makeName=row_data['MakeName'],
                    modelName=row_data['ModelName'],
                    subModelName=row_data.get('SubModelName', ''),
                    driveTypeName=row_data.get('DriveTypeName', ''),
                    fuelTypeName=row_data.get('FuelTypeName', ''),
                    bodyNumDoors=int(row_data.get('BodyNumDoors', 4)),
                    bodyTypeName=row_data.get('BodyTypeName', ''),
                    ptid=row_data['PTID'],
                    partTypeDescriptor=row_data.get('PTID', ''),  # Using PTID as descriptor
                    quantity=int(row_data.get('Quantity', 1)),
                    fitmentTitle=row_data.get('FitmentTitle', ''),
                    fitmentDescription=row_data.get('FitmentDescription', ''),
                    fitmentNotes=row_data.get('FitmentNotes', ''),
                    position=row_data.get('Position', ''),
                    positionId=int(row_data.get('PositionId', 1)),
                    liftHeight=row_data.get('LiftHeight', ''),
                    uom=row_data.get('UOM', 'EA'),
                    wheelType=row_data.get('WheelType', ''),
                    fitmentType='manual_fitment',
                    createdBy='bulk_upload',
                    updatedBy='bulk_upload'
                )
                created_count += 1
                
            except Exception as e:
                errors.append(f'Row {row_number}: {str(e)}')
                continue
        
        # Update session status
        session.status = 'submitted'
        session.save()
        
        return JsonResponse({
            'success': True,
            'created_count': created_count,
            'skipped_count': skipped_count,
            'total_rows': len(rows_data),
            'errors': errors,
            'message': f'Successfully created {created_count} fitments' + (f', skipped {skipped_count} duplicates' if skipped_count > 0 else '')
        })
        
    except FitmentUploadSession.DoesNotExist:
        return JsonResponse({'error': 'Session not found'}, status=404)
    except Exception as e:
        logger.error(f"Error submitting fitments: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)


@require_http_methods(["GET"])
def get_validation_results(request, session_id):
    """Get validation results for a session"""
    try:
        session = FitmentUploadSession.objects.get(
            session_id=session_id,
            user=request.user if hasattr(request, 'user') and request.user.is_authenticated else None
        )
        
        # Get validation results grouped by row
        validation_results = FitmentValidationResult.objects.filter(session=session)
        
        # Group by row number
        rows_data = {}
        for result in validation_results:
            row_num = result.row_number
            if row_num not in rows_data:
                rows_data[row_num] = {
                    'is_valid': result.is_valid,
                    'errors': {},
                    'repairs': {}
                }
            
            if result.is_valid and result.corrected_value:
                rows_data[row_num]['repairs'][result.column_name] = result.corrected_value
            elif not result.is_valid:
                rows_data[row_num]['errors'][result.column_name] = result.error_message
        
        # Separate valid, invalid, and repaired rows
        invalid_rows = {k: v['errors'] for k, v in rows_data.items() if v['errors']}
        repaired_rows = {k: v['repairs'] for k, v in rows_data.items() if v['repairs']}
        
        return JsonResponse({
            'session_id': str(session_id),
            'invalidRows': invalid_rows,
            'repairedRows': repaired_rows,
            'ignoredColumns': [],  # Could be stored in session
            'totalRows': session.total_rows,
            'validRows': session.valid_rows,
            'invalidRowsCount': session.invalid_rows
        })
        
    except FitmentUploadSession.DoesNotExist:
        return JsonResponse({'error': 'Session not found'}, status=404)
