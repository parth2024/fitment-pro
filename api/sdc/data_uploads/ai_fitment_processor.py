"""
AI Fitment Processor

This module handles the AI-based generation of fitments for products.
It matches products from ProductData with vehicles from VCDBData using AI/ML algorithms.
"""

import logging
import json
import pandas as pd
from typing import Tuple, List, Dict, Any
from django.utils import timezone
from django.db.models import Q
from django.core.exceptions import ValidationError

from .models import (
    AiFitmentJob,
    AiGeneratedFitment,
    ProductData,
    VCDBData,
)
from .utils import FileParser, ProductValidator

logger = logging.getLogger(__name__)


def get_vcdb_data_for_tenant(tenant):
    """
    Get VCDB data for the tenant, prioritizing global categories if configured
    """
    try:
        vcdb_data = []
        
        # Check if tenant has selected VCDB categories
        if tenant and hasattr(tenant, 'fitment_settings'):
            selected_categories = tenant.fitment_settings.get('vcdb_categories', [])
            if selected_categories:
                # Use global VCDB data filtered by selected categories
                from vcdb_categories.models import VCDBData as GlobalVCDBData
                vcdb_records = GlobalVCDBData.objects.filter(
                    category_id__in=selected_categories
                )[:100]  # Limit for AI processing
                
                # Convert to list of dictionaries for AI processing
                for record in vcdb_records:
                    vcdb_dict = {
                        'year': record.year,
                        'make': record.make,
                        'model': record.model,
                        'submodel': record.submodel or '',
                        'driveType': record.drive_type or '',
                        'fuelType': record.fuel_type or 'Gas',
                        'numDoors': record.num_doors or 4,
                        'bodyType': record.body_type or 'Sedan',
                        'engine': getattr(record, 'engine_type', '') or '',
                        'transmission': getattr(record, 'transmission', '') or '',
                        'trim': getattr(record, 'trim_level', '') or ''
                    }
                    vcdb_data.append(vcdb_dict)
                
                return vcdb_data
        
        # Fallback: Use tenant-specific VCDB data
        from .models import VCDBData as TenantVCDBData
        vcdb_records = TenantVCDBData.objects.filter(tenant=tenant)[:100]
        
        # Convert to list of dictionaries for AI processing
        for record in vcdb_records:
            vcdb_dict = {
                'year': record.year,
                'make': record.make,
                'model': record.model,
                'submodel': record.submodel or '',
                'driveType': record.drive_type or '',
                'fuelType': record.fuel_type or 'Gas',
                'numDoors': record.num_doors or 4,
                'bodyType': record.body_type or 'Sedan',
                'engine': getattr(record, 'engine', '') or '',
                'transmission': getattr(record, 'transmission', '') or '',
                'trim': getattr(record, 'trim', '') or ''
            }
            vcdb_data.append(vcdb_dict)
        
        return vcdb_data
        
    except Exception as e:
        logger.error(f"Failed to get VCDB data for tenant: {str(e)}", exc_info=True)
        return []


class AiFitmentProcessor:
    """Processes products and generates AI-based fitment recommendations"""
    
    def __init__(self, job: AiFitmentJob):
        self.job = job
        self.tenant = job.tenant
    
    def generate_fitments_for_product(self, product: ProductData) -> List[AiGeneratedFitment]:
        """
        Generate fitment recommendations for a single product
        using AI matching with VCDB data
        """
        fitments = []
        
        # Get relevant VCDB data for the tenant
        vcdb_query = VCDBData.objects.filter(tenant=self.tenant) if self.tenant else VCDBData.objects.all()
        
        # AI Logic: Match based on product specifications
        # This is a simplified version - can be enhanced with actual AI/ML models
        
        # Extract product specs
        product_specs = product.specifications or {}
        part_type = product.part_type or product.category or ''
        
        # Determine vehicle matching criteria based on product type
        vehicle_filters = self._determine_vehicle_filters(part_type, product_specs)
        
        # Apply filters
        if vehicle_filters:
            vcdb_query = vcdb_query.filter(**vehicle_filters)
        
        # Limit to reasonable number of vehicles (e.g., 50 max per product)
        vehicles = vcdb_query[:50]
        
        # Generate fitment for each matching vehicle
        for vehicle in vehicles:
            confidence = self._calculate_confidence(product, vehicle)
            
            # Only create fitments with confidence > 0.5
            if confidence > 0.5:
                fitment = AiGeneratedFitment(
                    job=self.job,
                    part_id=product.part_id,
                    part_description=product.description,
                    year=vehicle.year,
                    make=vehicle.make,
                    model=vehicle.model,
                    submodel=vehicle.submodel,
                    drive_type=vehicle.drive_type,
                    fuel_type=vehicle.fuel_type,
                    num_doors=vehicle.num_doors,
                    body_type=vehicle.body_type,
                    position=self._determine_position(product),
                    quantity=1,
                    confidence=confidence,
                    confidence_explanation=self._generate_confidence_explanation(
                        confidence, product, vehicle
                    ),
                    ai_reasoning=self._generate_reasoning(product, vehicle),
                    status='pending'
                )
                fitments.append(fitment)
        
        return fitments
    
    def _determine_vehicle_filters(self, part_type: str, specs: Dict) -> Dict:
        """Determine vehicle filters based on product type and specifications"""
        filters = {}
        
        part_type_lower = part_type.lower()
        
        # Example logic - can be enhanced
        if 'wheel' in part_type_lower or 'tire' in part_type_lower:
            # Wheels/tires might have year restrictions
            if 'min_year' in specs:
                filters['year__gte'] = specs['min_year']
            if 'max_year' in specs:
                filters['year__lte'] = specs['max_year']
        
        if 'suspension' in part_type_lower:
            # Suspension parts might be drive-type specific
            if 'drive_types' in specs and specs['drive_types']:
                filters['drive_type__in'] = specs['drive_types']
        
        return filters
    
    def _calculate_confidence(self, product: ProductData, vehicle: VCDBData) -> float:
        """
        Calculate AI confidence score for product-vehicle fitment
        Returns value between 0.0 and 1.0
        """
        confidence = 0.5  # Base confidence
        
        # Factor 1: Product specifications match
        specs = product.specifications or {}
        
        # Check year compatibility
        if 'min_year' in specs and 'max_year' in specs:
            if specs['min_year'] <= vehicle.year <= specs['max_year']:
                confidence += 0.2
        
        # Check compatibility field
        if product.compatibility:
            comp_lower = product.compatibility.lower()
            make_lower = vehicle.make.lower()
            model_lower = vehicle.model.lower()
            
            if make_lower in comp_lower:
                confidence += 0.15
            if model_lower in comp_lower:
                confidence += 0.15
        
        # Cap at 1.0
        return min(confidence, 1.0)
    
    def _determine_position(self, product: ProductData) -> str:
        """Determine installation position based on product"""
        part_type = (product.part_type or product.category or '').lower()
        
        if 'front' in part_type:
            return 'Front'
        elif 'rear' in part_type:
            return 'Rear'
        elif 'wheel' in part_type or 'tire' in part_type:
            return 'All'
        else:
            return 'Front'  # Default
    
    def _generate_confidence_explanation(
        self, 
        confidence: float, 
        product: ProductData, 
        vehicle: VCDBData
    ) -> str:
        """Generate human-readable explanation for confidence score"""
        if confidence >= 0.8:
            return f"High confidence match. Product specifications align well with {vehicle.year} {vehicle.make} {vehicle.model}."
        elif confidence >= 0.6:
            return f"Moderate confidence. Some specifications match {vehicle.year} {vehicle.make} {vehicle.model}."
        else:
            return f"Low confidence. Limited specification overlap with {vehicle.year} {vehicle.make} {vehicle.model}."
    
    def _generate_reasoning(self, product: ProductData, vehicle: VCDBData) -> str:
        """Generate AI reasoning for the fitment recommendation"""
        reasons = []
        
        specs = product.specifications or {}
        
        # Year compatibility
        if 'min_year' in specs and 'max_year' in specs:
            if specs['min_year'] <= vehicle.year <= specs['max_year']:
                reasons.append(f"Product supports model years {specs['min_year']}-{specs['max_year']}")
        
        # Compatibility mentions
        if product.compatibility:
            if vehicle.make.lower() in product.compatibility.lower():
                reasons.append(f"Product explicitly compatible with {vehicle.make}")
        
        # Part type analysis
        if product.part_type:
            reasons.append(f"Part type: {product.part_type}")
        
        if not reasons:
            reasons.append("General compatibility based on product category")
        
        return "; ".join(reasons)


def validate_product_file(job: AiFitmentJob) -> Tuple[bool, str, pd.DataFrame]:
    """
    Step 1: Validate the uploaded product file
    Returns: (success: bool, message: str, dataframe: pd.DataFrame)
    """
    try:
        if not job.product_file:
            return False, "No product file attached to job", None
        
        # Parse product file using FileParser
        file_path = job.product_file.path
        filename = job.product_file_name or job.product_file.name
        
        logger.info(f"Parsing product file: {filename}")
        
        try:
            df = FileParser.parse_file(file_path, filename)
        except ValidationError as e:
            return False, f"File parsing error: {str(e)}", None
        
        # Validate product data structure
        logger.info(f"Validating product data structure")
        is_valid, errors = ProductValidator.validate_data(df)
        
        if not is_valid:
            error_message = "Product file validation failed:\n" + "\n".join(errors)
            return False, error_message, None
        
        logger.info(f"Product file validated successfully: {len(df)} products")
        return True, f"File validated: {len(df)} products found", df
        
    except Exception as e:
        logger.error(f"Unexpected error validating product file: {str(e)}", exc_info=True)
        return False, f"Validation error: {str(e)}", None


def check_and_create_products(job: AiFitmentJob, df: pd.DataFrame) -> Tuple[bool, str, List[ProductData]]:
    """
    Step 2: Check if products exist in database, create if not
    Returns: (success: bool, message: str, product_objects: List[ProductData])
    """
    try:
        products_created = 0
        products_existing = 0
        product_objects = []
        
        logger.info(f"Checking/creating products in database for job {job.id}")
        
        # Normalize column names to lowercase for flexible matching
        df.columns = df.columns.str.lower()
        
        for index, row in df.iterrows():
            # Get part_id from various possible column names
            part_id = (
                row.get('id') or 
                row.get('part_id') or 
                row.get('partid') or 
                row.get('partnumber')
            )
            
            if not part_id or pd.isna(part_id):
                logger.warning(f"Skipping row {index + 1}: No part_id found")
                continue
            
            part_id = str(part_id).strip()
            
            # Check if product already exists for this tenant
            product, created = ProductData.objects.get_or_create(
                part_id=part_id,
                tenant=job.tenant,
                defaults={
                    'description': str(row.get('description', '')),
                    'category': str(row.get('category', '')),
                    'part_type': str(row.get('part_type') or row.get('parttype', '')),
                    'compatibility': str(row.get('compatibility', '')),
                    'brand': str(row.get('brand', '')),
                    'sku': str(row.get('sku', '')),
                    'specifications': row.get('specifications', {}) if isinstance(row.get('specifications'), dict) else {},
                    'source_file_name': job.product_file_name,
                    'session': None,  # This is from AI job, not a session
                }
            )
            
            if created:
                products_created += 1
            else:
                products_existing += 1
            
            product_objects.append(product)
        
        # Update job product count
        job.product_count = len(product_objects)
        job.save()
        
        message = (
            f"Products processed: {len(product_objects)} total "
            f"({products_created} new, {products_existing} existing)"
        )
        
        logger.info(f"Job {job.id}: {message}")
        return True, message, product_objects
        
    except Exception as e:
        logger.error(f"Failed to check/create products: {str(e)}", exc_info=True)
        return False, f"Database error: {str(e)}", []


def process_product_file_for_ai_fitments(job: AiFitmentJob) -> Tuple[bool, str]:
    """
    Process uploaded product file and generate AI fitments
    Complete workflow:
    1. Validate file
    2. Check/create products in DB
    3. Get VCDB data based on tenant's configured categories
    4. Send to Azure AI for fitment generation
    5. Store fitments with status 'pending' (ready_to_approve)
    
    Returns: (success: bool, message: str)
    """
    try:
        # Step 1: Validate file
        logger.info(f"Step 1: Validating product file for job {job.id}")
        is_valid, message, df = validate_product_file(job)
        if not is_valid:
            job.error_message = message
            job.save()
            return False, message
        
        # Step 2: Check/create products in database
        logger.info(f"Step 2: Checking/creating products in database for job {job.id}")
        success, message, product_objects = check_and_create_products(job, df)
        if not success:
            job.error_message = message
            job.save()
            return False, message
        
        if not product_objects:
            return False, "No valid products found in file"
        
        # Step 3: Get VCDB data based on tenant's configured categories
        logger.info(f"Step 3: Fetching VCDB data for job {job.id}")
        vcdb_data = get_vcdb_data_for_tenant(job.tenant)
        if not vcdb_data:
            error_msg = "No VCDB data available. Please ensure VCDB categories are configured for your tenant."
            job.error_message = error_msg
            job.save()
            return False, error_msg
        
        logger.info(f"Found {len(vcdb_data)} VCDB records for AI processing")
        
        # Step 4: Convert products to format expected by Azure AI
        logger.info(f"Step 4: Preparing data for Azure AI")
        products_data = []
        for product in product_objects:
            product_dict = {
                'id': str(product.id),
                'part_id': product.part_id,
                'description': product.description,
                'category': product.category,
                'part_type': product.part_type,
                'brand': product.brand,
                'sku': product.sku,
                'specifications': product.specifications or {}
            }
            products_data.append(product_dict)
        
        # Step 5: Send to Azure AI for fitment generation
        logger.info(f"Step 5: Generating fitments using Azure AI")
        from fitment_uploads.azure_ai_service import azure_ai_service
        ai_fitments = azure_ai_service.generate_fitments(vcdb_data, products_data)
        
        logger.info(f"Azure AI returned {len(ai_fitments)} fitments")
        
        # Step 6: Store fitments directly in Fitment table with status 'ReadyToApprove'
        logger.info(f"Step 6: Storing AI-generated fitments in Fitment table")
        from fitments.models import Fitment
        import uuid
        
        generated_fitments = []
        for fitment_data in ai_fitments:
            fitment = Fitment(
                tenant=job.tenant,
                ai_job_id=job.id,  # Link to AI job
                hash=f"{fitment_data.get('partId', 'PART')}_{fitment_data.get('year', 2020)}_{fitment_data.get('make', 'MAKE')}_{fitment_data.get('model', 'MODEL')}_{uuid.uuid4().hex[:8]}",
                partId=fitment_data.get('partId', ''),
                itemStatus='ReadyToApprove',  # Ready for review
                itemStatusCode=0,
                baseVehicleId=f"BV_{fitment_data.get('year', 2020)}_{fitment_data.get('make', '')}_{fitment_data.get('model', '')}",
                year=fitment_data.get('year', 2020),
                makeName=fitment_data.get('make', ''),
                modelName=fitment_data.get('model', ''),
                subModelName=fitment_data.get('submodel', ''),
                driveTypeName=fitment_data.get('driveType', ''),
                fuelTypeName=fitment_data.get('fuelType', 'Gas'),
                bodyNumDoors=fitment_data.get('numDoors', 4),
                bodyTypeName=fitment_data.get('bodyType', 'Sedan'),
                ptid=fitment_data.get('partId', ''),
                partTypeDescriptor=fitment_data.get('partDescription', ''),
                uom='EA',
                quantity=fitment_data.get('quantity', 1),
                fitmentTitle=f"AI Fitment - {fitment_data.get('partId', '')}",
                fitmentDescription=fitment_data.get('partDescription', ''),
                fitmentNotes=fitment_data.get('ai_reasoning', 'AI-generated fitment'),
                position=fitment_data.get('position', 'Front'),
                positionId=0,
                liftHeight='',
                wheelType='',
                fitmentType='ai_fitment',
                confidenceScore=fitment_data.get('confidence', 0.7),
                aiDescription=fitment_data.get('confidence_explanation', ''),
                dynamicFields={},
                createdBy='AI System',
                updatedBy='AI System'
            )
            generated_fitments.append(fitment)
        
        # Bulk create fitments in Fitment table
        if generated_fitments:
            Fitment.objects.bulk_create(generated_fitments)
        
        # Update job fitments count and status
        job.fitments_count = len(generated_fitments)
        job.status = 'review_required'  # Ready for review
        job.completed_at = timezone.now()
        job.save()
        
        success_message = (
            f"Successfully generated {len(generated_fitments)} fitments from "
            f"{len(product_objects)} products using Azure AI"
        )
        
        logger.info(f"Job {job.id} completed: {success_message}")
        return True, success_message
        
    except Exception as e:
        error_msg = f"Failed to process product file: {str(e)}"
        logger.error(error_msg, exc_info=True)
        job.error_message = error_msg
        job.save()
        return False, error_msg


def process_selected_products_for_ai_fitments(job: AiFitmentJob) -> Tuple[bool, str]:
    """
    Generate AI fitments for selected products from ProductData table using Azure AI
    Returns: (success: bool, message: str)
    """
    try:
        if not job.product_ids:
            return False, "No product IDs provided"
        
        # Get selected products by database ID
        products = ProductData.objects.filter(
            id__in=job.product_ids,
            tenant=job.tenant if job.tenant else Q(tenant__isnull=True)
        )
        
        if not products.exists():
            return False, "No products found with provided IDs"
        
        # Update job product count
        job.product_count = products.count()
        job.save()
        
        # Get VCDB data for the tenant
        vcdb_data = get_vcdb_data_for_tenant(job.tenant)
        if not vcdb_data:
            return False, "No VCDB data available for AI processing"
        
        # Convert products to format expected by Azure AI
        products_data = []
        for product in products:
            product_dict = {
                'id': str(product.id),
                'part_id': product.part_id,
                'description': product.description,
                'category': product.category,
                'part_type': product.part_type,
                'brand': product.brand,
                'sku': product.sku,
                'specifications': product.specifications or {}
            }
            products_data.append(product_dict)
        
        # Use Azure AI service to generate fitments
        from fitment_uploads.azure_ai_service import azure_ai_service
        ai_fitments = azure_ai_service.generate_fitments(vcdb_data, products_data)
        
        # Convert AI fitments to Fitment objects (create directly in Fitment table)
        from fitments.models import Fitment
        import uuid
        
        generated_fitments = []
        for fitment_data in ai_fitments:
            fitment = Fitment(
                tenant=job.tenant,
                ai_job_id=job.id,  # Link to AI job
                hash=f"{fitment_data.get('partId', 'PART')}_{fitment_data.get('year', 2020)}_{fitment_data.get('make', 'MAKE')}_{fitment_data.get('model', 'MODEL')}_{uuid.uuid4().hex[:8]}",
                partId=fitment_data.get('partId', ''),
                itemStatus='ReadyToApprove',  # Ready for review
                itemStatusCode=0,
                baseVehicleId=f"BV_{fitment_data.get('year', 2020)}_{fitment_data.get('make', '')}_{fitment_data.get('model', '')}",
                year=fitment_data.get('year', 2020),
                makeName=fitment_data.get('make', ''),
                modelName=fitment_data.get('model', ''),
                subModelName=fitment_data.get('submodel', ''),
                driveTypeName=fitment_data.get('driveType', ''),
                fuelTypeName=fitment_data.get('fuelType', 'Gas'),
                bodyNumDoors=fitment_data.get('numDoors', 4),
                bodyTypeName=fitment_data.get('bodyType', 'Sedan'),
                ptid=fitment_data.get('partId', ''),
                partTypeDescriptor=fitment_data.get('partDescription', ''),
                uom='EA',
                quantity=fitment_data.get('quantity', 1),
                fitmentTitle=f"AI Fitment - {fitment_data.get('partId', '')}",
                fitmentDescription=fitment_data.get('partDescription', ''),
                fitmentNotes=fitment_data.get('ai_reasoning', 'AI-generated fitment'),
                position=fitment_data.get('position', 'Front'),
                positionId=0,
                liftHeight='',
                wheelType='',
                fitmentType='ai_fitment',
                confidenceScore=fitment_data.get('confidence', 0.7),
                aiDescription=fitment_data.get('confidence_explanation', ''),
                dynamicFields={},
                createdBy='AI System',
                updatedBy='AI System'
            )
            generated_fitments.append(fitment)
        
        # Bulk create fitments in Fitment table
        if generated_fitments:
            Fitment.objects.bulk_create(generated_fitments)
        
        # Update job fitments count and status
        job.fitments_count = len(generated_fitments)
        job.status = 'review_required'  # Ready for review
        job.save()
        
        logger.info(
            f"AI Job {job.id}: Generated {len(generated_fitments)} fitments "
            f"from {products.count()} selected products using Azure AI"
        )
        
        return True, f"Successfully generated {len(generated_fitments)} fitments from {products.count()} products using Azure AI"
        
    except Exception as e:
        logger.error(f"Failed to process selected products for AI fitments: {str(e)}", exc_info=True)
        return False, str(e)

