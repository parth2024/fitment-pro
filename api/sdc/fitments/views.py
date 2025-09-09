from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.db.models import Q
from django.http import StreamingHttpResponse
from .models import Fitment
import os
import csv


# Create your views here.


def _apply_filters(queryset, params):
    search = params.get("search")
    if search:
        q = Q(partId__icontains=search) | Q(makeName__icontains=search) | Q(modelName__icontains=search)
        queryset = queryset.filter(q)
    return queryset


def _apply_sort(queryset, sort_by: str | None, sort_order: str | None):
    allowed = {"partId", "makeName", "modelName", "year", "updatedAt"}
    field = sort_by if sort_by in allowed else "partId"
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

    # DELETE (bulk by hashes param)
    hashes = request.query_params.getlist("hashes") or []
    deleted, _ = Fitment.objects.filter(hash__in=hashes).delete()
    return Response({"message": f"Deleted {deleted} fitments"})


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
