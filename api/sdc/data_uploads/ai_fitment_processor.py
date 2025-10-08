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

from .models import (
    AiFitmentJob,
    AiGeneratedFitment,
    ProductData,
    VCDBData,
)

logger = logging.getLogger(__name__)


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


def process_product_file_for_ai_fitments(job: AiFitmentJob) -> Tuple[bool, str]:
    """
    Process uploaded product file and generate AI fitments
    Returns: (success: bool, message: str)
    """
    try:
        if not job.product_file:
            return False, "No product file attached to job"
        
        # Parse product file
        file_path = job.product_file.path
        file_ext = file_path.lower().split('.')[-1]
        
        # Read file based on format
        if file_ext == 'json':
            with open(file_path, 'r') as f:
                product_data = json.load(f)
        elif file_ext in ['csv', 'xlsx', 'xls']:
            df = pd.read_csv(file_path) if file_ext == 'csv' else pd.read_excel(file_path)
            product_data = df.to_dict('records')
        else:
            return False, f"Unsupported file format: {file_ext}"
        
        # Store products in ProductData table (if not already there)
        products_created = 0
        product_objects = []
        
        for item in product_data:
            part_id = item.get('id') or item.get('part_id') or item.get('partId')
            if not part_id:
                continue
            
            # Check if product already exists
            product, created = ProductData.objects.get_or_create(
                part_id=part_id,
                tenant=job.tenant,
                defaults={
                    'description': item.get('description', ''),
                    'category': item.get('category', ''),
                    'part_type': item.get('part_type') or item.get('partType', ''),
                    'compatibility': item.get('compatibility', ''),
                    'brand': item.get('brand', ''),
                    'sku': item.get('sku', ''),
                    'specifications': item.get('specifications', {}),
                }
            )
            
            if created:
                products_created += 1
            
            product_objects.append(product)
        
        # Update job product count
        job.product_count = len(product_objects)
        job.save()
        
        # Generate AI fitments
        processor = AiFitmentProcessor(job)
        all_fitments = []
        
        for product in product_objects:
            fitments = processor.generate_fitments_for_product(product)
            all_fitments.extend(fitments)
        
        # Bulk create fitments
        AiGeneratedFitment.objects.bulk_create(all_fitments)
        
        # Update job fitments count
        job.fitments_count = len(all_fitments)
        job.save()
        
        logger.info(
            f"AI Job {job.id}: Created {products_created} products, "
            f"generated {len(all_fitments)} fitments"
        )
        
        return True, f"Successfully generated {len(all_fitments)} fitments from {len(product_objects)} products"
        
    except Exception as e:
        logger.error(f"Failed to process product file for AI fitments: {str(e)}", exc_info=True)
        return False, str(e)


def process_selected_products_for_ai_fitments(job: AiFitmentJob) -> Tuple[bool, str]:
    """
    Generate AI fitments for selected products from ProductData table
    Returns: (success: bool, message: str)
    """
    try:
        if not job.product_ids:
            return False, "No product IDs provided"
        
        # Get selected products
        products = ProductData.objects.filter(
            part_id__in=job.product_ids,
            tenant=job.tenant if job.tenant else Q(tenant__isnull=True)
        )
        
        if not products.exists():
            return False, "No products found with provided IDs"
        
        # Update job product count
        job.product_count = products.count()
        job.save()
        
        # Generate AI fitments
        processor = AiFitmentProcessor(job)
        all_fitments = []
        
        for product in products:
            fitments = processor.generate_fitments_for_product(product)
            all_fitments.extend(fitments)
        
        # Bulk create fitments
        AiGeneratedFitment.objects.bulk_create(all_fitments)
        
        # Update job fitments count
        job.fitments_count = len(all_fitments)
        job.save()
        
        logger.info(
            f"AI Job {job.id}: Generated {len(all_fitments)} fitments "
            f"from {products.count()} selected products"
        )
        
        return True, f"Successfully generated {len(all_fitments)} fitments from {products.count()} products"
        
    except Exception as e:
        logger.error(f"Failed to process selected products for AI fitments: {str(e)}", exc_info=True)
        return False, str(e)

