from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from django.conf import settings
from django.db.models import Q
from django.http import Http404
import os
import uuid
import requests

from azure.storage.blob import BlobServiceClient, ContentSettings
from azure.core.exceptions import ResourceExistsError
from .utils import preflight, compute_checksum

from .models import Upload, Job, NormalizationResult, Lineage, Preset
from tenants.models import Tenant
from tenants.utils import get_tenant_from_request, filter_queryset_by_tenant, get_tenant_id_from_request
from fitments.models import Fitment
from data_uploads.models import ProductData
from django.core.exceptions import ValidationError
import uuid


def _storage_dir() -> str:
    base = os.environ.get("STORAGE_DIR") or os.path.join(settings.BASE_DIR, "..", "storage", "customer")
    os.makedirs(base, exist_ok=True)
    return base


def get_or_create_upload_job(upload, data_type="fitments"):
    """
    Get or create a single job for an upload that tracks the entire data upload flow.
    This ensures we have one job per upload instead of multiple jobs for each step.
    """
    # Try to find existing job for this upload with type "data-upload"
    job = Job.objects.filter(
        upload_id=upload.id,
        job_type="data-upload"
    ).order_by("-created_at").first()
    
    if not job:
        # Create new job for this upload
        job = Job.objects.create(
            tenant_id=upload.tenant_id,
            upload_id=upload.id,
            job_type="data-upload",
            status="ai-mapping",
            params={
                "presetId": upload.preset_id,
                "dataType": data_type,
                "currentStage": "ai-mapping",
            },
        )
    
    return job  # Make sure to return the job


@api_view(["GET", "POST"]) 
def uploads(request):
    if request.method == "GET":
        qs = filter_queryset_by_tenant(Upload.objects.all(), request)
        items = list(qs.order_by("-created_at").values())
        return Response({
            "items": items, 
            "totalCount": len(items),
            "tenant_id": get_tenant_id_from_request(request)
        })

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

    # Always use local storage (per user requirement)
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
    # Get or create single job for this upload
    upload = Upload.objects.get(id=upload_id)
    data_type = request.data.get("dataType") or (upload.preflight_report.get("dataType") if upload.preflight_report else "fitments")
    job = get_or_create_upload_job(upload, data_type)
    
    # Update job status to ai-mapping
    job.status = "ai-mapping"
    job.params = job.params or {}
    job.params["currentStage"] = "ai-mapping"
    job.params["dataType"] = data_type
    job.started_at = job.started_at or timezone.now()
    job.save()
    
    # Read file and extract headers + sample data
    import pandas as pd
    import json
    
    try:
        # Read the uploaded file
        if upload.storage_url.startswith('http'):
            # Azure Blob - skip for now, use local only
            sample_data = []
            headers = upload.preflight_report.get("headers", []) if upload.preflight_report else []
        else:
            # Local file
            if upload.file_format == "xlsx":
                df = pd.read_excel(upload.storage_url, nrows=10)
            else:
                delimiter = upload.preflight_report.get("delimiter", ",") if upload.preflight_report else ","
                encoding = upload.preflight_report.get("encoding", "utf-8") if upload.preflight_report else "utf-8"
                df = pd.read_csv(upload.storage_url, delimiter=delimiter, encoding=encoding, nrows=10)
            
            headers = df.columns.tolist()
            sample_data = df.head(5).to_dict(orient="records")
    except Exception as e:
        # Fallback to preflight report
        headers = upload.preflight_report.get("headers", []) if upload.preflight_report else []
        sample_data = []
    
    # Try Azure AI Foundry first
    suggestions = None
    endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
    api_key = os.getenv("AZURE_OPENAI_API_KEY")
    deployment = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME", "gpt-4")
    
    if endpoint and api_key:
        try:
            from openai import AzureOpenAI
            client = AzureOpenAI(
                api_version=os.getenv("AZURE_OPENAI_API_VERSION", "2024-12-01-preview"),
                azure_endpoint=endpoint,
                api_key=api_key,
            )
            
            # Determine target schema based on upload type (from request or stored in upload)
            data_type = request.data.get("dataType") or (upload.preflight_report.get("dataType") if upload.preflight_report else "fitments")
            
            # Get entity configuration from request or tenant
            entity_config = request.data.get("entityConfig", {})
            tenant = upload.tenant
            fitment_settings = tenant.fitment_settings if tenant and hasattr(tenant, 'fitment_settings') else {}
            
            # Use entity config if provided, otherwise fall back to tenant settings
            if not entity_config and fitment_settings:
                entity_config = {
                    "requiredVcdbFields": fitment_settings.get("required_vcdb_fields", []),
                    "optionalVcdbFields": fitment_settings.get("optional_vcdb_fields", []),
                    "requiredProductFields": fitment_settings.get("required_product_fields", []),
                    "partNumberSkuDescription": fitment_settings.get("part_number_sku_description", ""),
                    "ptidMatch": fitment_settings.get("ptid_match", False),
                    "seekParentChild": fitment_settings.get("seek_parent_child_relationships", False),
                    "parentChildExample": fitment_settings.get("parent_child_example_format", ""),
                    "additionalAttributes": fitment_settings.get("additional_attributes", []),
                }
            
            # Mapping function for display names to field names
            def map_display_to_field(display_name):
                """Convert display names to field names"""
                if not display_name:
                    return None
                display_lower = str(display_name).lower()
                mapping = {
                    "year (model year)": "year",
                    "make (manufacturer": "makeName",
                    "model (e.g.": "modelName",
                    "submodel / trim": "subModelName",
                    "body type": "bodyTypeName",
                    "body number of doors": "bodyNumDoors",
                    "drive type": "driveTypeName",
                    "fuel type": "fuelTypeName",
                    "engine base": "engineBase",
                    "engine liter": "engine",
                    "engine cylinders": "engineCylinders",
                    "engine vin code": "engineVINCode",
                    "engine block type": "engineBlockType",
                    "transmission type": "transmissionType",
                    "transmission speeds": "transmissionSpeeds",
                    "transmission control type": "transmissionControlType",
                    "bed type": "bedType",
                    "bed length": "bedLength",
                    "wheelbase": "wheelbase",
                    "region": "region",
                }
                for key, value in mapping.items():
                    if key in display_lower:
                        return value
                # Fallback: try to extract from display name
                if "year" in display_lower:
                    return "year"
                elif "make" in display_lower:
                    return "makeName"
                elif "model" in display_lower and "submodel" not in display_lower:
                    return "modelName"
                elif "submodel" in display_lower or "trim" in display_lower:
                    return "subModelName"
                elif "body" in display_lower and "type" in display_lower:
                    return "bodyTypeName"
                elif "doors" in display_lower:
                    return "bodyNumDoors"
                elif "drive" in display_lower:
                    return "driveTypeName"
                elif "fuel" in display_lower:
                    return "fuelTypeName"
                elif "engine" in display_lower and "liter" in display_lower:
                    return "engine"
                elif "transmission" in display_lower and "type" in display_lower:
                    return "transmissionType"
                elif "transmission" in display_lower and "speed" in display_lower:
                    return "transmissionSpeeds"
                elif "bed" in display_lower and "type" in display_lower:
                    return "bedType"
                elif "bed" in display_lower and "length" in display_lower:
                    return "bedLength"
                elif "wheelbase" in display_lower:
                    return "wheelbase"
                elif "region" in display_lower:
                    return "region"
                return None
            
            # Build target fields based on configuration
            if data_type == "fitments":
                required_display = entity_config.get("requiredVcdbFields", [])
                optional_display = entity_config.get("optionalVcdbFields", [])
                # Map display names to field names
                required_fields = []
                for field in required_display:
                    mapped = map_display_to_field(field)
                    if mapped:
                        required_fields.append(mapped)
                optional_fields = []
                for field in optional_display:
                    mapped = map_display_to_field(field)
                    if mapped:
                        optional_fields.append(mapped)
                # Always include year, makeName, modelName
                target_fields = list(set(required_fields + optional_fields + ["year", "makeName", "modelName"]))
                # If no config, use defaults
                if not target_fields or len(target_fields) <= 3:
                    target_fields = [
                        "year", "makeName", "modelName", "subModelName", "engine", "trim", 
                        "driveTypeName", "bedType", "cab", "bodyTypeName", "position", "partId", 
                        "partName", "productType", "kitParts", "rotorDiameter", 
                        "rotorThickness", "boltPattern", "centerHoleDiameter"
                    ]
            else:  # products
                required_fields = entity_config.get("requiredProductFields", [])
                additional_attrs = entity_config.get("additionalAttributes", [])
                target_fields = ["partId", "description"]  # Always required
                if "partName" not in target_fields:
                    target_fields.append("partName")
                if "category" not in target_fields:
                    target_fields.append("category")
                if "partType" not in target_fields:
                    target_fields.append("partType")
                # Add additional attributes
                for attr in additional_attrs:
                    attr_name = (attr.get("name", "") or "").lower().replace(" ", "_")
                    if attr_name and attr_name not in target_fields:
                        target_fields.append(attr_name)
                # If no config, use defaults
                if len(target_fields) <= 4:
                    target_fields = ["partId", "partName", "description", "category", "partType", "specifications"]
            
            # Build comprehensive sample data string with all column values
            sample_data_str = ""
            if sample_data:
                for idx, row in enumerate(sample_data[:5]):
                    sample_data_str += f"\nRow {idx + 1}:\n"
                    for col, val in row.items():
                        if pd.notna(val) and str(val).strip():
                            sample_data_str += f"  {col}: {str(val)[:100]}\n"  # Limit value length
            
            # Build configuration context for AI prompt
            config_context = ""
            if data_type == "fitments":
                required_vcdb = entity_config.get("requiredVcdbFields", [])
                if required_vcdb:
                    # Get the first required field (could be display name, extract key part)
                    identifier_field = required_vcdb[0]
                    # Extract key word from display name (e.g., "Year (model year)" -> "Year")
                    if "(" in identifier_field:
                        identifier_field = identifier_field.split("(")[0].strip()
                    config_context += f"\nSOURCE IDENTIFIER FIELD: The '{identifier_field}' column should be prioritized for matching against VCDB part identifiers.\n"
            else:  # products
                required_product = entity_config.get("requiredProductFields", [])
                sku_desc = entity_config.get("partNumberSkuDescription", "")
                if required_product:
                    config_context += f"\nSOURCE IDENTIFIER FIELD: The '{required_product[0]}' column should be used as the unique part identifier."
                    if sku_desc:
                        config_context += f"\nUser description: \"{sku_desc}\"\n"
                ptid_match = entity_config.get("ptidMatch", False)
                if ptid_match:
                    config_context += "\nPTID MATCHING: Enabled - Products should be validated against Part Type ID database.\n"
                seek_parent = entity_config.get("seekParentChild", False)
                if seek_parent:
                    parent_example = entity_config.get("parentChildExample", "")
                    config_context += f"\nPARENT/CHILD RELATIONSHIPS: Enabled - Detect product hierarchies.\n"
                    if parent_example:
                        config_context += f"Example format: {parent_example}\n"
                additional_attrs = entity_config.get("additionalAttributes", [])
                if additional_attrs:
                    config_context += "\nADDITIONAL ATTRIBUTES:\n"
                    for attr in additional_attrs:
                        attr_name = attr.get("name", "")
                        attr_values = attr.get("value", "")
                        acpn = attr.get("acpn_recommendations", False)
                        acpn_note = " (ACPN Compliant - Use AutoCare PIES standard naming)" if acpn else ""
                        config_context += f"- {attr_name}{acpn_note}: {attr_values}\n"
            
            prompt = f"""You are an expert automotive data mapping specialist with advanced NLP capabilities. Your task is to map messy, unpredictable source data to VCDB-standard target fields and ensure the output is properly formatted for database storage.

SOURCE COLUMNS (may have inconsistent names):
{', '.join(headers)}

TARGET FIELDS (VCDB standards - MUST map to these exact field names):
{', '.join(target_fields)}
{config_context}

SAMPLE DATA (analyze ALL columns for hidden information):
{sample_data_str}

CRITICAL INSTRUCTIONS - Handle Messy Data and Ensure VCDB Compliance:

1. **Extract Year/Make/Model from ANYWHERE**: 
   - If Year/Make/Model aren't in obvious columns, extract from ANY column:
   - Descriptions: "Brake Pad for 2011-2012 KIA Optima" → year=2011-2012, makeName=KIA, modelName=Optima
   - Notes: "Fits 2020 Toyota Camry" → year=2020, makeName=Toyota, modelName=Camry
   - Item Names: "2019 Ford F-150 Brake Kit" → year=2019, makeName=Ford, modelName=F-150
   - Comments: "Compatible with 2018-2020 Honda Civic" → year=2018-2020, makeName=Honda, modelName=Civic
   - Look for patterns: "YYYY-YYYY Make Model", "Fits YYYY Make Model", "YYYY Make Model", "Make Model YYYY"
   - Handle 2-digit years: "92-94" → "1992-1994" (if < 30, assume 2000s; else 1900s)

2. **Extract Part ID from ANYWHERE**:
   - "Part #", "Part Number", "PartNumber", "Part_ID", "SKU", "Item #", "Product Code", "Product ID"
   - From descriptions: "Part #: BP-12345" or "SKU: ABC123" or alphanumeric codes like "BP12345"
   - MUST extract partId - it's critical for fitments

3. **Extract Position from ANYWHERE**:
   - "Product Type", "Location", "Notes", "Description", "Position", "Front/Rear"
   - Patterns: "FRONT", "Front", "front", "F", "FWD", "forward" → position=Front
   - Patterns: "REAR", "Rear", "rear", "R", "back", "backward" → position=Rear
   - From product names: "OEM Plus - FRONT" → position=Front

4. **Normalize Vehicle Information**:
   - Make: Capitalize first letter, standardize (e.g., "kia" → "KIA", "toyota" → "Toyota")
   - Model: Capitalize properly (e.g., "optima" → "Optima", "f-150" → "F-150")
   - Year: Convert to integer, handle ranges (use first year if range)
   - Submodel: Extract if available, normalize casing

5. **Extract Technical Specifications**:
   - Rotor Diameter: "11.8 inches", "300mm", "11.8\"", "diameter: 11.8" → rotorDiameter (convert mm to inches: divide by 25.4)
   - Bolt Pattern: "5x114.3", "5 bolt", "5x4.5" → boltPattern
   - Thickness: "28mm", "1.1 inches" → rotorThickness
   - Center Hole: "70.6mm", "2.78 inches" → centerHoleDiameter

6. **Handle Inconsistent Column Names** (map these variations):
   - Year: "Yr", "Year", "Model Year", "Vehicle Year", "MY", "ModelYear"
   - Make: "Make", "Manufacturer", "Brand", "Mfg", "Mfr"
   - Model: "Model", "Vehicle Model", "Car Model", "Vehicle"
   - Part ID: "Part #", "Part Number", "PartNumber", "Part_ID", "SKU", "Item #", "Product Code"
   - Position: "Position", "Location", "Front/Rear", "Pos"

7. **Data Quality & Normalization**:
   - Remove extra whitespace, normalize casing
   - Convert units consistently (mm to inches for diameters)
   - Handle empty/null values appropriately
   - Ensure required fields (year, makeName, modelName, partId for fitments) are always populated

8. **Confidence Scoring**:
   - 0.9-1.0: Direct column match (e.g., "Year" → "year")
   - 0.7-0.9: Strong inference (e.g., extracted from description with clear pattern)
   - 0.5-0.7: Moderate inference (e.g., extracted from description with ambiguous pattern)
   - 0.3-0.5: Weak inference (e.g., guessed from context)
   - <0.3: Very uncertain, mark as low confidence

9. **Required Output Format**:
   - For FITMENTS: MUST have year, makeName, modelName, partId (at minimum)
   - For PRODUCTS: MUST have partId, description (at minimum)
   - All fields should be properly normalized and ready for database storage

Return ONLY a JSON object with this structure:
{{
        "columnMappings": [
    {{
      "source": "ColumnName",
      "target": "targetField",
      "confidence": 0.95,
      "extractionMethod": "direct|inferred|extracted_from_description|combined",
      "sourceColumns": ["ColumnName"] or ["Column1", "Column2"] if combined,
      "notes": "How the mapping was determined"
    }}
  ],
  "dataTransformations": [
    {{
      "column": "Year",
      "transformation": "split_range",
      "description": "Split year ranges like '2011-2012' into separate rows"
    }},
    {{
      "column": "Description",
      "transformation": "extract_vehicle_info",
      "description": "Extract Year/Make/Model from description text"
    }}
  ],
  "inferredFields": [
    {{
      "field": "year",
      "source": "Description column",
      "method": "extracted_from_text",
      "confidence": 0.85,
      "example": "Found '2011-2012' in description 'Brake Pad for 2011-2012 KIA Optima'"
    }}
  ]
}}

CRITICAL REQUIREMENTS:
- Analyze EVERY column, even if it seems unrelated
- Extract Year/Make/Model/PartId from ANY column if not found in obvious places
- Ensure ALL required fields are mapped (year, makeName, modelName, partId for fitments)
- Normalize all values to VCDB standards (proper casing, units, formats)
- Provide confidence scores and extraction methods for transparency
- The output MUST be ready for direct database storage in Fitments/ProductData tables
- If you can't find a required field, try to infer it from available data - DO NOT leave it empty"""
            
            response = client.chat.completions.create(
                model=deployment,
                messages=[
                    {"role": "system", "content": "You are an expert at mapping automotive data columns to VCDB standards. Always return valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=2000,
            )
            
            content = response.choices[0].message.content.strip()
            # Remove markdown code blocks if present
            if content.startswith('```json'):
                content = content[7:]
            elif content.startswith('```'):
                content = content[3:]
            if content.endswith('```'):
                content = content[:-3]
            
            suggestions = json.loads(content.strip())
            # Update job status - AI mapping completed, moving to transformation
            job.status = "transforming"
            job.params = job.params or {}
            job.params["currentStage"] = "transforming"
            job.result = suggestions
            job.save()
            
        except Exception as e:
            print(f"Azure AI Foundry error: {str(e)}")
            # Fallback to rule-based mapping
            suggestions = {
                "columnMappings": _fallback_column_mapping(headers, data_type),
            }
            # Update job status - AI mapping completed, moving to transformation
            job.status = "transforming"
            job.params = job.params or {}
            job.params["currentStage"] = "transforming"
            job.result = suggestions
            job.finished_at = timezone.now()
            job.save()
    else:
        # Fallback to rule-based mapping
        data_type = request.data.get("dataType") or (upload.preflight_report.get("dataType") if upload.preflight_report else "fitments")
        suggestions = {
            "columnMappings": _fallback_column_mapping(headers, data_type),
    }
    # Update job status - AI mapping completed, moving to transformation
    job.status = "transforming"
    job.params = job.params or {}
    job.params["currentStage"] = "transforming"
    job.result = suggestions
    job.save()

    return Response({"jobId": str(job.id), "suggestions": suggestions})


def _generate_ai_reasoning_and_confidence(row_data: dict, column_mappings: list, data_type: str, original_row: dict = None) -> tuple:
    """
    Generate AI reasoning and confidence explanation for a row based on mapping quality.
    
    Returns:
        tuple: (confidence_score, confidence_explanation, ai_reasoning)
    """
    # Calculate confidence based on mapped fields quality
    required_fields_fitments = ["year", "makeName", "modelName", "partId"]
    required_fields_products = ["partId", "description"]
    
    required_fields = required_fields_fitments if data_type == "fitments" else required_fields_products
    
    # Count how many required fields are present
    present_required = sum(1 for field in required_fields if field in row_data and row_data.get(field) and str(row_data.get(field)).strip())
    total_required = len(required_fields)
    
    # Base confidence on required fields presence
    base_confidence = (present_required / total_required) * 0.6  # 60% weight for required fields
    
    # Additional confidence from optional fields
    optional_fields_present = sum(1 for field in row_data.keys() if field not in required_fields and row_data.get(field) and str(row_data.get(field)).strip())
    optional_confidence = min(0.3, optional_fields_present * 0.05)  # Up to 30% for optional fields
    
    # Quality bonus (data looks complete and well-formed)
    quality_bonus = 0.1 if present_required == total_required and optional_fields_present >= 3 else 0.0
    
    confidence = min(0.95, base_confidence + optional_confidence + quality_bonus)
    
    # Generate confidence explanation
    confidence_factors = []
    if present_required == total_required:
        confidence_factors.append(f"All {total_required} required fields ({', '.join(required_fields)}) are present and populated")
    else:
        missing = [f for f in required_fields if f not in row_data or not row_data.get(f) or not str(row_data.get(f)).strip()]
        confidence_factors.append(f"Missing required fields: {', '.join(missing)}")
    
    if optional_fields_present > 0:
        confidence_factors.append(f"{optional_fields_present} additional optional fields mapped")
    
    # Check data quality
    if data_type == "fitments":
        year = row_data.get("year", "")
        make = row_data.get("makeName", "")
        model = row_data.get("modelName", "")
        if year and make and model:
            try:
                year_int = int(float(str(year).split("-")[0]))
                if 1990 <= year_int <= 2030:
                    confidence_factors.append("Year value is within valid range (1990-2030)")
                else:
                    confidence_factors.append(f"Year value {year_int} is outside typical range")
            except:
                confidence_factors.append("Year format may need validation")
    
    confidence_explanation = f"Confidence Score: {int(confidence * 100)}%. " + " | ".join(confidence_factors)
    
    # Generate AI reasoning
    reasoning_parts = []
    if data_type == "fitments":
        year = row_data.get("year", "")
        make = row_data.get("makeName", "")
        model = row_data.get("modelName", "")
        part_id = row_data.get("partId", "")
        
        if year and make and model:
            reasoning_parts.append(f"Successfully mapped vehicle information: {year} {make} {model}")
        
        if part_id:
            reasoning_parts.append(f"Part identifier '{part_id}' extracted and mapped")
        
        position = row_data.get("position", "")
        if position:
            reasoning_parts.append(f"Position '{position}' identified")
        
        # Check for technical specifications
        tech_fields = ["rotorDiameter", "boltPattern", "engine", "subModelName"]
        tech_present = [f for f in tech_fields if f in row_data and row_data.get(f)]
        if tech_present:
            reasoning_parts.append(f"Technical specifications extracted: {', '.join(tech_present)}")
    else:  # products
        part_id = row_data.get("partId", "")
        description = row_data.get("description", "")
        
        if part_id:
            reasoning_parts.append(f"Product identifier '{part_id}' mapped")
        
        if description:
            desc_preview = str(description)[:100] + "..." if len(str(description)) > 100 else str(description)
            reasoning_parts.append(f"Product description extracted: {desc_preview}")
    
    # Add mapping quality note
    if present_required == total_required:
        reasoning_parts.append("All required fields successfully mapped from source data")
    else:
        reasoning_parts.append("Some required fields may need manual review or additional data extraction")
    
    ai_reasoning = ". ".join(reasoning_parts) if reasoning_parts else "Data mapping completed using AI column mapping and transformation rules."
    
    return confidence, confidence_explanation, ai_reasoning


def _fallback_column_mapping(headers: list, data_type: str) -> list:
    """Fallback rule-based column mapping"""
    mappings = []
    
    if data_type == "fitments":
        # Fitment mappings - enhanced for brake/rotor data
        fitment_map = {
            "year": ["year", "yr", "model year", "my"],
            "makeName": ["make", "manufacturer", "brand"],
            "modelName": ["model", "vehicle model"],
            "partId": ["part number", "partnumber", "part_number", "part id", "partid", "sku", "pn"],
            "partName": ["part name", "product name", "name"],
            "productType": ["product type", "producttype", "type"],
            "kitParts": ["kit-parts", "kit_parts", "kit parts", "kit"],
            "engine": ["engine", "engine size", "motor", "displacement"],
            "submodel": ["submodel", "trim", "sub model"],
            "trim": ["trim", "trim level"],
            "driveType": ["drive type", "drivetype", "drive", "awd", "fwd", "rwd"],
            "bed": ["bed", "bed type", "bed length"],
            "cab": ["cab", "cab type", "cab style"],
            "body": ["body", "body type", "body style"],
            "position": ["position", "pos", "location", "side", "front", "rear"],
            "rotorDiameter": ["rotor diameter", "rotor_diameter", "diameter"],
            "rotorThickness": ["thickness", "rotor thickness", "new thickness", "minimum thickness"],
            "boltPattern": ["pcd", "bolt pattern", "bolt_pattern", "bolt holes"],
            "centerHoleDiameter": ["centre hole diameter", "center hole diameter", "center_hole", "centre_hole"],
        }
    else:
        # Product mappings
        fitment_map = {
            "partId": ["part id", "partid", "part_id", "sku", "part number", "partnumber", "pn"],
            "partName": ["part name", "partname", "name", "product name"],
            "description": ["description", "desc", "details"],
            "category": ["category", "cat", "part category"],
            "partType": ["part type", "parttype", "type"],
            "specifications": ["specifications", "specs", "spec"],
        }
    
    header_lower = [h.lower().strip() for h in headers]
    
    for target, variations in fitment_map.items():
        for header in headers:
            header_lower_val = header.lower().strip()
            if any(variation in header_lower_val for variation in variations):
                confidence = 0.95 if header_lower_val in variations else 0.75
                mappings.append({
                    "source": header,
                    "target": target,
                    "confidence": confidence
                })
                break
    
    return mappings


def _extract_missing_data_from_descriptions(mapped_df, original_df, column_mappings):
    """
    Extract missing vehicle data from description columns when expected columns are missing.
    Handles messy data by using NLP/regex to extract Year/Make/Model from descriptions.
    Returns the enhanced dataframe and extraction metadata for UI display.
    """
    import re
    import pandas as pd
    
    # Track extraction metadata for UI feedback
    extraction_metadata = {
        'extracted_fields': [],
        'inferred_fields': [],
        'extraction_summary': {}
    }
    
    # Find description-like columns that might contain vehicle info
    description_columns = []
    for col in original_df.columns:
        col_lower = col.lower()
        if any(keyword in col_lower for keyword in ['description', 'desc', 'notes', 'comment', 'item', 'name', 'title', 'spec', 'detail', 'vehicle', 'info', 'product']):
            if col not in column_mappings.values():  # Not already mapped
                description_columns.append(col)
    
    # Also check ALL columns for potential data (not just description-like ones)
    all_columns_to_check = list(original_df.columns)
    
    # Prioritize "Vehicle Info" column if it exists (often contains model/submodel)
    vehicle_info_col = None
    for col in original_df.columns:
        if 'vehicle' in col.lower() and 'info' in col.lower():
            vehicle_info_col = col
            if col not in description_columns:
                description_columns.insert(0, col)  # Put it first
            break
    
    # Check which required fields are missing
    required_fields = ['year', 'makeName', 'modelName']
    missing_fields = [field for field in required_fields if field not in mapped_df.columns or mapped_df[field].isna().all()]
    
    if not missing_fields and 'position' in mapped_df.columns and 'partId' in mapped_df.columns:
        # Check if position and partId are populated
        if not mapped_df['position'].isna().all() and not mapped_df['partId'].isna().all():
            return mapped_df, extraction_metadata
    
    # Extract from descriptions using regex patterns
    for idx, row in mapped_df.iterrows():
        row_extractions = []
        
        # Try to extract from description columns first
        for desc_col in description_columns:
            if desc_col in original_df.columns:
                desc_value = str(original_df.loc[idx, desc_col]) if pd.notna(original_df.loc[idx, desc_col]) else ""
                
                if not desc_value or len(desc_value.strip()) < 3:
                    continue
                
                # Extract year (YYYY or YYYY-YYYY or 2-digit years)
                if 'year' not in mapped_df.columns or pd.isna(mapped_df.loc[idx, 'year']):
                    # Pattern for 4-digit years
                    year_pattern = r'\b(19|20)\d{2}(?:\s*-\s*(?:19|20)\d{2})?\b'
                    year_match = re.search(year_pattern, desc_value)
                    if not year_match:
                        # Try 2-digit years (92-94, 05-10, etc.)
                        year_pattern_2digit = r'\b(\d{2})(?:\s*-\s*(\d{2}))?\b'
                        year_match_2digit = re.search(year_pattern_2digit, desc_value)
                        if year_match_2digit:
                            year_val = int(year_match_2digit.group(1))
                            # Heuristic: if < 30, assume 2000s, else 1900s
                            if year_val < 30:
                                year_val = 2000 + year_val
                            else:
                                year_val = 1900 + year_val
                            mapped_df.loc[idx, 'year'] = year_val
                            row_extractions.append({
                                'field': 'year',
                                'value': year_val,
                                'source': desc_col,
                                'method': 'extracted_from_text',
                                'confidence': 0.75
                            })
                    else:
                        year_str = year_match.group(0)
                        if '-' in year_str:
                            year_str = year_str.split('-')[0].strip()
                        try:
                            year_val = int(year_str)
                            mapped_df.loc[idx, 'year'] = year_val
                            row_extractions.append({
                                'field': 'year',
                                'value': year_val,
                                'source': desc_col,
                                'method': 'extracted_from_text',
                                'confidence': 0.85
                            })
                        except:
                            pass
                
                # Extract Make and Model (enhanced patterns)
                if 'makeName' not in mapped_df.columns or pd.isna(mapped_df.loc[idx, 'makeName']) or \
                   'modelName' not in mapped_df.columns or pd.isna(mapped_df.loc[idx, 'modelName']):
                    
                    # Pattern 1: "for YYYY Make Model" or "for YYYY-YYYY Make Model" (e.g., "for 2023 Ford F-150")
                    vehicle_pattern1 = r'(?:for|fits?|compatible with|works with)\s+(?:\d{2,4}(?:\s*-\s*\d{2,4})?\s+)?([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)?)\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z0-9\-]+)?)'
                    vehicle_match1 = re.search(vehicle_pattern1, desc_value, re.IGNORECASE)
                    if vehicle_match1:
                        make = vehicle_match1.group(1).strip()
                        model = vehicle_match1.group(2).strip()
                        # Clean model (remove engine info like "5.0L" if present)
                        model = re.sub(r'\s+\d+\.\d+L.*$', '', model).strip()
                        
                        if 'makeName' not in mapped_df.columns or pd.isna(mapped_df.loc[idx, 'makeName']):
                            mapped_df.loc[idx, 'makeName'] = make
                            row_extractions.append({
                                'field': 'makeName',
                                'value': make,
                                'source': desc_col,
                                'method': 'extracted_from_text',
                                'confidence': 0.85
                            })
                        
                        if 'modelName' not in mapped_df.columns or pd.isna(mapped_df.loc[idx, 'modelName']):
                            mapped_df.loc[idx, 'modelName'] = model
                            row_extractions.append({
                                'field': 'modelName',
                                'value': model,
                                'source': desc_col,
                                'method': 'extracted_from_text',
                                'confidence': 0.85
                            })
                    
                    # Pattern 2: "YYYY Make Model" (e.g., "2023 Ford F-150")
                    if ('makeName' not in mapped_df.columns or pd.isna(mapped_df.loc[idx, 'makeName'])) or \
                       ('modelName' not in mapped_df.columns or pd.isna(mapped_df.loc[idx, 'modelName'])):
                        vehicle_pattern2 = r'\b(19|20)\d{2}\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)?)\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z0-9\-]+)?)'
                        vehicle_match2 = re.search(vehicle_pattern2, desc_value)
                        if vehicle_match2:
                            make = vehicle_match2.group(2).strip()
                            model = vehicle_match2.group(3).strip()
                            # Clean model
                            model = re.sub(r'\s+\d+\.\d+L.*$', '', model).strip()
                            
                            if 'makeName' not in mapped_df.columns or pd.isna(mapped_df.loc[idx, 'makeName']):
                                mapped_df.loc[idx, 'makeName'] = make
                                row_extractions.append({
                                    'field': 'makeName',
                                    'value': make,
                                    'source': desc_col,
                                    'method': 'extracted_from_text',
                                    'confidence': 0.80
                                })
                            
                            if 'modelName' not in mapped_df.columns or pd.isna(mapped_df.loc[idx, 'modelName']):
                                mapped_df.loc[idx, 'modelName'] = model
                                row_extractions.append({
                                    'field': 'modelName',
                                    'value': model,
                                    'source': desc_col,
                                    'method': 'extracted_from_text',
                                    'confidence': 0.80
                                })
                    
                    # Pattern 3: "Make Model" (fallback - look for common makes)
                    if ('makeName' not in mapped_df.columns or pd.isna(mapped_df.loc[idx, 'makeName'])) or \
                       ('modelName' not in mapped_df.columns or pd.isna(mapped_df.loc[idx, 'modelName'])):
                        common_makes = ['Ford', 'Chevrolet', 'Chevy', 'Toyota', 'Honda', 'BMW', 'Mercedes', 'Audi', 'KIA', 'Kia', 'Acura', 'Nissan', 'Dodge', 'Ram', 'GMC', 'Jeep', 'Subaru', 'Mazda', 'Volkswagen', 'VW', 'Hyundai', 'Lexus', 'Infiniti', 'Cadillac', 'Lincoln', 'Buick', 'Chrysler', 'Jaguar', 'Land Rover', 'Porsche', 'Tesla', 'Volvo', 'Mitsubishi', 'Suzuki', 'Isuzu', 'Fiat', 'Alfa Romeo', 'Genesis', 'Maserati', 'Bentley', 'Rolls-Royce', 'Ferrari', 'Lamborghini', 'McLaren', 'Aston Martin', 'Lotus', 'AC']
                        for make in common_makes:
                            make_pattern = rf'\b{re.escape(make)}\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z0-9\-]+)?)'
                            make_match = re.search(make_pattern, desc_value, re.IGNORECASE)
                            if make_match:
                                model = make_match.group(1).strip()
                                # Clean model
                                model = re.sub(r'\s+\d+\.\d+L.*$', '', model).strip()
                                
                                if 'makeName' not in mapped_df.columns or pd.isna(mapped_df.loc[idx, 'makeName']):
                                    mapped_df.loc[idx, 'makeName'] = make
                                    row_extractions.append({
                                        'field': 'makeName',
                                        'value': make,
                                        'source': desc_col,
                                        'method': 'inferred_from_text',
                                        'confidence': 0.70
                                    })
                                
                                if 'modelName' not in mapped_df.columns or pd.isna(mapped_df.loc[idx, 'modelName']):
                                    mapped_df.loc[idx, 'modelName'] = model
                                    row_extractions.append({
                                        'field': 'modelName',
                                        'value': model,
                                        'source': desc_col,
                                        'method': 'inferred_from_text',
                                        'confidence': 0.70
                                    })
                                break
                
                # Also check "Vehicle Info" column for model/submodel if description didn't work
                if vehicle_info_col and vehicle_info_col in original_df.columns:
                    vehicle_info_value = str(original_df.loc[idx, vehicle_info_col]) if pd.notna(original_df.loc[idx, vehicle_info_col]) else ""
                    if vehicle_info_value and len(vehicle_info_value.strip()) > 2:
                        # Vehicle Info often has just model/submodel (e.g., "F-150 Platinum", "Optima")
                        # Try to extract model from it
                        if 'modelName' not in mapped_df.columns or pd.isna(mapped_df.loc[idx, 'modelName']):
                            # Check if it's a model name (common patterns)
                            model_pattern = r'^([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z0-9\-]+)?)'
                            model_match = re.search(model_pattern, vehicle_info_value)
                            if model_match:
                                model = model_match.group(1).strip()
                                # Remove submodel/trim info (e.g., "F-150 Platinum" -> "F-150")
                                model = re.sub(r'\s+(Platinum|Limited|SE|XLT|LT|SR|EX|LX|Base).*$', '', model, flags=re.IGNORECASE).strip()
                                if len(model) > 1:
                                    mapped_df.loc[idx, 'modelName'] = model
                                    row_extractions.append({
                                        'field': 'modelName',
                                        'value': model,
                                        'source': vehicle_info_col,
                                        'method': 'extracted_from_vehicle_info',
                                        'confidence': 0.75
                                    })
                        
                        # Extract submodel/trim from Vehicle Info
                        if 'subModelName' not in mapped_df.columns or pd.isna(mapped_df.loc[idx, 'subModelName']):
                            # Look for trim levels in Vehicle Info
                            trim_pattern = r'\b(Platinum|Limited|SE|XLT|LT|SR|EX|LX|Base|Premium|Sport|Touring|Elite|Ultimate)\b'
                            trim_match = re.search(trim_pattern, vehicle_info_value, re.IGNORECASE)
                            if trim_match:
                                submodel = trim_match.group(1).strip()
                                mapped_df.loc[idx, 'subModelName'] = submodel
                                row_extractions.append({
                                    'field': 'subModelName',
                                    'value': submodel,
                                    'source': vehicle_info_col,
                                    'method': 'extracted_from_vehicle_info',
                                    'confidence': 0.80
                                })
                
                # Extract position (FRONT/REAR) - enhanced patterns
                if 'position' not in mapped_df.columns or pd.isna(mapped_df.loc[idx, 'position']):
                    if re.search(r'\b(FRONT|Front|front|F|FWD|forward)\b', desc_value, re.IGNORECASE):
                        mapped_df.loc[idx, 'position'] = 'Front'
                        row_extractions.append({
                            'field': 'position',
                            'value': 'Front',
                            'source': desc_col,
                            'method': 'extracted_from_text',
                            'confidence': 0.90
                        })
                    elif re.search(r'\b(REAR|Rear|rear|R|back|backward)\b', desc_value, re.IGNORECASE):
                        mapped_df.loc[idx, 'position'] = 'Rear'
                        row_extractions.append({
                            'field': 'position',
                            'value': 'Rear',
                            'source': desc_col,
                            'method': 'extracted_from_text',
                            'confidence': 0.90
                        })
                
                # Extract part number from various formats
                if 'partId' not in mapped_df.columns or pd.isna(mapped_df.loc[idx, 'partId']):
                    # Look for patterns like "Part #: XXX" or "SKU: XXX" or alphanumeric codes
                    part_patterns = [
                        (r'Part\s*#?\s*:?\s*([A-Z0-9\-]+)', 0.95),
                        (r'SKU\s*:?\s*([A-Z0-9\-]+)', 0.95),
                        (r'Item\s*#?\s*:?\s*([A-Z0-9\-]+)', 0.90),
                        (r'Product\s*#?\s*:?\s*([A-Z0-9\-]+)', 0.90),
                        (r'\b([A-Z]{2,}\d{2,}[A-Z0-9\-]*)\b', 0.70),  # Alphanumeric codes
                        (r'\b([A-Z0-9]{6,})\b', 0.60)  # Long alphanumeric strings
                    ]
                    for pattern, confidence in part_patterns:
                        part_match = re.search(pattern, desc_value, re.IGNORECASE)
                        if part_match:
                            part_id = part_match.group(1).strip()
                            if len(part_id) >= 3:  # Minimum length check
                                mapped_df.loc[idx, 'partId'] = part_id
                                row_extractions.append({
                                    'field': 'partId',
                                    'value': part_id,
                                    'source': desc_col,
                                    'method': 'extracted_from_text',
                                    'confidence': confidence
                                })
                                break
                
                # Extract technical specs (rotor diameter, bolt pattern, etc.)
                if 'rotorDiameter' not in mapped_df.columns or pd.isna(mapped_df.loc[idx, 'rotorDiameter']):
                    # Look for diameter patterns: "11.8 inches", "300mm", "11.8\""
                    diameter_patterns = [
                        r'(\d+\.?\d*)\s*(?:inches|inch|in|"|mm)',
                        r'diameter[:\s]+(\d+\.?\d*)',
                        r'(\d+\.?\d*)\s*x\s*\d+\.?\d*'  # Dimensions like "11.8 x 1.2"
                    ]
                    for pattern in diameter_patterns:
                        match = re.search(pattern, desc_value, re.IGNORECASE)
                        if match:
                            try:
                                diameter = float(match.group(1))
                                # Convert mm to inches if needed
                                if 'mm' in desc_value.lower():
                                    diameter = diameter / 25.4
                                mapped_df.loc[idx, 'rotorDiameter'] = diameter
                                row_extractions.append({
                                    'field': 'rotorDiameter',
                                    'value': diameter,
                                    'source': desc_col,
                                    'method': 'extracted_from_text',
                                    'confidence': 0.75
                                })
                                break
                            except:
                                pass
                
                # Extract bolt pattern
                if 'boltPattern' not in mapped_df.columns or pd.isna(mapped_df.loc[idx, 'boltPattern']):
                    bolt_pattern = r'(\d+)\s*x\s*(\d+\.?\d*)'
                    match = re.search(bolt_pattern, desc_value)
                    if match:
                        bolts = match.group(1)
                        pcd = match.group(2)
                        bolt_pattern_str = f"{bolts}x{pcd}"
                        mapped_df.loc[idx, 'boltPattern'] = bolt_pattern_str
                        row_extractions.append({
                            'field': 'boltPattern',
                            'value': bolt_pattern_str,
                            'source': desc_col,
                            'method': 'extracted_from_text',
                            'confidence': 0.80
                        })
        
        # If still missing critical fields, try to infer from ALL columns
        if 'year' not in mapped_df.columns or pd.isna(mapped_df.loc[idx, 'year']):
            # Check all columns for year-like values
            for col in all_columns_to_check:
                val = str(original_df.loc[idx, col]) if pd.notna(original_df.loc[idx, col]) else ""
                if len(val) < 2:
                    continue
                # Try 4-digit years first
                year_match = re.search(r'\b(19|20)\d{2}\b', val)
                if year_match:
                    try:
                        year_val = int(year_match.group(0))
                        mapped_df.loc[idx, 'year'] = year_val
                        row_extractions.append({
                            'field': 'year',
                            'value': year_val,
                            'source': col,
                            'method': 'inferred_from_column',
                            'confidence': 0.70
                        })
                        break
                    except:
                        pass
        
        # Store extraction metadata for this row
        if row_extractions:
            extraction_metadata['extracted_fields'].extend(row_extractions)
            for ext in row_extractions:
                field = ext['field']
                if field not in extraction_metadata['extraction_summary']:
                    extraction_metadata['extraction_summary'][field] = {
                        'count': 0,
                        'methods': set(),
                        'sources': set()
                    }
                extraction_metadata['extraction_summary'][field]['count'] += 1
                extraction_metadata['extraction_summary'][field]['methods'].add(ext['method'])
                extraction_metadata['extraction_summary'][field]['sources'].add(ext['source'])
    
    # Convert sets to lists for JSON serialization
    for field in extraction_metadata['extraction_summary']:
        extraction_metadata['extraction_summary'][field]['methods'] = list(extraction_metadata['extraction_summary'][field]['methods'])
        extraction_metadata['extraction_summary'][field]['sources'] = list(extraction_metadata['extraction_summary'][field]['sources'])
    
    return mapped_df, extraction_metadata


def _transform_challenge2_format(df):
    """
    Transform Challenge 2 format (wide) to long format.
    
    Original: One row per vehicle with many columns (FRONT/REAR parts in separate columns)
    Output: Multiple rows per vehicle (one row per part/product type)
    """
    import pandas as pd
    import re
    
    transformations = []
    result_rows = []
    
    # Identify base columns (vehicle info)
    base_cols = ['Year', 'Make', 'Model', 'Sub-Model', 'Engine', 'Unique Vehicle ID']
    base_cols = [col for col in base_cols if col in df.columns]
    
    # Standardize year ranges first
    if 'Year' in df.columns:
        df['Year'] = df['Year'].astype(str).str.replace(' thru ', '-', regex=False)
        df['Year'] = df['Year'].str.replace(' through ', '-', regex=False)
        df['Year'] = df['Year'].str.replace(' thrugh ', '-', regex=False)
        df['Year'] = df['Year'].str.replace(' and up', '', regex=False)
        
        # Handle 2-digit years (e.g., "92-94" → "1992-1994")
        def normalize_year_range(year_str):
            if pd.isna(year_str) or year_str == 'nan':
                return year_str
            year_str = str(year_str).strip()
            if '-' in year_str:
                parts = year_str.split('-')
                if len(parts) == 2:
                    start = parts[0].strip()
                    end = parts[1].strip()
                    # Convert 2-digit years to 4-digit
                    try:
                        start_int = int(start)
                        end_int = int(end)
                        # If years are 2-digit (0-99), assume 1900s/2000s
                        if 0 <= start_int <= 99:
                            # Heuristic: if year < 30, assume 2000s, else 1900s
                            start_int = 2000 + start_int if start_int < 30 else 1900 + start_int
                        if 0 <= end_int <= 99:
                            end_int = 2000 + end_int if end_int < 30 else 1900 + end_int
                        return f"{start_int}-{end_int}"
                    except:
                        pass
            return year_str
        
        df['Year'] = df['Year'].apply(normalize_year_range)
        transformations.append({
            "type": "year_range_standardization",
            "description": "Standardized year ranges (thru → -, 2-digit → 4-digit)"
        })
    
    # Identify FRONT part columns (product type columns without .1 suffix)
    front_part_cols = []
    rear_part_cols = []
    
    # Common product type names
    product_types = [
        'OEM Plus', '2000 Street Sport', '6000 Street Sport', '7000 Street sport',
        'Premium Street', 'Our Flagship range', 'Our Flagship Range',
        'NPC   Fastest Street and Race Pads', 'Race Brake Pads',
        'JAY-1 Race Brake Pads', 'JAY-X Race Brake Pads'
    ]
    
    for col in df.columns:
        col_str = str(col)
        # Check if it's a product type column
        for pt in product_types:
            if pt in col_str:
                if '.1' in col_str or col_str.endswith('1'):
                    rear_part_cols.append((col, pt))
                else:
                    front_part_cols.append((col, pt))
                break
    
    # FRONT technical columns mapping
    front_tech_map = {
        'FMSI Pad Part Number': 'FMSI Pad Part Number - FRONT',
        'Solid or Vented': 'Solid or Vented - FRONT',
        'No of Bolt Holes or Studs': 'Bolt Holes - FRONT',
        'Rotor diameter in inches': 'Rotor Diameter in Inches - FRONT',
        'Diameter mm': 'Rotor Diameter in mm - FRONT',
        'Height mm': 'Height - FRONT',
        'New Thickness mm': 'New Thickness - FRONT',
        'Minimum Thickness mm': 'Minimum Thickness - FRONT',
        'PCD mm': 'PCD - FRONT',
        'Centre Hole Diameter mm': 'Centre Hole Diameter - FRONT',
    }
    
    # REAR technical columns mapping (with .1 suffix)
    rear_tech_map = {
        'FMSI Pad Part Number.1': 'FMSI Pad Part Number - REAR',
        'Solid or Vented.1': 'Solid or Vented - REAR',
        'No of Bolt Holes or Studs.1': 'Bolt Holes - REAR',
        'Rotor diameter in inches.1': 'Rotor Diameter in Inches - REAR',
        'Diameter mm.1': 'Rotor Diameter in mm - REAR',
        'Height mm.1': 'Height - REAR',
        'New Thickness mm.1': 'New Thickness - REAR',
        'Minimum Thickness mm.1': 'Minimum Thickness - REAR',
        'PCD mm.1': 'PCD - REAR',
        'Centre Hole Diameter mm.1': 'Centre Hole Diameter - REAR',
    }
    
    # Process each row
    for idx, row in df.iterrows():
        # Get base vehicle info
        base_data = {col: row.get(col) for col in base_cols if pd.notna(row.get(col))}
        
        # Process FRONT parts
        for part_col, product_type in front_part_cols:
            part_number = row.get(part_col)
            if pd.notna(part_number) and str(part_number).strip() and str(part_number).strip() != 'NaN':
                new_row = base_data.copy()
                new_row['Part Number'] = str(part_number).strip()
                new_row['Product Type'] = f"{product_type} - FRONT"
                new_row['Position'] = 'FRONT'
                
                # Map FRONT technical columns
                for source_col, target_col in front_tech_map.items():
                    if source_col in df.columns:
                        val = row.get(source_col)
                        if pd.notna(val):
                            new_row[target_col] = val
                
                result_rows.append(new_row)
                transformations.append({
                    "type": "wide_to_long",
                    "position": "FRONT",
                    "product_type": product_type,
                    "row": idx + 1
                })
        
        # Process REAR parts
        for part_col, product_type in rear_part_cols:
            part_number = row.get(part_col)
            if pd.notna(part_number) and str(part_number).strip() and str(part_number).strip() != 'NaN':
                new_row = base_data.copy()
                new_row['Part Number'] = str(part_number).strip()
                new_row['Product Type'] = f"{product_type} - REAR"
                new_row['Position'] = 'REAR'
                
                # Map REAR technical columns
                for source_col, target_col in rear_tech_map.items():
                    if source_col in df.columns:
                        val = row.get(source_col)
                        if pd.notna(val):
                            new_row[target_col] = val
                
                result_rows.append(new_row)
                transformations.append({
                    "type": "wide_to_long",
                    "position": "REAR",
                    "product_type": product_type,
                    "row": idx + 1
                })
    
    # Create DataFrame from result rows
    if result_rows:
        result_df = pd.DataFrame(result_rows)
        # Ensure required columns exist
        required_cols = ['Year', 'Make', 'Model', 'Part Number', 'Product Type']
        for col in required_cols:
            if col not in result_df.columns:
                result_df[col] = None
        
        # Map to VCDB standard column names
        column_rename_map = {
            'Year': 'year',
            'Make': 'makeName',
            'Model': 'modelName',
            'Sub-Model': 'submodel',
            'Engine': 'engine',
            'Part Number': 'partId',
            'Product Type': 'productType',
            'Position': 'position',
            'Unique Vehicle ID': 'uniqueVehicleId',
        }
        
        # Rename columns
        for old_name, new_name in column_rename_map.items():
            if old_name in result_df.columns:
                result_df[new_name] = result_df[old_name]
                if old_name != new_name:
                    result_df = result_df.drop(columns=[old_name], errors='ignore')
        
        transformations.append({
            "type": "column_mapping",
            "description": "Mapped columns to VCDB standard names"
        })
    else:
        result_df = df.copy()
    
    return result_df, transformations


@api_view(["POST"])
def transform_data(request, upload_id: str):
    """
    Transform data based on AI mappings and business rules.
    
    Transformations:
    1. Split year ranges (2011-2012 → 2011, 2012)
    2. Standardize units (mm ↔ inches)
    3. Split combined attributes (Matte Black → color + finish)
    4. Extract position from Product Type
    5. Consolidate part numbers
    """
    upload = Upload.objects.get(id=upload_id)
    
    # Get or create the single job for this upload
    data_type = upload.preflight_report.get("dataType", "fitments") if upload.preflight_report else "fitments"
    job = get_or_create_upload_job(upload, data_type)
    
    # Update job status to transforming
    job.status = "transforming"
    job.params = job.params or {}
    job.params["currentStage"] = "transforming"
    job.save()
    
    try:
        import pandas as pd
        import re
        
        # Detect Challenge 2 format (wide format with FRONT/REAR columns)
        # Check if file appears to be Challenge 2 format
        is_challenge2_format = False
        if upload.file_format == "xlsx":
            # Try reading with different skiprows to detect format
            try:
                df_test = pd.read_excel(upload.storage_url, nrows=10)
                # Check for Challenge 2 indicators: many columns, FRONT/REAR indicators
                if len(df_test.columns) > 100:
                    # Check for FRONT/REAR pattern in first rows
                    first_row_str = str(df_test.iloc[0].values).upper()
                    if 'FRONT' in first_row_str and 'REAR' in first_row_str:
                        is_challenge2_format = True
            except:
                pass
        
        # Read the uploaded file
        if upload.file_format == "xlsx":
            if is_challenge2_format:
                # Challenge 2 format: skip first 4 rows (metadata + headers)
                df = pd.read_excel(upload.storage_url, skiprows=4)
            else:
                df = pd.read_excel(upload.storage_url)
        else:
            delimiter = upload.preflight_report.get("delimiter", ",") if upload.preflight_report else ","
            encoding = upload.preflight_report.get("encoding", "utf-8") if upload.preflight_report else "utf-8"
            df = pd.read_csv(upload.storage_url, delimiter=delimiter, encoding=encoding)
        
        # Keep original dataframe for reference
        original_df = df.copy()
        
        # Get AI mappings from the same job (single job tracks all stages)
        ai_map_job = job  # Use the same job we're updating
        
        column_mappings = {}
        if ai_map_job and ai_map_job.result:
            mappings = ai_map_job.result.get("columnMappings", [])
            for mapping in mappings:
                source = mapping.get("source")
                target = mapping.get("target")
                if source and target:
                    column_mappings[source] = target
        
        # Initialize extraction metadata (for UI feedback)
        extraction_metadata = {
            'extracted_fields': [],
            'inferred_fields': [],
            'extraction_summary': {}
        }
        
        # Handle Challenge 2 format (wide to long transformation)
        if is_challenge2_format:
            mapped_df, challenge2_transformations = _transform_challenge2_format(df)
            transformations_applied = challenge2_transformations
            transformed_rows = []
            # Skip regular row processing for Challenge 2 format
            skip_regular_processing = True
        else:
            # Apply column mappings first
            mapped_df = df.copy()
            for source_col, target_col in column_mappings.items():
                if source_col in mapped_df.columns:
                    mapped_df[target_col] = mapped_df[source_col]
                    if source_col != target_col:
                        mapped_df = mapped_df.drop(columns=[source_col], errors='ignore')
            
            # Post-process: Extract missing data from descriptions (messy data handling)
            mapped_df, extraction_metadata = _extract_missing_data_from_descriptions(mapped_df, df, column_mappings)
            
            # Track transformations
            transformations_applied = []
            transformed_rows = []
            skip_regular_processing = False
        
        # Process each row (skip for Challenge 2 format)
        if not skip_regular_processing:
            for idx, row in mapped_df.iterrows():
                row_data = row.to_dict()
                original_row = row_data.copy()
                
                    # 1. Split Year Ranges
                if "year" in row_data and pd.notna(row_data.get("year")):
                    year_val = str(row_data["year"]).strip()
                    if "-" in year_val and not year_val.startswith("-"):
                        try:
                            parts = year_val.split("-")
                            if len(parts) == 2:
                                start_year = int(parts[0].strip())
                                end_year = int(parts[1].strip())
                                if 1900 <= start_year <= 2030 and 1900 <= end_year <= 2030:
                                    # Create separate rows for each year
                                    for year in range(start_year, end_year + 1):
                                        new_row = original_row.copy()
                                        new_row["year"] = year
                                        transformed_rows.append(new_row)
                                    transformations_applied.append({
                                        "type": "year_range_split",
                                        "original": year_val,
                                        "split_into": list(range(start_year, end_year + 1)),
                                        "row": idx + 1
                                    })
                                    continue  # Skip original row
                        except:
                            pass
            
                # 2. Extract Position from Product Type
                if "productType" in row_data and pd.notna(row_data.get("productType")):
                    product_type = str(row_data["productType"]).strip()
                    # Check for FRONT/REAR in product type
                    if "FRONT" in product_type.upper():
                        row_data["position"] = "Front"
                        # Clean product type
                        row_data["productType"] = product_type.replace("- FRONT", "").replace("-FRONT", "").replace("FRONT", "").strip()
                        transformations_applied.append({
                            "type": "position_extraction",
                            "field": "productType",
                            "extracted": "Front",
                            "row": idx + 1
                        })
                    elif "REAR" in product_type.upper():
                        row_data["position"] = "Rear"
                        row_data["productType"] = product_type.replace("- REAR", "").replace("-REAR", "").replace("REAR", "").strip()
                        transformations_applied.append({
                            "type": "position_extraction",
                            "field": "productType",
                            "extracted": "Rear",
                            "row": idx + 1
                        })
                
                # 3. Standardize Units (mm to inches for diameter fields)
                diameter_fields = ["rotorDiameter", "centerHoleDiameter"]
                for field in diameter_fields:
                    if field in row_data and pd.notna(row_data.get(field)):
                        value_str = str(row_data[field]).strip().lower()
                        # Check if value is in mm (typically > 50 for rotors)
                        try:
                            value_num = float(value_str)
                            # If value > 50 and field name suggests mm, convert to inches
                            if value_num > 50 and ("mm" in str(original_row.get(field, "")).lower() or 
                                                   "Rotor Diameter in mm" in str(original_row.get(field, "")).lower()):
                                inches = value_num / 25.4
                                row_data[field] = round(inches, 2)
                                transformations_applied.append({
                                    "type": "unit_conversion",
                                    "field": field,
                                    "from": f"{value_num} mm",
                                    "to": f"{inches} inches",
                                    "row": idx + 1
                                })
                        except:
                            pass
                
                # 4. Split Combined Attributes (e.g., "Matte Black" → color + finish)
                if "productType" in row_data and pd.notna(row_data.get("productType")):
                    product_type = str(row_data["productType"]).strip()
                    # Common patterns: "Color Finish" or "Finish Color"
                    color_finish_patterns = [
                        (r"(Matte|Glossy|Satin)\s+(Black|White|Red|Blue|Silver)", "finish", "color"),
                        (r"(Black|White|Red|Blue|Silver)\s+(Matte|Glossy|Satin)", "color", "finish"),
                    ]
                    for pattern, first_field, second_field in color_finish_patterns:
                        match = re.search(pattern, product_type, re.IGNORECASE)
                        if match:
                            if first_field == "color":
                                row_data["color"] = match.group(1)
                                row_data["finish"] = match.group(2)
                            else:
                                row_data["finish"] = match.group(1)
                                row_data["color"] = match.group(2)
                            transformations_applied.append({
                                "type": "attribute_split",
                                "field": "productType",
                                "split_into": {first_field: match.group(1), second_field: match.group(2)},
                                "row": idx + 1
                            })
                            break
                
                # 5. Consolidate Part Numbers (if partId is empty but other part number columns exist)
                if ("partId" not in row_data or pd.isna(row_data.get("partId")) or str(row_data.get("partId")).strip() == ""):
                    # Look for part number in other columns
                    part_number_columns = ["Part Number", "PartNumber", "SKU", "partNumber", "part_number"]
                    for col in part_number_columns:
                        if col in original_row and pd.notna(original_row.get(col)):
                            row_data["partId"] = str(original_row[col]).strip()
                            transformations_applied.append({
                                "type": "part_number_consolidation",
                                "source": col,
                                "target": "partId",
                                "row": idx + 1
                            })
                            break
                
                transformed_rows.append(row_data)
        
        # Create new DataFrame from transformed rows
        if is_challenge2_format:
            # Challenge 2 format already returns transformed DataFrame
            transformed_df = mapped_df
        elif transformed_rows:
            transformed_df = pd.DataFrame(transformed_rows)
        else:
            transformed_df = mapped_df
        
        # Ensure all required columns exist (even if empty)
        # This ensures the transformed file has the correct structure
        data_type = upload.preflight_report.get("dataType", "fitments") if upload.preflight_report else "fitments"
        required_cols = ["year", "makeName", "modelName"]
        if data_type == "fitments":
            for col in required_cols:
                if col not in transformed_df.columns:
                    transformed_df[col] = None
        
        # Save transformed data to a new file
        import os
        transformed_file_path = upload.storage_url.replace(".csv", "_transformed.csv").replace(".xlsx", "_transformed.csv")
        # Ensure directory exists
        os.makedirs(os.path.dirname(transformed_file_path), exist_ok=True)
        
        # Save with explicit column order to preserve structure
        transformed_df.to_csv(transformed_file_path, index=False)
        
        # Debug: Log what we're saving
        print(f"DEBUG: Saving transformed file with columns: {list(transformed_df.columns)}")
        print(f"DEBUG: Transformed file path: {transformed_file_path}")
        
        # Update job status - transformation completed, moving to validation
        job.status = "validating"
        job.params = job.params or {}
        job.params["currentStage"] = "validating"
        job.result = {
            "transformations_applied": transformations_applied,
            "original_rows": len(mapped_df),
            "transformed_rows": len(transformed_df),
            "transformed_file_path": transformed_file_path
        }
        job.save()
        
        # Update upload with transformed file path
        upload.preflight_report = {**(upload.preflight_report or {}), "transformed_file_path": transformed_file_path}
        upload.save()
        
        return Response({
            "jobId": str(job.id),
            "originalRows": len(mapped_df),
            "transformedRows": len(transformed_df),
            "transformationsApplied": len(transformations_applied),
            "transformations": transformations_applied[:50],  # Limit to first 50
            "transformedFilePath": transformed_file_path,
            "extractionMetadata": extraction_metadata  # Add extraction metadata for UI feedback
        })
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"ERROR in transform_data endpoint: {str(e)}")
        print(f"Traceback: {error_trace}")
        job.status = "failed"
        job.result = {"error": str(e), "traceback": error_trace}
        job.finished_at = timezone.now()
        job.save()
        return Response(
            {"error": f"Transformation failed: {str(e)}", "details": error_trace},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["POST"]) 
def vcdb_validate(request, upload_id: str):
    """
    Validate uploaded file against VCDB standards.
    
    Process:
    1. Read the uploaded file
    2. Get AI column mappings from previous job
    3. Apply mappings to transform data
    4. Validate each row against VCDB rules:
       - Required fields present
       - Year is valid (1900-2030)
       - Make/Model combinations are valid
       - Data types are correct
       - No duplicate records
    5. Return validation results with errors and warnings
    """
    try:
        upload = Upload.objects.get(id=upload_id)
    except Upload.DoesNotExist:
        return Response(
            {"error": "Upload not found"},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {"error": f"Error getting upload: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    # Get or create the single job for this upload
    data_type = upload.preflight_report.get("dataType", "fitments") if upload.preflight_report else "fitments"
    try:
        job = get_or_create_upload_job(upload, data_type)
    except Exception as e:
        return Response(
            {"error": f"Error getting/creating job: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    # Update job status to validating
    job.status = "validating"
    job.params = job.params or {}
    job.params["currentStage"] = "validating"
    job.save()
    
    try:
        import pandas as pd
        import re
        import os
        
        # Read the transformed file if available, otherwise original
        file_path = upload.storage_url
        is_transformed = False
        if upload.preflight_report and upload.preflight_report.get("transformed_file_path"):
            transformed_path = upload.preflight_report.get("transformed_file_path")
            if os.path.exists(transformed_path):
                file_path = transformed_path
                is_transformed = True
        
        # Read the file
        if file_path.endswith(".xlsx"):
            df = pd.read_excel(file_path)
        else:
            delimiter = upload.preflight_report.get("delimiter", ",") if upload.preflight_report else ","
            encoding = upload.preflight_report.get("encoding", "utf-8") if upload.preflight_report else "utf-8"
            df = pd.read_csv(file_path, delimiter=delimiter, encoding=encoding)
        
        # If using transformed file, columns are already mapped - no need to apply mappings again
        # If using original file, apply column mappings
        mapped_df = df.copy()
        # Get AI mappings from the same job (single job tracks all stages) - define outside if block
        ai_map_job = job  # Use the same job we're updating
        
        if not is_transformed:
            column_mappings = {}
            if ai_map_job and ai_map_job.result:
                mappings = ai_map_job.result.get("columnMappings", [])
                for mapping in mappings:
                    source = mapping.get("source")
                    target = mapping.get("target")
                    if source and target:
                        column_mappings[source] = target
            
            # Apply column mappings to dataframe
            for source_col, target_col in column_mappings.items():
                if source_col in mapped_df.columns:
                    mapped_df[target_col] = mapped_df[source_col]
                    if source_col != target_col:
                        mapped_df = mapped_df.drop(columns=[source_col], errors='ignore')
        
        # Debug: Log available columns
        print(f"DEBUG: Available columns in dataframe: {list(mapped_df.columns)}")
        print(f"DEBUG: Using transformed file: {is_transformed}")
        
        # Validation results
        errors = []
        warnings = []
        valid_rows = 0
        total_rows = len(mapped_df)
        
        # Get entity configuration for validation
        try:
            tenant = upload.tenant
            fitment_settings = tenant.fitment_settings if tenant and hasattr(tenant, 'fitment_settings') else {}
        except Exception:
            tenant = None
            fitment_settings = {}
        data_type = upload.preflight_report.get("dataType", "fitments") if upload.preflight_report else "fitments"
        
        # Mapping from display names to actual field names
        def map_display_name_to_field(display_name):
            """Convert display names like 'Year (model year)' to field names like 'year'"""
            if not display_name:
                return None
            display_lower = display_name.lower()
            # Map common display names to field names
            mapping = {
                "year (model year)": "year",
                "make (manufacturer": "makeName",
                "model (e.g.": "modelName",
                "submodel / trim": "subModelName",
                "body type": "bodyTypeName",
                "body number of doors": "bodyNumDoors",
                "drive type": "driveTypeName",
                "fuel type": "fuelTypeName",
                "engine base": "engineBase",
                "engine liter": "engine",
                "engine cylinders": "engineCylinders",
                "engine vin code": "engineVINCode",
                "engine block type": "engineBlockType",
                "transmission type": "transmissionType",
                "transmission speeds": "transmissionSpeeds",
                "transmission control type": "transmissionControlType",
                "bed type": "bedType",
                "bed length": "bedLength",
                "wheelbase": "wheelbase",
                "region": "region",
                "part number": "partId",
                "part terminology name": "partName",
                "ptid": "ptid",
            }
            # Try exact match first
            for key, value in mapping.items():
                if key in display_lower:
                    return value
            # If no match, try to extract field name from display name
            # Remove parentheses and examples, convert to camelCase
            cleaned = display_name.split("(")[0].strip().lower().replace(" ", "")
            # Common patterns
            if cleaned.startswith("year"):
                return "year"
            elif cleaned.startswith("make"):
                return "makeName"
            elif cleaned.startswith("model"):
                return "modelName"
            elif cleaned.startswith("submodel") or cleaned.startswith("trim"):
                return "subModelName"
            elif cleaned.startswith("bodytype"):
                return "bodyTypeName"
            elif "doors" in cleaned:
                return "bodyNumDoors"
            elif cleaned.startswith("drivetype"):
                return "driveTypeName"
            elif cleaned.startswith("fueltype"):
                return "fuelTypeName"
            elif cleaned.startswith("partnumber"):
                return "partId"
            return None
        
        # Use configured required fields
        # IMPORTANT: Only year, makeName, modelName are truly required for fitments
        # The "Source to VCDB identifier Field(s)" is just for AI mapping guidance, not validation
        if data_type == "fitments":
            # Always require these core fields
            required_fields = ["year", "makeName", "modelName"]
            # Optional: also require partId if it was configured as identifier
            configured_fields = fitment_settings.get("required_vcdb_fields", [])
            for field in configured_fields:
                mapped = map_display_name_to_field(field)
                if mapped == "partId":
                    # partId is optional but nice to have
                    pass  # Don't add to required, but AI should try to extract it
        else:  # products
            configured_fields = fitment_settings.get("required_product_fields", [])
            # Map display names to field names
            required_fields = []
            for field in configured_fields:
                mapped = map_display_name_to_field(field)
                if mapped:
                    required_fields.append(mapped)
            # If no valid mappings, use defaults
            if not required_fields:
                required_fields = ["partId"]
            # Always ensure partId is included
            if "partId" not in required_fields:
                required_fields = ["partId"] + required_fields
        
        # Ensure required field columns exist (create empty if missing - they might be populated during row-by-row validation)
        for req_field in required_fields:
            if req_field not in mapped_df.columns:
                mapped_df[req_field] = None  # Create column with None values
        
        # Check required columns exist - try case-insensitive matching first
        available_columns_lower = [col.lower() for col in mapped_df.columns]
        missing_columns = []
        column_aliases = {}
        
        for req_field in required_fields:
            if req_field in mapped_df.columns:
                continue  # Exact match found
            # Try case-insensitive match
            req_lower = req_field.lower()
            if req_lower in available_columns_lower:
                # Found case-insensitive match, create alias
                idx = available_columns_lower.index(req_lower)
                original_col = mapped_df.columns[idx]
                column_aliases[req_field] = original_col
                mapped_df[req_field] = mapped_df[original_col]
            else:
                # Column doesn't exist - but don't fail yet, check row-by-row (might be extracted)
                pass  # Will check row-by-row
        
        # Only report schema error if NO rows have the required fields
        # Check if any row has the required fields populated
        has_required_data = False
        for req_field in required_fields:
            if req_field in mapped_df.columns:
                # Check if any row has this field populated
                if not mapped_df[req_field].isna().all():
                    has_required_data = True
                    break
        
        if not has_required_data and len(mapped_df) > 0:
            # Try to extract from descriptions one more time before failing
            # This is a last resort - extraction should have happened in transform step
            pass  # Will check row-by-row and report specific row errors
        
        # Track duplicates (outside loop)
        existing_keys = set()
        
        # First, try to map common column names to partId before validation
        # Check for common part number column names
        part_id_column_names = [
            'partid', 'part_id', 'partnumber', 'part_number', 'partnum', 'part num',
            'sku', 'item#', 'item_number', 'productid', 'product_id', 'productcode', 'product_code',
            'part #', 'part#', 'item code', 'itemcode', 'pn', 'p/n', 'partno', 'part no'
        ]
        
        # Find potential partId column by checking column names (case-insensitive)
        part_id_source_col = None
        for col in mapped_df.columns:
            col_lower = str(col).lower().strip()
            if col_lower in part_id_column_names or 'part' in col_lower or 'sku' in col_lower or 'item' in col_lower:
                # Check if this column has values
                if mapped_df[col].notna().any() and (mapped_df[col].astype(str).str.strip() != '').any():
                    part_id_source_col = col
                    break
        
        # If found a potential partId column but partId column doesn't exist or is empty, copy values
        if part_id_source_col and ('partId' not in mapped_df.columns or mapped_df['partId'].isna().all() or (mapped_df['partId'].astype(str).str.strip() == '').all()):
            mapped_df['partId'] = mapped_df[part_id_source_col]
        
        # Last resort: Try to extract missing required fields from all columns if still missing
        # This handles cases where extraction didn't work in transform step
        for idx, row in mapped_df.iterrows():
            for field in required_fields:
                if field in mapped_df.columns:
                    value = row.get(field)
                    if pd.isna(value) or (isinstance(value, str) and len(str(value).strip()) == 0):
                        # Try to extract from any column in the original data
                        for col in mapped_df.columns:
                            col_value = str(row.get(col)) if pd.notna(row.get(col)) else ""
                            if not col_value or len(col_value.strip()) < 3:
                                continue
                            
                            # Extract year
                            if field == "year":
                                year_match = re.search(r'\b(19|20)\d{2}\b', col_value)
                                if year_match:
                                    try:
                                        year_val = int(year_match.group(0))
                                        mapped_df.loc[idx, field] = year_val
                                        break
                                    except:
                                        pass
                            
                            # Extract makeName
                            elif field == "makeName":
                                common_makes = ['Ford', 'Chevrolet', 'Chevy', 'Toyota', 'Honda', 'BMW', 'Mercedes', 'Audi', 'KIA', 'Kia', 'Acura', 'Nissan', 'Dodge', 'Ram', 'GMC', 'Jeep', 'Subaru', 'Mazda', 'Volkswagen', 'VW', 'Hyundai', 'Lexus', 'Infiniti', 'Cadillac', 'Lincoln', 'Buick', 'Chrysler', 'Jaguar', 'Land Rover', 'Porsche', 'Tesla', 'Volvo', 'Mitsubishi', 'Suzuki', 'Isuzu', 'Fiat', 'Alfa Romeo', 'Genesis', 'Maserati', 'Bentley', 'Rolls-Royce', 'Ferrari', 'Lamborghini', 'McLaren', 'Aston Martin', 'Lotus', 'AC']
                                for make in common_makes:
                                    if make.lower() in col_value.lower():
                                        mapped_df.loc[idx, field] = make
                                        break
                                if not pd.isna(mapped_df.loc[idx, field]):
                                    break
                            
                            # Extract modelName
                            elif field == "modelName":
                                # Pattern: "for YYYY Make Model" or "YYYY Make Model"
                                model_pattern = r'(?:for|fits?)\s+(?:\d{2,4}\s+)?([A-Z][A-Za-z]+)\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z0-9\-]+)?)'
                                model_match = re.search(model_pattern, col_value, re.IGNORECASE)
                                if model_match:
                                    model = model_match.group(2).strip()
                                    # Clean model (remove engine info)
                                    model = re.sub(r'\s+\d+\.\d+L.*$', '', model).strip()
                                    if len(model) > 1:
                                        mapped_df.loc[idx, field] = model
                                        break
                                # Pattern: "YYYY Make Model"
                                model_pattern2 = r'\b(19|20)\d{2}\s+([A-Z][A-Za-z]+)\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z0-9\-]+)?)'
                                model_match2 = re.search(model_pattern2, col_value)
                                if model_match2:
                                    model = model_match2.group(3).strip()
                                    model = re.sub(r'\s+\d+\.\d+L.*$', '', model).strip()
                                    if len(model) > 1:
                                        mapped_df.loc[idx, field] = model
                                        break
                            
                            # Extract partId - improved pattern matching
                            elif field == "partId":
                                # First, try direct value if it looks like a part number
                                col_value_clean = col_value.strip()
                                # More flexible patterns for part numbers
                                # Pattern 1: Alphanumeric codes (e.g., BP-12345, ABC123, 12345-ABC)
                                part_pattern1 = r'\b([A-Z0-9]{2,}[\-]?[A-Z0-9]{2,}[A-Z0-9\-]*)\b'
                                # Pattern 2: Numbers with letters (e.g., 12345A, A12345)
                                part_pattern2 = r'\b([A-Z]?\d{3,}[A-Z0-9\-]*|[A-Z]{2,}\d{2,}[A-Z0-9\-]*)\b'
                                # Pattern 3: Common part number formats
                                part_pattern3 = r'\b(?:PART|SKU|ITEM|PN)[\s#:]*([A-Z0-9\-]{3,})\b'
                                
                                part_match = None
                                # Try patterns in order
                                for pattern in [part_pattern3, part_pattern1, part_pattern2]:
                                    part_match = re.search(pattern, col_value_clean, re.IGNORECASE)
                                    if part_match:
                                        break
                                
                                # If no match with patterns, try direct value if it looks valid
                                if not part_match and len(col_value_clean) >= 3 and len(col_value_clean) <= 50:
                                    # Check if it's not a date, year, or other common non-part fields
                                    if not re.match(r'^\d{4}$', col_value_clean) and not re.match(r'^(19|20)\d{2}$', col_value_clean):
                                        # If it contains letters and numbers, or just alphanumeric
                                        if re.match(r'^[A-Z0-9\-]+$', col_value_clean.upper()):
                                            part_match = type('obj', (object,), {'group': lambda x: col_value_clean})()
                                
                                if part_match:
                                    part_id = part_match.group(1) if hasattr(part_match, 'group') else str(part_match)
                                    part_id = str(part_id).strip().upper()  # Normalize to uppercase
                                    if len(part_id) >= 2:  # More lenient minimum length
                                        mapped_df.loc[idx, field] = part_id
                                        break
        
        # Validate each row
        for idx, row in mapped_df.iterrows():
            row_num = idx + 2  # +2 because idx is 0-based and we skip header
            row_errors = []
            row_warnings = []
            
            # Check required fields (after extraction attempt)
            for field in required_fields:
                if field in mapped_df.columns:
                    value = row.get(field)
                    if pd.isna(value) or (isinstance(value, str) and len(str(value).strip()) == 0):
                        row_errors.append({
                            "row": row_num,
                            "message": f"Required field '{field}' is missing or empty",
                            "type": "required_field",
                            "field": field
                        })
            
            # Validate Year field
            if "year" in mapped_df.columns:
                year_val = row.get("year")
                if not pd.isna(year_val):
                    # Handle year ranges like "2011-2012" or "92-94"
                    year_str = str(year_val).strip()
                    if "-" in year_str:
                        # Year range - extract and validate both years
                        try:
                            parts = year_str.split("-")
                            if len(parts) == 2:
                                start_str = parts[0].strip()
                                end_str = parts[1].strip()
                                
                                # Convert to integers, handling 2-digit years
                                start_year = int(start_str)
                                end_year = int(end_str)
                                
                                # Normalize 2-digit years (0-99)
                                if 0 <= start_year <= 99:
                                    start_year = 2000 + start_year if start_year < 30 else 1900 + start_year
                                if 0 <= end_year <= 99:
                                    end_year = 2000 + end_year if end_year < 30 else 1900 + end_year
                                
                                # Validate range
                                if start_year < 1900 or start_year > 2030 or end_year < 1900 or end_year > 2030:
                                    row_errors.append({
                                        "row": row_num,
                                        "message": f"Invalid year range: {year_val} (normalized: {start_year}-{end_year})",
                                        "type": "invalid_year",
                                        "field": "year"
                                    })
                                elif start_year > end_year:
                                    row_errors.append({
                                        "row": row_num,
                                        "message": f"Invalid year range: start year {start_year} is greater than end year {end_year}",
                                        "type": "invalid_year",
                                        "field": "year"
                                    })
                            else:
                                row_errors.append({
                                    "row": row_num,
                                    "message": f"Invalid year range format: {year_val}",
                                    "type": "invalid_year",
                                    "field": "year"
                                })
                        except ValueError:
                            row_errors.append({
                                "row": row_num,
                                "message": f"Invalid year format: {year_val}",
                                "type": "invalid_year",
                                "field": "year"
                            })
                    else:
                        try:
                            year_int = int(float(year_val))
                            # Normalize 2-digit years
                            if 0 <= year_int <= 99:
                                year_int = 2000 + year_int if year_int < 30 else 1900 + year_int
                            if year_int < 1900 or year_int > 2030:
                                row_errors.append({
                                    "row": row_num,
                                    "message": f"Year {year_int} is out of valid range (1900-2030)",
                                    "type": "invalid_year",
                                    "field": "year"
                                })
                        except:
                            row_errors.append({
                                "row": row_num,
                                "message": f"Invalid year value: {year_val}",
                                "type": "invalid_year",
                                "field": "year"
                            })
            
            # Validate Make and Model (should be non-empty strings)
            for field in ["makeName", "modelName"]:
                if field in mapped_df.columns:
                    value = row.get(field)
                    if not pd.isna(value):
                        value_str = str(value).strip()
                        if len(value_str) == 0:
                            row_errors.append({
                                "row": row_num,
                                "message": f"Field '{field}' cannot be empty",
                                "type": "empty_field",
                                "field": field
                            })
                        elif len(value_str) < 2:
                            row_warnings.append({
                                "row": row_num,
                                "message": f"Field '{field}' value '{value_str}' seems too short",
                                "type": "suspicious_value",
                                "field": field
                            })
            
            # Check for duplicate rows (based on key fields)
            if data_type == "fitments":
                key_fields = ["year", "makeName", "modelName"]
                # Only include partId if it exists and has a value
                if "partId" in mapped_df.columns:
                    part_id_val = row.get("partId")
                    if pd.notna(part_id_val) and str(part_id_val).strip():
                        key_fields.append("partId")
                
                # Build row key from available fields
                row_key_parts = []
                for f in key_fields:
                    if f in mapped_df.columns:
                        val = row.get(f)
                        row_key_parts.append(str(val) if pd.notna(val) else "")
                    else:
                        row_key_parts.append("")
                
                row_key = tuple(row_key_parts)
                
                # Only flag as duplicate if key is not empty and we've seen it before
                if row_key and any(k for k in row_key):  # At least one field has a value
                    if row_key in existing_keys:
                        row_warnings.append({
                            "row": row_num,
                            "message": "Duplicate row detected (same year, make, model, part)",
                            "type": "duplicate",
                            "field": "row"
                        })
                    existing_keys.add(row_key)
            
            # Validate numeric fields
            numeric_fields = ["rotorDiameter", "rotorThickness", "boltPattern", "centerHoleDiameter"]
            for field in numeric_fields:
                if field in mapped_df.columns:
                    value = row.get(field)
                    if not pd.isna(value):
                        try:
                            float_val = float(value)
                            if float_val < 0:
                                row_warnings.append({
                                    "row": row_num,
                                    "message": f"Field '{field}' has negative value: {float_val}",
                                    "type": "negative_value",
                                    "field": field
                                })
                        except:
                            row_warnings.append({
                                "row": row_num,
                                "message": f"Field '{field}' should be numeric but got: {value}",
                                "type": "invalid_type",
                                "field": field
                            })
            
            errors.extend(row_errors)
            warnings.extend(row_warnings)
            
            if len(row_errors) == 0:
                valid_rows += 1
        
        # Create normalization results for valid rows
        created = []
        unique_part_ids = set()  # Track unique part IDs for recommendations
        
        for idx, row in mapped_df.iterrows():
            if idx < len(mapped_df) - 1:  # Skip last if needed
                row_num = idx + 1
                # Only create for rows without errors
                row_has_errors = any(e.get("row") == row_num + 1 for e in errors)
                if not row_has_errors:
                    mapped_entities = {}
                    for col in mapped_df.columns:
                        value = row.get(col)
                        if not pd.isna(value):
                            mapped_entities[col] = str(value).strip()
                    
                    # Extract part ID for recommendations (if fitments data type)
                    if data_type == "fitments" and "partId" in mapped_entities:
                        part_id = mapped_entities.get("partId", "").strip()
                        if part_id:
                            unique_part_ids.add(part_id)
                    
                    # Generate AI reasoning and confidence explanation for this row
                    column_mappings_list = ai_map_job.result.get("columnMappings", []) if ai_map_job and ai_map_job.result else []
                    # Get original row data for context (handle index alignment)
                    original_row_dict = {}
                    try:
                        # Use df (the original dataframe before mapping) instead of original_df
                        if 'df' in locals() and idx < len(df):
                            original_row_dict = df.iloc[idx].to_dict()
                    except Exception:
                        # If df not available or index mismatch, use empty dict
                        original_row_dict = {}
                    
                    confidence_score, confidence_explanation, ai_reasoning = _generate_ai_reasoning_and_confidence(
                        mapped_entities,
                        column_mappings_list,
                        data_type,
                        original_row_dict
                    )
                    
                    # Build defaults dict, only include new fields if they exist in the model
                    defaults = {
                        "mapped_entities": mapped_entities,
                        "confidence": confidence_score,
                        "status": "pending",
                    }
                    # Only add new fields if migration has been run (fields exist in model)
                    try:
                        # Test if fields exist by checking model fields
                        if hasattr(NormalizationResult, 'confidence_explanation'):
                            defaults["confidence_explanation"] = confidence_explanation
                        if hasattr(NormalizationResult, 'ai_reasoning'):
                            defaults["ai_reasoning"] = ai_reasoning
                    except Exception:
                        # If check fails, just skip the new fields
                        pass
                    
                    nr, created_flag = NormalizationResult.objects.update_or_create(
                        tenant_id=upload.tenant_id,
                        upload_id=upload.id,
                        row_index=row_num,
                        defaults=defaults,
                    )
                    if created_flag:
                        created.append({"id": str(nr.id), "rowIndex": nr.row_index, "confidence": nr.confidence})

        # Update job status - validation completed, ready for review
        job.status = "pending"
        job.params = job.params or {}
        job.params["currentStage"] = "pending"
        job.result = {
            "totalRows": total_rows,
            "validRows": valid_rows,
            "errorCount": len(errors),
            "warningCount": len(warnings),
            "created": len(created),
            "uniquePartIds": list(unique_part_ids),  # Include for frontend to fetch recommendations
            "errors": errors,
            "warnings": warnings
        }
        job.save()
        
        return Response({
            "jobId": str(job.id),
            "totalRows": total_rows,
            "validRows": valid_rows,
            "errors": errors[:100],  # Limit to first 100 errors
            "warnings": warnings[:100],  # Limit to first 100 warnings
            "results": created,
            "uniquePartIds": list(unique_part_ids)  # Return unique part IDs for recommendations
        })
        
    except Exception as e:
        job.status = "failed"
        job.result = {"error": str(e)}
        job.finished_at = timezone.now()
        job.save()
        return Response(
            {"error": f"Validation failed: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


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
    """
    Publish validated data and generate downloadable file.
    
    Returns:
    - Creates a downloadable CSV/Excel file with transformed and validated data
    - Returns download URL
    """
    import pandas as pd
    import os
    from django.http import FileResponse
    
    upload = Upload.objects.get(id=upload_id)
    job = Job.objects.create(
        tenant_id=upload.tenant_id,
        upload_id=upload.id,
        job_type="publish",
        status="queued",
    )
    
    try:
        # Read the transformed file if available, otherwise original
        file_path = upload.storage_url
        if upload.preflight_report and upload.preflight_report.get("transformed_file_path"):
            transformed_path = upload.preflight_report.get("transformed_file_path")
            if os.path.exists(transformed_path):
                file_path = transformed_path
        
        # Read the file
        if file_path.endswith(".xlsx"):
            df = pd.read_excel(file_path)
        else:
            delimiter = upload.preflight_report.get("delimiter", ",") if upload.preflight_report else ","
            encoding = upload.preflight_report.get("encoding", "utf-8") if upload.preflight_report else "utf-8"
            df = pd.read_csv(file_path, delimiter=delimiter, encoding=encoding)
        
        # Filter out rows with validation errors (only include valid rows)
        # Get validation errors from the validation job
        validation_job = Job.objects.filter(
            upload_id=upload.id,
            job_type="vcdb-validate",
            status="completed"
        ).order_by("-created_at").first()
        
        error_rows = set()
        if validation_job and validation_job.result:
            errors = validation_job.result.get("errors", [])
            for error in errors:
                row_num = error.get("row")
                if row_num and row_num > 0:
                    # Convert to 0-based index (subtract 2 for header + 1-based)
                    error_rows.add(row_num - 2)
        
        # Filter dataframe to only valid rows
        valid_df = df[~df.index.isin(error_rows)].copy()
        
        # Get data type and tenant
        data_type = upload.preflight_report.get("dataType", "fitments") if upload.preflight_report else "fitments"
        print(f"DEBUG: Publishing with dataType={data_type}, valid_df shape={valid_df.shape}, columns={list(valid_df.columns)}")
        
        tenant_obj = None
        tenant_override = None
        try:
            tenant_override = get_tenant_from_request(request)
            print(f"DEBUG: publish -> tenant override from header: {tenant_override.id} ({tenant_override.name})")
        except Http404:
            tenant_override = None
        
        if tenant_override:
            tenant_obj = tenant_override
            if str(upload.tenant_id) != str(tenant_obj.id):
                print(
                    f"DEBUG: publish -> overriding upload tenant from {upload.tenant_id} "
                    f"to {tenant_obj.id} based on X-Tenant-ID header"
                )
                upload.tenant = tenant_obj
                upload.save(update_fields=["tenant"])
                NormalizationResult.objects.filter(upload_id=upload.id).exclude(tenant_id=tenant_obj.id).update(tenant_id=tenant_obj.id)
        elif upload.tenant_id:
            try:
                tenant_obj = Tenant.objects.get(id=upload.tenant_id)
                print(f"DEBUG: Found tenant from upload: {tenant_obj.id} ({tenant_obj.name})")
            except Tenant.DoesNotExist:
                tenant_obj = Tenant.objects.filter(slug="default").first()
                print(f"DEBUG: Tenant not found, using default: {tenant_obj.id if tenant_obj else 'None'}")
        
        # Ensure tenant exists - required for database storage
        if not tenant_obj:
            tenant_obj = Tenant.objects.filter(slug="default").first()
            if not tenant_obj:
                tenant_obj = Tenant.objects.first()
            if not tenant_obj:
                error_msg = "No tenant found. Cannot publish data without a tenant."
                print(f"ERROR: {error_msg}")
                job.status = "failed"
                job.result = {"error": error_msg}
                job.finished_at = timezone.now()
                job.save()
                return Response(
                    {"error": error_msg},
                    status=status.HTTP_400_BAD_REQUEST
                )
            print(f"DEBUG: Using fallback tenant: {tenant_obj.id} ({tenant_obj.name})")
        
        # Try to use NormalizationResult records first (they have mapped data)
        # Otherwise fall back to reading from file
        # Check for any status, not just "pending"
        normalization_results = NormalizationResult.objects.filter(
            upload_id=upload.id
        ).order_by("row_index")
        
        use_normalization_results = normalization_results.exists() and normalization_results.count() > 0
        print(f"DEBUG: Found {normalization_results.count()} NormalizationResult records. Using them: {use_normalization_results}")
        if use_normalization_results:
            first_nr = normalization_results.first()
            if first_nr:
                print(f"DEBUG: First NormalizationResult sample ID: {first_nr.id}, row_index: {first_nr.row_index}")
                print(f"DEBUG: First NormalizationResult mapped_entities keys: {list(first_nr.mapped_entities.keys()) if first_nr.mapped_entities else 'None'}")
                print(f"DEBUG: First NormalizationResult sample data: {first_nr.mapped_entities}")
            else:
                print(f"DEBUG: No NormalizationResult records found")
        
        # Create Fitment or ProductData records based on dataType
        created_records = []
        created_count = 0
        error_count = 0
        skipped_count = 0
        
        if data_type == "fitments":
            # Create Fitment records
            if use_normalization_results:
                # Use NormalizationResult records
                print(f"DEBUG: Processing {normalization_results.count()} NormalizationResult records for fitments")
                print(f"DEBUG: Tenant being used: {tenant_obj.id if tenant_obj else 'None'} ({tenant_obj.name if tenant_obj else 'None'})")
                for nr in normalization_results:
                    try:
                        mapped_entities = nr.mapped_entities or {}
                        print(f"DEBUG: Processing NormalizationResult {nr.id} (row {nr.row_index}), mapped_entities keys: {list(mapped_entities.keys())}")
                        if not mapped_entities:
                            print(f"DEBUG: ⚠️ WARNING: NormalizationResult {nr.id} has empty mapped_entities!")
                            skipped_count += 1
                            continue
                        
                        # Extract required fields
                        part_id = str(mapped_entities.get("partId", "")).strip()
                        if not part_id:
                            part_id = str(mapped_entities.get("part_id", "")).strip()
                        if not part_id:
                            part_id = str(mapped_entities.get("partNumber", "")).strip()
                        if not part_id:
                            part_id = str(mapped_entities.get("Part Number", "")).strip()
                        if not part_id:
                            print(f"DEBUG: Skipping NormalizationResult {nr.id} - no partId found. Available keys: {list(mapped_entities.keys())}")
                            continue
                        
                        # Handle year
                        year_val = mapped_entities.get("year", "")
                        if not year_val:
                            year_val = mapped_entities.get("Year", "")
                        if not year_val:
                            print(f"DEBUG: ⚠️ Skipping NormalizationResult {nr.id} - no year found. Available keys: {list(mapped_entities.keys())}")
                            skipped_count += 1
                            continue
                        
                        year_str = str(year_val).strip()
                        if "-" in year_str:
                            try:
                                year = int(year_str.split("-")[0].strip())
                            except Exception as e:
                                print(f"DEBUG: Error parsing year range '{year_str}': {e}")
                                continue
                        else:
                            try:
                                year = int(float(year_val))
                            except Exception as e:
                                print(f"DEBUG: Error parsing year '{year_val}': {e}")
                                continue
                        
                        make_name = str(mapped_entities.get("makeName", "")).strip()
                        if not make_name:
                            make_name = str(mapped_entities.get("make", "")).strip()
                        if not make_name:
                            make_name = str(mapped_entities.get("Make", "")).strip()
                        
                        model_name = str(mapped_entities.get("modelName", "")).strip()
                        if not model_name:
                            model_name = str(mapped_entities.get("model", "")).strip()
                        if not model_name:
                            model_name = str(mapped_entities.get("Model", "")).strip()
                        
                        if not make_name or not model_name:
                            print(f"DEBUG: ⚠️ Skipping NormalizationResult {nr.id} - missing make or model. make={make_name}, model={model_name}. Available keys: {list(mapped_entities.keys())}")
                            skipped_count += 1
                            continue
                        
                        # Normalize make/model names (proper capitalization)
                        make_name = make_name.title() if make_name else ""
                        # Special handling for known makes (KIA, BMW, etc. should be uppercase)
                        known_uppercase_makes = ["KIA", "BMW", "AUDI", "ACURA", "INFINITI", "LEXUS", "AC"]
                        if make_name.upper() in known_uppercase_makes:
                            make_name = make_name.upper()
                        
                        model_name = model_name.title() if model_name else ""
                        # Handle special cases like "F-150" should stay as "F-150" not "F-150"
                        if "-" in model_name:
                            parts = model_name.split("-")
                            model_name = "-".join([p.title() if p else "" for p in parts])
                        
                        print(f"DEBUG: Creating fitment for partId={part_id}, year={year}, make={make_name}, model={model_name}")
                        
                        position_val = str(mapped_entities.get("position", "")).strip() or "Front"
                        position_id = int(mapped_entities.get("positionId", 1)) if mapped_entities.get("positionId") else 1
                        
                        # Check if fitment already exists (for logging/auditing)
                        existing_fitment = Fitment.objects.filter(
                            tenant=tenant_obj,
                            partId=part_id,
                            year=year,
                            makeName=make_name,
                            modelName=model_name,
                            position=position_val,
                            isDeleted=False
                        ).order_by("-createdAt").first()
                        if existing_fitment:
                            print(
                                f"DEBUG: Found existing fitment {existing_fitment.hash} for "
                                f"partId={part_id}, year={year}, make={make_name}, model={model_name}. "
                                "Creating a new version tied to this upload."
                            )
                        
                        source_metadata = {
                            "uploadId": str(upload.id),
                            "uploadFilename": upload.filename,
                            "normalizationResultId": str(nr.id),
                            "rowIndex": nr.row_index,
                            "publishedAt": timezone.now().isoformat(),
                            "dataType": data_type,
                        }
                        
                        fitment_notes = f"Auto-created from upload {upload.filename} ({upload.id}), row {nr.row_index}"
                        
                        fitment = Fitment(
                            tenant=tenant_obj,
                            partId=part_id,
                            year=year,
                            makeName=make_name,
                            modelName=model_name,
                            subModelName=str(mapped_entities.get("submodel", "")).strip() or "",
                            driveTypeName=str(mapped_entities.get("driveType", "")).strip() or "",
                            fuelTypeName=str(mapped_entities.get("engine", "")).strip() or "",
                            bodyNumDoors=int(mapped_entities.get("bodyNumDoors", 0)) if mapped_entities.get("bodyNumDoors") else 0,
                            bodyTypeName=str(mapped_entities.get("body", "")).strip() or "",
                            ptid=str(mapped_entities.get("ptid", "")).strip() or "0",
                            partTypeDescriptor=str(mapped_entities.get("productType", "")).strip() or "",
                            uom="EA",
                            quantity=int(mapped_entities.get("quantity", 1)) if mapped_entities.get("quantity") else 1,
                            fitmentTitle=f"{year} {make_name} {model_name} - {part_id}",
                            fitmentDescription=str(mapped_entities.get("description", "")).strip() or "",
                            fitmentNotes=fitment_notes,
                            position=position_val,
                            positionId=position_id,
                            liftHeight=str(mapped_entities.get("liftHeight", "")).strip() or "",
                            wheelType=str(mapped_entities.get("wheelType", "")).strip() or "",
                            baseVehicleId=f"{year}_{make_name}_{model_name}",
                            fitmentType="manual_fitment",
                            createdBy="data_upload",
                            updatedBy="data_upload",
                            dynamicFields={
                                "sourceUpload": source_metadata,
                            },
                        )
                        try:
                            print(
                                f"DEBUG: About to create fitment - partId={part_id}, year={year}, "
                                f"make={make_name}, model={model_name}, tenant={tenant_obj.id if tenant_obj else 'None'}"
                            )
                            fitment.save()  # This will generate the hash
                            created = True
                            created_count += 1
                            created_records.append({"type": "fitment", "id": fitment.hash, "partId": part_id})
                            print(
                                f"DEBUG: ✅ Successfully created fitment {fitment.hash} for partId={part_id}, "
                                f"year={year}, make={make_name}, model={model_name}, tenant={tenant_obj.id if tenant_obj else 'None'}"
                            )
                            
                            # Verify it was actually saved
                            verify_fitment = Fitment.objects.filter(hash=fitment.hash).first()
                            if verify_fitment:
                                print(f"DEBUG: ✅ Verification: Fitment {fitment.hash} exists in database")
                            else:
                                print(f"DEBUG: ❌ ERROR: Fitment {fitment.hash} was NOT found in database after save!")
                        except Exception as save_error:
                            print(f"ERROR saving new fitment: {save_error}")
                            print(f"ERROR details - partId={part_id}, year={year}, make={make_name}, model={model_name}")
                            import traceback
                            traceback.print_exc()
                            error_count += 1
                            continue
                    except Exception as e:
                        error_count += 1
                        print(f"ERROR creating fitment from NormalizationResult {nr.id}: {str(e)}")
                        import traceback
                        traceback.print_exc()
                        continue
            else:
                # Fall back to reading from file
                # Normalize column names to lowercase for case-insensitive matching
                column_map = {col.lower(): col for col in valid_df.columns}
                
                for idx, row in valid_df.iterrows():
                    try:
                        # Helper function to get value with case-insensitive column name
                        def get_col(key, default=""):
                            key_lower = key.lower()
                            if key_lower in column_map:
                                val = row.get(column_map[key_lower])
                                return val if pd.notna(val) else default
                            return default
                        
                        # Extract required fields with defaults
                        part_id = str(get_col("partId", "")).strip()
                        if not part_id:
                            # Try alternative column names
                            part_id = str(get_col("part_id", "")).strip()
                            if not part_id:
                                part_id = str(get_col("partnumber", "")).strip()
                        if not part_id:
                            continue
                        
                        # Handle year (could be range or single year)
                        year_val = get_col("year", None)
                        if year_val is None or pd.isna(year_val):
                            continue
                        
                        year_str = str(year_val).strip()
                        if "-" in year_str:
                            # Use first year of range
                            try:
                                year = int(year_str.split("-")[0].strip())
                            except:
                                continue
                        else:
                            try:
                                year = int(float(year_val))
                            except:
                                continue
                        
                        make_name = str(get_col("makeName", "")).strip()
                        if not make_name:
                            make_name = str(get_col("make", "")).strip()
                        
                        model_name = str(get_col("modelName", "")).strip()
                        if not model_name:
                            model_name = str(get_col("model", "")).strip()
                        
                        if not make_name or not model_name:
                            continue
                        
                        # Normalize make/model names (proper capitalization)
                        make_name = make_name.title() if make_name else ""
                        # Special handling for known makes (KIA, BMW, etc. should be uppercase)
                        known_uppercase_makes = ["KIA", "BMW", "AUDI", "ACURA", "INFINITI", "LEXUS", "AC"]
                        if make_name.upper() in known_uppercase_makes:
                            make_name = make_name.upper()
                        
                        model_name = model_name.title() if model_name else ""
                        # Handle special cases like "F-150" should stay as "F-150" not "F-150"
                        if "-" in model_name:
                            parts = model_name.split("-")
                            model_name = "-".join([p.title() if p else "" for p in parts])
                    
                        position_val = str(get_col("position", "")).strip() or "Front"
                        position_id_val = get_col("positionId", 1)
                        position_id = int(position_id_val) if pd.notna(position_id_val) and str(position_id_val).strip() else 1
                        
                        existing_fitment = Fitment.objects.filter(
                            tenant=tenant_obj,
                            partId=part_id,
                            year=year,
                            makeName=make_name,
                            modelName=model_name,
                            position=position_val,
                            isDeleted=False
                        ).order_by("-createdAt").first()
                        if existing_fitment:
                            print(
                                f"DEBUG: Found existing fitment {existing_fitment.hash} for "
                                f"partId={part_id}, year={year}, make={make_name}, model={model_name}. "
                                "Creating a new version tied to this upload."
                            )
                        
                        body_doors = get_col("bodyNumDoors", 0)
                        qty = get_col("quantity", 1)
                        
                        source_metadata = {
                            "uploadId": str(upload.id),
                            "uploadFilename": upload.filename,
                            "rowIndex": idx + 1,
                            "publishedAt": timezone.now().isoformat(),
                            "dataType": data_type,
                            "source": "transformed_file",
                        }
                        fitment_notes = f"Auto-created from upload {upload.filename} ({upload.id}), row {idx + 1}"
                        
                        fitment = Fitment(
                            tenant=tenant_obj,
                            partId=part_id,
                            year=year,
                            makeName=make_name,
                            modelName=model_name,
                            subModelName=str(get_col("submodel", "")).strip() or "",
                            driveTypeName=str(get_col("driveType", "")).strip() or "",
                            fuelTypeName=str(get_col("engine", "")).strip() or "",
                            bodyNumDoors=int(body_doors) if pd.notna(body_doors) and str(body_doors).strip() else 0,
                            bodyTypeName=str(get_col("body", "")).strip() or "",
                            ptid=str(get_col("ptid", "")).strip() or "0",
                            partTypeDescriptor=str(get_col("productType", "")).strip() or "",
                            uom="EA",
                            quantity=int(qty) if pd.notna(qty) and str(qty).strip() else 1,
                            fitmentTitle=f"{year} {make_name} {model_name} - {part_id}",
                            fitmentDescription=str(get_col("description", "")).strip() or "",
                            fitmentNotes=fitment_notes,
                            position=position_val,
                            positionId=position_id,
                            liftHeight=str(get_col("liftHeight", "")).strip() or "",
                            wheelType=str(get_col("wheelType", "")).strip() or "",
                            baseVehicleId=f"{year}_{make_name}_{model_name}",
                            fitmentType="manual_fitment",
                            createdBy="data_upload",
                            updatedBy="data_upload",
                            dynamicFields={
                                "sourceUpload": source_metadata,
                            },
                        )
                        try:
                            print(
                                f"DEBUG: About to create fitment (fallback) - partId={part_id}, year={year}, "
                                f"make={make_name}, model={model_name}, tenant={tenant_obj.id if tenant_obj else 'None'}"
                            )
                            fitment.save()
                            created = True
                            created_count += 1
                            created_records.append({"type": "fitment", "id": fitment.hash, "partId": part_id})
                            print(
                                f"DEBUG: ✅ Successfully created fitment {fitment.hash} for partId={part_id}, "
                                f"year={year}, make={make_name}, model={model_name}, tenant={tenant_obj.id if tenant_obj else 'None'}"
                            )
                        except Exception as save_error:
                            print(f"ERROR saving fitment for row {idx}: {str(save_error)}")
                            import traceback
                            traceback.print_exc()
                            error_count += 1
                            continue
                    except Exception as e:
                        error_count += 1
                        print(f"ERROR creating fitment for row {idx}: {str(e)}")
                        import traceback
                        traceback.print_exc()
                        continue
            
            print(f"DEBUG: Fitment creation complete: created={created_count}, errors={error_count}, skipped={skipped_count}, total_rows={len(valid_df) if not use_normalization_results else normalization_results.count()}")
            if skipped_count > 0:
                print(f"DEBUG: ⚠️ WARNING: {skipped_count} records were skipped due to missing required fields (partId, year, makeName, modelName)")
        
        elif data_type == "products":
            # Create ProductData records
            if use_normalization_results:
                # Use NormalizationResult records
                print(f"DEBUG: Processing {normalization_results.count()} NormalizationResult records for products")
                for nr in normalization_results:
                    try:
                        mapped_entities = nr.mapped_entities or {}
                        print(f"DEBUG: Processing NormalizationResult {nr.id} for product, mapped_entities keys: {list(mapped_entities.keys())}")
                        
                        # Extract part ID
                        part_id = str(mapped_entities.get("partId", "")).strip()
                        if not part_id:
                            part_id = str(mapped_entities.get("part_id", "")).strip()
                        if not part_id:
                            part_id = str(mapped_entities.get("partNumber", "")).strip()
                        if not part_id:
                            part_id = str(mapped_entities.get("Part Number", "")).strip()
                        if not part_id:
                            part_id = str(mapped_entities.get("sku", "")).strip()
                        if not part_id:
                            print(f"DEBUG: Skipping NormalizationResult {nr.id} - no partId found. Available keys: {list(mapped_entities.keys())}")
                            continue
                        
                        # Extract description
                        description = str(mapped_entities.get("description", "")).strip()
                        if not description:
                            description = str(mapped_entities.get("partName", "")).strip()
                        if not description:
                            description = str(mapped_entities.get("name", "")).strip()
                        if not description:
                            description = part_id  # Fallback to part_id
                        
                        # Build specifications from available fields
                        specifications = {}
                        spec_fields = ["rotorDiameter", "rotorThickness", "boltPattern", "centerHoleDiameter", 
                                      "height", "newThickness", "minimumThickness", "pcd", "diameter", "thickness"]
                        for field in spec_fields:
                            val = mapped_entities.get(field)
                            if val is not None and str(val).strip():
                                try:
                                    # Try to convert numeric values
                                    float_val = float(val)
                                    specifications[field] = float_val
                                except:
                                    specifications[field] = str(val).strip()
                        
                        # Extract other fields
                        category = str(mapped_entities.get("category", "")).strip() or ""
                        part_type = str(mapped_entities.get("productType", "")).strip() or str(mapped_entities.get("partType", "")).strip() or ""
                        compatibility = str(mapped_entities.get("compatibility", "")).strip() or ""
                        brand = str(mapped_entities.get("brand", "")).strip() or ""
                        sku = str(mapped_entities.get("sku", "")).strip() or part_id
                        
                        # Create or update ProductData
                        try:
                            product, created = ProductData.objects.update_or_create(
                                part_id=part_id,
                                tenant=tenant_obj,
                                defaults={
                                    "description": description,
                                    "category": category,
                                    "part_type": part_type,
                                    "compatibility": compatibility,
                                    "specifications": specifications,
                                    "brand": brand,
                                    "sku": sku,
                                    "source_file_name": upload.filename,
                                }
                            )
                            
                            if created:
                                created_count += 1
                                created_records.append({"type": "product", "id": product.id, "part_id": part_id})
                                print(f"DEBUG: ✅ Successfully created product {product.id} for partId={part_id}, tenant={tenant_obj.id if tenant_obj else 'None'}")
                            else:
                                print(f"DEBUG: ✅ Updated existing product {product.id} for partId={part_id}")
                        except Exception as save_error:
                            print(f"ERROR saving product: {save_error}")
                            import traceback
                            traceback.print_exc()
                            error_count += 1
                            continue
                    except Exception as e:
                        error_count += 1
                        print(f"ERROR creating product from NormalizationResult {nr.id}: {str(e)}")
                        import traceback
                        traceback.print_exc()
                        continue
            else:
                # Fall back to reading from file
                # Normalize column names to lowercase for case-insensitive matching
                column_map = {col.lower(): col for col in valid_df.columns}
                
                for idx, row in valid_df.iterrows():
                    try:
                        # Helper function to get value with case-insensitive column name
                        def get_col(key, default=""):
                            key_lower = key.lower()
                            if key_lower in column_map:
                                val = row.get(column_map[key_lower])
                                return val if pd.notna(val) else default
                            return default
                        
                        part_id = str(get_col("partId", "")).strip()
                        if not part_id:
                            part_id = str(get_col("part_id", "")).strip()
                        if not part_id:
                            part_id = str(get_col("partnumber", "")).strip()
                        if not part_id:
                            continue
                        
                        description = str(get_col("description", "")).strip()
                        if not description:
                            description = str(get_col("partName", "")).strip()
                        if not description:
                            description = part_id
                        
                        # Build specifications from available fields
                        specifications = {}
                        spec_fields = ["rotorDiameter", "rotorThickness", "boltPattern", "centerHoleDiameter", 
                                      "height", "newThickness", "minimumThickness", "pcd"]
                        for field in spec_fields:
                            val = get_col(field, None)
                            if val is not None and pd.notna(val):
                                specifications[field] = str(val).strip()
                        
                        # Create or update ProductData
                        try:
                            product, created = ProductData.objects.update_or_create(
                                part_id=part_id,
                                tenant=tenant_obj,
                                defaults={
                                    "description": description,
                                    "category": str(get_col("category", "")).strip() or "",
                                    "part_type": str(get_col("productType", "")).strip() or str(get_col("partType", "")).strip() or "",
                                    "compatibility": str(get_col("compatibility", "")).strip() or "",
                                    "specifications": specifications,
                                    "brand": str(get_col("brand", "")).strip() or "",
                                    "sku": str(get_col("sku", "")).strip() or part_id,
                                    "source_file_name": upload.filename,
                                }
                            )
                            
                            if created:
                                created_count += 1
                                created_records.append({"type": "product", "id": product.id, "part_id": part_id})
                                print(f"DEBUG: ✅ Successfully created product {product.id} for partId={part_id}, tenant={tenant_obj.id if tenant_obj else 'None'}")
                            else:
                                print(f"DEBUG: ✅ Updated existing product {product.id} for partId={part_id}")
                        except Exception as save_error:
                            print(f"ERROR saving product: {save_error}")
                            import traceback
                            traceback.print_exc()
                            error_count += 1
                            continue
                    except Exception as e:
                        error_count += 1
                        print(f"ERROR creating product for row {idx}: {str(e)}")
                        import traceback
                        traceback.print_exc()
                        continue
        
        # Generate output file
        output_dir = os.path.join(settings.BASE_DIR, "storage", "exports")
        os.makedirs(output_dir, exist_ok=True)
        
        # Create filename with timestamp
        from datetime import datetime
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        original_filename = os.path.basename(upload.storage_url)
        base_name = os.path.splitext(original_filename)[0]
        output_filename = f"{base_name}_published_{timestamp}.csv"
        output_path = os.path.join(output_dir, output_filename)
        
        # Save to CSV
        valid_df.to_csv(output_path, index=False)
        
        # Update upload with published file path
        if not upload.preflight_report:
            upload.preflight_report = {}
        upload.preflight_report["published_file_path"] = output_path
        upload.preflight_report["published_filename"] = output_filename
        upload.save()
        
        # Count published records
        published_count = len(valid_df)
        
        # Update job status
        job.status = "completed"
        job.result = {
            "publishedCount": published_count,
            "createdCount": created_count,
            "errorCount": error_count,
            "dataType": data_type,
            "downloadUrl": f"/api/uploads/{upload_id}/download",
            "filename": output_filename,
            "records": created_records[:50],  # Limit to first 50 for response size
            "usedNormalizationResults": use_normalization_results
        }
        job.finished_at = timezone.now()
        job.save()
        
        print(f"DEBUG: ========== PUBLISH SUMMARY ==========")
        print(f"DEBUG: Data Type: {data_type}")
        print(f"DEBUG: Tenant: {tenant_obj.id if tenant_obj else 'None'} ({tenant_obj.name if tenant_obj else 'None'})")
        print(f"DEBUG: Used NormalizationResult: {use_normalization_results}")
        print(f"DEBUG: NormalizationResult count: {normalization_results.count() if use_normalization_results else 0}")
        print(f"DEBUG: Records created: {created_count}")
        print(f"DEBUG: Records skipped: {skipped_count}")
        print(f"DEBUG: Errors: {error_count}")
        print(f"DEBUG: Published count: {published_count}")
        print(f"DEBUG: ======================================")
        
        # Verify records were actually saved
        if data_type == "fitments":
            # Count actual fitments in database for this tenant
            if tenant_obj:
                actual_count = Fitment.objects.filter(tenant=tenant_obj, isDeleted=False).count()
                print(f"DEBUG: Verification - Total fitments in database for tenant {tenant_obj.id}: {actual_count}")
                if created_count > 0:
                    # Check if the created records actually exist
                    created_hashes = [r.get("id") for r in created_records if r.get("type") == "fitment"]
                    if created_hashes:
                        existing_hashes = Fitment.objects.filter(hash__in=created_hashes, tenant=tenant_obj).count()
                        print(f"DEBUG: Verification - {existing_hashes} out of {len(created_hashes)} created fitments found in database")
            else:
                print(f"DEBUG: ⚠️ WARNING: No tenant found, cannot verify fitments")
        elif data_type == "products":
            # Count actual products in database for this tenant
            if tenant_obj:
                actual_count = ProductData.objects.filter(tenant=tenant_obj).count()
                print(f"DEBUG: Verification - Total products in database for tenant {tenant_obj.id}: {actual_count}")
                if created_count > 0:
                    # Check if the created records actually exist
                    created_ids = [r.get("id") for r in created_records if r.get("type") == "product"]
                    if created_ids:
                        existing_ids = ProductData.objects.filter(id__in=created_ids, tenant=tenant_obj).count()
                        print(f"DEBUG: Verification - {existing_ids} out of {len(created_ids)} created products found in database")
            else:
                print(f"DEBUG: ⚠️ WARNING: No tenant found, cannot verify products")
        
        return Response({
            "jobId": str(job.id),
            "result": job.result,
            "downloadUrl": f"/api/uploads/{upload_id}/download",
            "filename": output_filename,
            "createdCount": created_count,
            "errorCount": error_count,
            "dataType": data_type,
            "message": f"Successfully created {created_count} {data_type} in database" if created_count > 0 else f"Published {published_count} records (no new database records created)"
        })
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"ERROR in publish endpoint: {str(e)}")
        print(f"Traceback: {error_trace}")
        job.status = "failed"
        job.result = {"error": str(e), "traceback": error_trace}
        job.finished_at = timezone.now()
        job.save()
        return Response(
            {"error": f"Publish failed: {str(e)}", "details": error_trace},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["GET"])
def download_published_file(request, upload_id: str):
    """
    Download the published/transformed file.
    """
    import os
    from django.http import FileResponse, Http404
    
    upload = Upload.objects.get(id=upload_id)
    
    # Get published file path
    file_path = None
    filename = "output.csv"
    
    if upload.preflight_report and upload.preflight_report.get("published_file_path"):
        file_path = upload.preflight_report.get("published_file_path")
        filename = upload.preflight_report.get("published_filename", "output.csv")
    elif upload.preflight_report and upload.preflight_report.get("transformed_file_path"):
        file_path = upload.preflight_report.get("transformed_file_path")
        filename = os.path.basename(file_path)
    else:
        file_path = upload.storage_url
        filename = os.path.basename(file_path)
    
    if not file_path or not os.path.exists(file_path):
        raise Http404("File not found")
    
    response = FileResponse(
        open(file_path, 'rb'),
        content_type='text/csv',
        as_attachment=True,
        filename=filename
    )
    return response


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


@api_view(["GET"])
def job_history(request):
    """
    Get job history with filtering and pagination.
    Query params: page, status, job_type, search
    """
    from django.core.paginator import Paginator
    
    # Get tenant from request
    try:
        tenant = get_tenant_from_request(request)
    except:
        return Response({"error": "Tenant not found"}, status=status.HTTP_404_NOT_FOUND)
    
    # Get filter parameters
    page_num = int(request.query_params.get("page", 1))
    status_filter = request.query_params.get("status")
    type_filter = request.query_params.get("job_type")
    search_query = request.query_params.get("search", "").lower()
    
    # Filter jobs by tenant
    jobs_qs = Job.objects.filter(tenant=tenant).select_related("upload").order_by("-created_at")
    
    # Apply filters
    if status_filter:
        jobs_qs = jobs_qs.filter(status=status_filter)
    if type_filter:
        jobs_qs = jobs_qs.filter(job_type=type_filter)
    if search_query:
        jobs_qs = jobs_qs.filter(upload__filename__icontains=search_query)
    
    # Paginate - show more jobs per page for better UX
    paginator = Paginator(jobs_qs, 20)  # 20 items per page
    page_obj = paginator.get_page(page_num)
    
    # Serialize jobs
    jobs_data = []
    for job in page_obj:
        job_data = {
            "id": str(job.id),
            "job_type": job.job_type,
            "status": job.status,
            "created_at": job.created_at.isoformat() if job.created_at else None,
            "finished_at": job.finished_at.isoformat() if job.finished_at else None,
            "upload": {
                "id": str(job.upload.id),
                "filename": job.upload.filename,
                "preflight_report": job.upload.preflight_report or {},
            } if job.upload else None,
            "result": job.result or {},
        }
        jobs_data.append(job_data)
    
    return Response({
        "items": jobs_data,
        "totalCount": paginator.count,
        "page": page_num,
        "totalPages": paginator.num_pages,
    })


@api_view(["POST"])
def fitment_rules_upload(request):
    """Upload file for fitment rules processing (local storage only)"""
    file_obj = request.FILES.get("file")
    if not file_obj:
        return Response({"message": "file is required"}, status=status.HTTP_400_BAD_REQUEST)
    
    data_type = request.POST.get("dataType", "fitments")  # fitments or products
    
    tenant_obj = None
    # Prefer X-Tenant-ID header when available
    try:
        tenant_obj = get_tenant_from_request(request)
        print(f"DEBUG: fitment_rules_upload -> resolved tenant from header: {tenant_obj.id} ({tenant_obj.name})")
    except Http404:
        tenant_obj = None
    
    if tenant_obj is None:
        tenant_param = request.POST.get("tenantId") or request.query_params.get("tenantId")
        if tenant_param:
            try:
                tenant_obj = Tenant.objects.get(id=tenant_param)
            except Exception:
                tenant_obj = Tenant.objects.filter(slug=tenant_param).first() or Tenant.objects.filter(name=tenant_param).first()
    
    if tenant_obj is None:
        tenant_obj = Tenant.objects.filter(slug="default").first()
    if tenant_obj is None:
        return Response({"message": "Invalid or missing tenantId; no default tenant found"}, status=status.HTTP_400_BAD_REQUEST)
    
    # Read bytes
    file_bytes = file_obj.read()
    file_obj.seek(0)
    pf = preflight(file_bytes, file_obj.name)
    checksum = pf.get("checksum") or compute_checksum(file_bytes)
    
    # Size limit (250MB)
    max_mb = int(os.getenv("MAX_UPLOAD_MB", "250"))
    if len(file_bytes) > max_mb * 1024 * 1024:
        return Response({"message": f"File too large (> {max_mb} MB)"}, status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE)
    
    # Always use local storage
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
        preset_id=None,
    )
    upload.save()
    
    # Store data type in params for later use
    upload.preflight_report = {**(upload.preflight_report or {}), "dataType": data_type}
    upload.save()
    
    # Create lineage
    Lineage.objects.create(
        tenant_id=str(tenant_obj.id),
        entity_type="upload",
        entity_id=str(upload.id),
        meta={"storage_path": storage_url, "dataType": data_type},
    )
    
    return Response({"id": str(upload.id), "message": "uploaded", "dataType": data_type}, status=status.HTTP_201_CREATED)


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
    
    # Get tenant from request or from first fitment item
    tenant_id = body.get('tenantId') or (items[0].get('tenantId') if items else None)
    tenant = None
    if tenant_id:
        from tenants.models import Tenant
        try:
            tenant = Tenant.objects.get(id=tenant_id)
        except Tenant.DoesNotExist:
            return Response({"message": f"Tenant with ID {tenant_id} not found"}, status=400)
    
    created = 0
    for it in items:
        try:
            # Extract dynamic fields and map them to field configurations
            from field_config.models import FieldConfiguration
            
            standard_fields = {
                'partId', 'baseVehicleId', 'year', 'make', 'makeName', 'model', 'modelName', 
                'submodel', 'subModelName', 'driveType', 'driveTypeName', 'fuelType', 'fuelTypeName',
                'numDoors', 'bodyNumDoors', 'bodyType', 'bodyTypeName', 'partTypeId', 'ptid',
                'partTypeDescriptor', 'quantity', 'title', 'description', 'notes', 'position',
                'positionId', 'liftHeight', 'wheelType', 'fitmentType'
            }
            
            # Store dynamic fields with field configuration references
            dynamic_fields = {}
            for key, value in it.items():
                if key not in standard_fields and value is not None:
                    # Try to find the field configuration for this field
                    try:
                        field_config = FieldConfiguration.objects.get(
                            name=key,
                            is_enabled=True
                        )
                        dynamic_fields[str(field_config.id)] = {
                            'value': value,
                            'field_name': key,
                            'field_config_id': field_config.id,
                            'field_config_name': field_config.name,
                            'field_config_display_name': field_config.display_name
                        }
                    except FieldConfiguration.DoesNotExist:
                        # If no field config found, store with field name as key (fallback)
                        dynamic_fields[key] = {
                            'value': value,
                            'field_name': key,
                            'field_config_id': None,
                            'field_config_name': key,
                            'field_config_display_name': key.replace('_', ' ').title()
                        }
            
            Fitment.objects.create(
                hash=uuid.uuid4().hex,
                tenant=tenant,  # Associate with tenant
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
                fitmentType=it.get('fitmentType', 'manual_fitment'),
                dynamicFields=dynamic_fields,  # Store dynamic fields
                createdBy='api', updatedBy='api'
            )
            created += 1
        except Exception:
            continue
    return Response({"created": created})


@api_view(["POST"])
def publish_for_review(request, upload_id: str):
    """
    Publish data for review - creates a job with 'pending' status instead of loading to DB.
    The data will be reviewed and approved later.
    """
    upload = Upload.objects.get(id=upload_id)
    
    # Get tenant
    try:
        tenant_obj = get_tenant_from_request(request)
    except Http404:
        tenant_obj = upload.tenant if upload.tenant_id else Tenant.objects.filter(slug="default").first()
    
    if not tenant_obj:
        return Response(
            {"error": "No tenant found. Cannot publish data without a tenant."},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Get or create the single job for this upload (should already exist)
    data_type = upload.preflight_report.get("dataType", "fitments") if upload.preflight_report else "fitments"
    job = get_or_create_upload_job(upload, data_type)
    
    # Update job status to pending (ready for review)
    job.status = "pending"
    job.params = job.params or {}
    job.params["currentStage"] = "pending"
    job.params["dataType"] = data_type
    job.save()
    
    # Get validation results from the same job (job.result already contains validation data)
    validation_job = job  # Use the same job we just updated
    
    normalization_results = NormalizationResult.objects.filter(
        upload_id=upload.id
    ).order_by("row_index")
    
    # Store review data in job.result
    review_data = {
        "totalRows": normalization_results.count() if normalization_results.exists() else 0,
        "validRows": 0,
        "invalidRows": 0,
        "errors": [],
        "normalizationResults": [],
    }
    
    if validation_job and validation_job.result:
        review_data["errors"] = validation_job.result.get("errors", [])
        review_data["validRows"] = validation_job.result.get("validRows", 0)
        review_data["invalidRows"] = len(review_data["errors"])
    
    # Store normalization results metadata (not full data to avoid huge JSON)
    if normalization_results.exists():
        review_data["normalizationResults"] = [
            {
                "id": str(nr.id),
                "rowIndex": nr.row_index,
                "status": nr.status,
                "confidence": nr.confidence,
            }
            for nr in normalization_results[:1000]  # Limit to first 1000 for metadata
        ]
    
    job.result = review_data
    job.save()
    
    return Response({
        "id": str(job.id),
        "jobId": str(job.id),
        "status": job.status,
        "message": "Job created for review",
        "totalRows": review_data["totalRows"],
        "validRows": review_data["validRows"],
        "invalidRows": review_data["invalidRows"],
    })


@api_view(["GET"])
def export_invalid_rows(request, upload_id: str):
    """
    Export invalid rows from validation as CSV.
    """
    import pandas as pd
    from django.http import HttpResponse
    
    upload = Upload.objects.get(id=upload_id)
    
    # Get the single job for this upload (now uses data-upload type)
    validation_job = Job.objects.filter(
        upload_id=upload.id,
        job_type="data-upload"
    ).order_by("-created_at").first()
    
    if not validation_job:
        return Response(
            {"error": "No job found for this upload"},
            status=status.HTTP_404_NOT_FOUND
        )
    
    if not validation_job.result:
        return Response(
            {"error": "No validation results found"},
            status=status.HTTP_404_NOT_FOUND
        )
    
    errors = validation_job.result.get("errors", [])
    if not errors:
        return Response(
            {"error": "No invalid rows found"},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Get error row indices
    error_row_indices = set()
    for error in errors:
        row_num = error.get("row")
        if row_num and row_num > 0:
            error_row_indices.add(row_num - 2)  # Convert to 0-based index
    
    # Read the original file
    if upload.file_format == "xlsx":
        df = pd.read_excel(upload.storage_url)
    else:
        delimiter = upload.preflight_report.get("delimiter", ",") if upload.preflight_report else ","
        encoding = upload.preflight_report.get("encoding", "utf-8") if upload.preflight_report else "utf-8"
        df = pd.read_csv(upload.storage_url, delimiter=delimiter, encoding=encoding)
    
    # Filter to only error rows
    invalid_df = df[df.index.isin(error_row_indices)].copy()
    
    # Add error messages as a column
    error_messages = {}
    for error in errors:
        row_idx = error.get("row", 0) - 2
        if row_idx in error_messages:
            error_messages[row_idx] += "; " + str(error.get("message", ""))
        else:
            error_messages[row_idx] = str(error.get("message", ""))
    
    invalid_df["_error_message"] = invalid_df.index.map(lambda x: error_messages.get(x, ""))
    
    # Convert to CSV
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="invalid_rows_{upload_id}.csv"'
    invalid_df.to_csv(response, index=False)
    return response


@api_view(["GET"])
def get_job_review_data(request, job_id: str):
    """
    Get original and AI-generated rows for a job review.
    """
    import pandas as pd
    import traceback
    
    try:
        # Get tenant from request for filtering
        try:
            tenant = get_tenant_from_request(request)
            job = Job.objects.get(id=job_id, tenant=tenant)
        except Http404:
            # If tenant not found in header, try without tenant filter
            job = Job.objects.get(id=job_id)
        except Job.DoesNotExist:
            return Response(
                {"error": "Job not found"},
                status=status.HTTP_404_NOT_FOUND
            )
    except Job.DoesNotExist:
        return Response(
            {"error": "Job not found"},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        print(f"Error getting job: {str(e)}")
        traceback.print_exc()
        return Response(
            {"error": f"Error getting job: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    try:
        upload = job.upload
        if not upload:
            return Response(
                {"error": "Upload not found for this job"},
                status=status.HTTP_404_NOT_FOUND
            )
    except Exception as e:
        print(f"Error getting upload: {str(e)}")
        traceback.print_exc()
        return Response(
            {"error": f"Error getting upload: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    # Get normalization results (these contain the AI-generated/mapped data)
    try:
        normalization_results = NormalizationResult.objects.filter(
            upload_id=upload.id
        ).order_by("row_index")
        
        # Create a mapping for faster lookup
        nr_by_row_index = {nr.row_index: nr for nr in normalization_results}
    except Exception as e:
        print(f"Error getting normalization results: {str(e)}")
        traceback.print_exc()
        nr_by_row_index = {}
    
    # Read original file
    try:
        if upload.file_format == "xlsx":
            original_df = pd.read_excel(upload.storage_url)
        else:
            delimiter = upload.preflight_report.get("delimiter", ",") if upload.preflight_report else ","
            encoding = upload.preflight_report.get("encoding", "utf-8") if upload.preflight_report else "utf-8"
            original_df = pd.read_csv(upload.storage_url, delimiter=delimiter, encoding=encoding)
    except Exception as e:
        print(f"Error reading file: {str(e)}")
        traceback.print_exc()
        return Response(
            {"error": f"Failed to read original file: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    # Get validation errors
    try:
        validation_job = Job.objects.filter(
            upload_id=upload.id,
            job_type="vcdb-validate",
            status="completed"
        ).order_by("-created_at").first()
        
        error_rows = set()
        if validation_job and validation_job.result:
            errors = validation_job.result.get("errors", [])
            for error in errors:
                row_num = error.get("row")
                if row_num and row_num > 0:
                    error_rows.add(row_num - 2)  # Convert to 0-based index
    except Exception as e:
        print(f"Error getting validation errors: {str(e)}")
        traceback.print_exc()
        error_rows = set()
    
    # Build response data
    original_rows = []
    ai_generated_rows = []
    
    try:
        # Limit to first 1000 rows for performance
        max_rows = min(1000, len(original_df))
        
        for idx in range(max_rows):
            try:
                # Original row - convert to dict and handle NaN values
                original_row = original_df.iloc[idx].to_dict()
                # Convert NaN/None to empty strings for JSON serialization
                for key, value in original_row.items():
                    try:
                        if value is None:
                            original_row[key] = ""
                        elif isinstance(value, float) and (pd.isna(value) or str(value) == 'nan'):
                            original_row[key] = ""
                        elif pd.isna(value):
                            original_row[key] = ""
                        else:
                            # Convert to string for JSON serialization, but keep numbers as numbers
                            if isinstance(value, (int, float, bool)):
                                original_row[key] = value
                            else:
                                original_row[key] = str(value) if value is not None else ""
                    except Exception:
                        # If any error occurs, just convert to string
                        original_row[key] = str(value) if value is not None else ""
                
                original_row["_row_index"] = idx + 1
                original_row["_has_error"] = idx in error_rows
                original_rows.append(original_row)
                
                # AI-generated row (from normalization result)
                row_index_1_based = idx + 1
                nr = nr_by_row_index.get(row_index_1_based)
                
                if nr and nr.mapped_entities:
                    ai_row = nr.mapped_entities.copy()
                    # Ensure all values are JSON-serializable
                    for key, value in ai_row.items():
                        try:
                            if value is None:
                                ai_row[key] = ""
                            elif isinstance(value, float) and (pd.isna(value) or str(value) == 'nan'):
                                ai_row[key] = ""
                            elif isinstance(value, (str, int, float, bool, list, dict)):
                                # These types are already JSON-serializable
                                ai_row[key] = value
                            else:
                                # Convert other types to string
                                ai_row[key] = str(value) if value is not None else ""
                        except Exception:
                            # If any error occurs, just convert to string
                            ai_row[key] = str(value) if value is not None else ""
                    
                    ai_row["_row_index"] = row_index_1_based
                    ai_row["_confidence"] = float(nr.confidence) if nr.confidence else 0.0
                    ai_row["_status"] = str(nr.status) if nr.status else "pending"
                    ai_row["_normalization_result_id"] = str(nr.id)
                    # Include AI reasoning and confidence explanation (use getattr for backward compatibility)
                    confidence_explanation = getattr(nr, 'confidence_explanation', None) or ""
                    ai_reasoning = getattr(nr, 'ai_reasoning', None) or ""
                    ai_row["confidence_explanation"] = confidence_explanation
                    ai_row["ai_reasoning"] = ai_reasoning
                    ai_row["_confidence_explanation"] = confidence_explanation
                    ai_row["_ai_reasoning"] = ai_reasoning
                    ai_generated_rows.append(ai_row)
                else:
                    # If no normalization result, use original row
                    ai_row = original_row.copy()
                    ai_row["_confidence"] = 0.0
                    ai_row["_status"] = "pending"
                    ai_row["_normalization_result_id"] = None
                    ai_generated_rows.append(ai_row)
            except Exception as e:
                print(f"Error processing row {idx}: {str(e)}")
                traceback.print_exc()
                # Continue with next row
                continue
        
        return Response({
            "jobId": str(job.id),
            "dataType": upload.preflight_report.get("dataType", "fitments") if upload.preflight_report else "fitments",
            "originalRows": original_rows,
            "aiGeneratedRows": ai_generated_rows,
            "totalRows": len(original_df),
            "errorRows": list(error_rows),
        })
    except Exception as e:
        print(f"Error building response: {str(e)}")
        traceback.print_exc()
        return Response(
            {"error": f"Error building response: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["POST"])
def approve_job_rows(request, job_id: str):
    """
    Approve selected rows from a job and load them to the database.
    """
    try:
        job = Job.objects.get(id=job_id)
    except Job.DoesNotExist:
        return Response(
            {"error": "Job not found"},
            status=status.HTTP_404_NOT_FOUND
        )
    
    if job.status != "pending":
        return Response(
            {"error": f"Job status is {job.status}, only pending jobs can be approved"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    approved_row_ids = request.data.get("approvedRowIds", [])
    if not approved_row_ids:
        return Response(
            {"error": "No rows selected for approval"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    upload = job.upload
    data_type = job.params.get("dataType", "fitments") if job.params else "fitments"
    
    # Get tenant
    tenant_obj = job.tenant if job.tenant_id else Tenant.objects.filter(slug="default").first()
    if not tenant_obj:
        return Response(
            {"error": "No tenant found"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Get normalization results for approved rows
    # Handle both UUIDs (normalization result IDs) and row indices (for rows without normalization results)
    approved_nr_ids = []
    approved_row_indices = []
    
    for rid in approved_row_ids:
        if not rid:
            continue
        rid_str = str(rid).strip()
        # Check if it's a UUID format
        try:
            approved_nr_ids.append(uuid.UUID(rid_str))
        except (ValueError, AttributeError):
            # Not a UUID, might be a row index like "ai_0" or "original_1"
            # Extract numeric part if possible
            if rid_str.startswith("ai_") or rid_str.startswith("original_"):
                try:
                    # Extract the index part
                    idx_part = rid_str.split("_")[-1]
                    row_idx = int(idx_part) + 1  # Convert to 1-based row index
                    approved_row_indices.append(row_idx)
                except:
                    pass
    
    # Get normalization results by ID
    normalization_results_list = list(NormalizationResult.objects.filter(
        id__in=approved_nr_ids,
        upload_id=upload.id
    ))
    
    # Also get normalization results by row index if any row indices were provided
    if approved_row_indices:
        nr_by_index = NormalizationResult.objects.filter(
            upload_id=upload.id,
            row_index__in=approved_row_indices
        )
        # Combine both querysets, avoiding duplicates
        all_nr_ids = set(nr.id for nr in normalization_results_list)
        for nr in nr_by_index:
            if nr.id not in all_nr_ids:
                normalization_results_list.append(nr)
    
    normalization_results = normalization_results_list
    
    # If still no results and we have row indices, try to create normalization results from original data
    if not normalization_results and approved_row_indices:
        # Read original file and create normalization results on the fly
        import pandas as pd
        try:
            if upload.file_format == "xlsx":
                df = pd.read_excel(upload.storage_url)
            else:
                delimiter = upload.preflight_report.get("delimiter", ",") if upload.preflight_report else ","
                encoding = upload.preflight_report.get("encoding", "utf-8") if upload.preflight_report else "utf-8"
                df = pd.read_csv(upload.storage_url, delimiter=delimiter, encoding=encoding)
            
            # Get AI mappings if available
            column_mappings = {}
            if job.result:
                mappings = job.result.get("columnMappings", [])
                for mapping in mappings:
                    source = mapping.get("source")
                    target = mapping.get("target")
                    if source and target:
                        column_mappings[source] = target
            
            # Create normalization results for selected rows
            for row_idx in approved_row_indices:
                if row_idx > len(df):
                    continue
                
                # Get row data
                row_data = df.iloc[row_idx - 1].to_dict()  # Convert 1-based to 0-based
                
                # Apply column mappings
                mapped_entities = {}
                for source_col, target_col in column_mappings.items():
                    if source_col in row_data and pd.notna(row_data[source_col]):
                        mapped_entities[target_col] = row_data[source_col]
                
                # Also include unmapped columns
                for col, val in row_data.items():
                    if col not in column_mappings and pd.notna(val):
                        mapped_entities[col] = val
                
                # Create normalization result
                nr = NormalizationResult.objects.create(
                    tenant_id=upload.tenant_id,
                    upload_id=upload.id,
                    row_index=row_idx,
                    mapped_entities=mapped_entities,
                    confidence=0.8,  # Default confidence for manually created
                    status="pending"
                )
                normalization_results = list(normalization_results) + [nr]
        except Exception as e:
            print(f"Error creating normalization results from original data: {str(e)}")
            import traceback
            traceback.print_exc()
    
    # Ensure normalization_results is a list
    if not isinstance(normalization_results, list):
        normalization_results = list(normalization_results) if normalization_results else []
    
    print(f"DEBUG: Found {len(normalization_results)} normalization results for approval")
    print(f"DEBUG: Approved row IDs: {approved_row_ids}")
    print(f"DEBUG: Data type: {data_type}")
    
    created_count = 0
    error_count = 0
    
    if data_type == "fitments":
        from fitments.models import Fitment
        
        for nr in normalization_results:
            try:
                mapped_entities = nr.mapped_entities or {}
                if not mapped_entities:
                    continue
                
                # Extract required fields (same logic as publish function)
                part_id = str(mapped_entities.get("partId", "")).strip()
                if not part_id:
                    part_id = str(mapped_entities.get("part_id", "")).strip()
                if not part_id:
                    part_id = str(mapped_entities.get("partNumber", "")).strip()
                if not part_id:
                    continue
                
                year_val = mapped_entities.get("year", "")
                if not year_val:
                    continue
                
                year_str = str(year_val).strip()
                if "-" in year_str:
                    try:
                        year = int(year_str.split("-")[0].strip())
                    except:
                        continue
                else:
                    try:
                        year = int(float(year_val))
                    except:
                        continue
                
                make_name = str(mapped_entities.get("makeName", "")).strip()
                if not make_name:
                    make_name = str(mapped_entities.get("make", "")).strip()
                
                model_name = str(mapped_entities.get("modelName", "")).strip()
                if not model_name:
                    model_name = str(mapped_entities.get("model", "")).strip()
                
                if not make_name or not model_name:
                    continue
                
                # Normalize make/model
                make_name = make_name.title()
                known_uppercase_makes = ["KIA", "BMW", "AUDI", "ACURA", "INFINITI", "LEXUS", "AC"]
                if make_name.upper() in known_uppercase_makes:
                    make_name = make_name.upper()
                
                model_name = model_name.title()
                if "-" in model_name:
                    parts = model_name.split("-")
                    model_name = "-".join([p.title() if p else "" for p in parts])
                
                position_val = str(mapped_entities.get("position", "")).strip() or "Front"
                position_id = int(mapped_entities.get("positionId", 1)) if mapped_entities.get("positionId") else 1
                
                source_metadata = {
                    "uploadId": str(upload.id),
                    "uploadFilename": upload.filename,
                    "normalizationResultId": str(nr.id),
                    "rowIndex": nr.row_index,
                    "approvedAt": timezone.now().isoformat(),
                    "dataType": data_type,
                    "jobId": str(job.id),
                }
                
                fitment_notes = f"Approved from upload {upload.filename} ({upload.id}), row {nr.row_index}"
                
                fitment = Fitment(
                    tenant=tenant_obj,
                    partId=part_id,
                    year=year,
                    makeName=make_name,
                    modelName=model_name,
                    subModelName=str(mapped_entities.get("submodel", "")).strip() or "",
                    driveTypeName=str(mapped_entities.get("driveType", "")).strip() or "",
                    fuelTypeName=str(mapped_entities.get("engine", "")).strip() or "",
                    bodyNumDoors=int(mapped_entities.get("bodyNumDoors", 0)) if mapped_entities.get("bodyNumDoors") else 0,
                    bodyTypeName=str(mapped_entities.get("body", "")).strip() or "",
                    ptid=str(mapped_entities.get("ptid", "")).strip() or "0",
                    partTypeDescriptor=str(mapped_entities.get("productType", "")).strip() or "",
                    uom="EA",
                    quantity=int(mapped_entities.get("quantity", 1)) if mapped_entities.get("quantity") else 1,
                    fitmentTitle=f"{year} {make_name} {model_name} - {part_id}",
                    fitmentDescription=str(mapped_entities.get("description", "")).strip() or "",
                    fitmentNotes=fitment_notes,
                    position=position_val,
                    positionId=position_id,
                    liftHeight=str(mapped_entities.get("liftHeight", "")).strip() or "",
                    wheelType=str(mapped_entities.get("wheelType", "")).strip() or "",
                    baseVehicleId=f"{year}_{make_name}_{model_name}",
                    fitmentType="manual_fitment",
                    createdBy="data_upload",
                    updatedBy="data_upload",
                    dynamicFields={
                        "sourceUpload": source_metadata,
                    },
                )
                fitment.save()
                created_count += 1
                
                # Mark normalization result as approved
                nr.status = "approved"
                nr.save()
                
            except Exception as e:
                error_count += 1
                print(f"Error creating fitment from NormalizationResult {nr.id}: {str(e)}")
                continue
    
    elif data_type == "products":
        from data_uploads.models import ProductData
        
        for nr in normalization_results:
            try:
                mapped_entities = nr.mapped_entities or {}
                if not mapped_entities:
                    continue
                
                part_id = str(mapped_entities.get("partId", "")).strip()
                if not part_id:
                    part_id = str(mapped_entities.get("part_id", "")).strip()
                if not part_id:
                    part_id = str(mapped_entities.get("partNumber", "")).strip()
                if not part_id:
                    part_id = str(mapped_entities.get("sku", "")).strip()
                if not part_id:
                    continue
                
                description = str(mapped_entities.get("description", "")).strip()
                if not description:
                    description = str(mapped_entities.get("partName", "")).strip()
                if not description:
                    description = part_id
                
                specifications = {}
                for key, value in mapped_entities.items():
                    if key not in ["partId", "part_id", "partNumber", "sku", "description", "partName", "name"]:
                        if value:
                            specifications[key] = value
                
                product = ProductData(
                    tenant=tenant_obj,
                    part_id=part_id,
                    description=description,
                    specifications=specifications,
                    source_upload_id=str(upload.id),
                    source_metadata={
                        "normalizationResultId": str(nr.id),
                        "rowIndex": nr.row_index,
                        "approvedAt": timezone.now().isoformat(),
                        "jobId": str(job.id),
                    },
                )
                product.save()
                created_count += 1
                print(f"DEBUG: Successfully created product {part_id} from NormalizationResult {nr.id}")
                
                # Mark normalization result as approved
                nr.status = "approved"
                nr.save()
                
            except Exception as e:
                error_count += 1
                print(f"Error creating product from NormalizationResult {nr.id}: {str(e)}")
                import traceback
                traceback.print_exc()
                continue
    
    # Update job status
    job.status = "published"
    job.finished_at = timezone.now()
    job.result = {
        **(job.result or {}),
        "approvedCount": created_count,
        "errorCount": error_count,
        "publishedAt": timezone.now().isoformat(),
    }
    job.save()
    
    return Response({
        "message": "Rows approved and loaded to database",
        "approvedCount": created_count,
        "errorCount": error_count,
        "jobId": str(job.id),
        "status": job.status,
    })
