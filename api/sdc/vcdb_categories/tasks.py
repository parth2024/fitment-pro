from celery import shared_task
from django.utils import timezone
from django.db import transaction
from .models import FitmentJob, AIFitment, VCDBCategory, VCDBData
from products.models import ProductData, ProductConfiguration
from fitments.models import Fitment
import hashlib
import json
import random


def generate_fitment_hash(fitment_data):
    """Generate a unique hash for fitment data"""
    # Create a string representation of the fitment data
    hash_string = f"{fitment_data.get('partId', '')}_{fitment_data.get('year', '')}_{fitment_data.get('makeName', '')}_{fitment_data.get('modelName', '')}_{fitment_data.get('subModelName', '')}"
    return hashlib.md5(hash_string.encode()).hexdigest()


@shared_task
def process_fitment_job(job_id):
    """Process a fitment job in the background"""
    try:
        job = FitmentJob.objects.get(id=job_id)
        job.status = 'in_progress'
        job.started_at = timezone.now()
        job.save()
        
        # Get tenant configuration
        tenant = job.tenant
        
        # Get VCDB categories
        vcdb_categories = VCDBCategory.objects.filter(
            id__in=job.vcdb_categories,
            is_active=True,
            is_valid=True
        )
        
        # Get product data
        product_data = ProductData.objects.filter(tenant=tenant)
        
        if not vcdb_categories.exists():
            job.status = 'failed'
            job.error_message = 'No valid VCDB categories found'
            job.save()
            return
        
        if not product_data.exists():
            job.status = 'failed'
            job.error_message = 'No product data found'
            job.save()
            return
        
        # Calculate total steps
        total_products = product_data.count()
        total_vcdb_records = sum(cat.record_count for cat in vcdb_categories)
        job.total_steps = total_products * len(vcdb_categories)
        job.save()
        
        # Process fitments based on job type
        if job.job_type == 'manual':
            process_manual_fitments(job, vcdb_categories, product_data)
        else:  # AI fitment
            process_ai_fitments(job, vcdb_categories, product_data)
        
        # Status is already set by the processing function
        job.completed_at = timezone.now()
        job.save()
        
    except Exception as e:
        job = FitmentJob.objects.get(id=job_id)
        job.status = 'failed'
        job.error_message = str(e)
        job.completed_at = timezone.now()
        job.save()
        raise


def process_manual_fitments(job, vcdb_categories, product_data):
    """Process manual fitments"""
    fitments_created = 0
    fitments_failed = 0
    fitments_skipped = 0
    completed_steps = 0
    duplicate_messages = []
    
    for product in product_data:
        for category in vcdb_categories:
            try:
                # Get VCDB data for this category
                vcdb_data = VCDBData.objects.filter(category=category)
                
                for vcdb_record in vcdb_data:
                    completed_steps += 1
                    
                    # Create fitment based on matching criteria
                    if should_create_fitment(product, vcdb_record, job):
                        try:
                            fitment_data = create_fitment_data(product, vcdb_record, job)
                            fitment_hash = generate_fitment_hash(fitment_data)
                            fitment_data['hash'] = fitment_hash
                            fitment_data['fitmentType'] = 'manual_fitment'
                            
                            # Create fitment or get existing one
                            fitment, created = Fitment.objects.get_or_create(
                                hash=fitment_hash,
                                defaults=fitment_data
                            )
                            if created:
                                fitments_created += 1
                            else:
                                # Fitment already exists, count as skipped
                                fitments_skipped += 1
                                duplicate_msg = f"Fitment already exists for {product.part_number} -> {vcdb_record.year} {vcdb_record.make} {vcdb_record.model}"
                                duplicate_messages.append(duplicate_msg)
                                print(duplicate_msg)
                        except Exception as e:
                            fitments_failed += 1
                            print(f"Error creating fitment for {product.part_number}: {e}")
                    else:
                        # Count as failed if no fitment should be created
                        fitments_failed += 1
                    
                    # Update job progress every 10 steps to avoid too many DB writes
                    if completed_steps % 10 == 0 or completed_steps == job.total_steps:
                        job.completed_steps = completed_steps
                        job.progress_percentage = int((completed_steps / job.total_steps) * 100)
                        job.current_step = f"Processing {product.part_number} for {vcdb_record.year} {vcdb_record.make} {vcdb_record.model}"
                        job.fitments_created = fitments_created
                        job.fitments_failed = fitments_failed
                        job.save()
                        
            except Exception as e:
                fitments_failed += 1
                print(f"Error processing {product.part_number}: {e}")
                continue
    
    # Final update with proper status handling
    job.completed_steps = completed_steps
    job.progress_percentage = 100
    
    # Determine final status based on results
    if fitments_skipped > 0 and fitments_created == 0:
        # All fitments were duplicates
        job.status = 'failed'
        job.error_message = f"All {fitments_skipped} fitments already exist. No new fitments were created."
        job.fitments_created = 0
        job.fitments_failed = fitments_skipped
    elif fitments_skipped > 0:
        # Some fitments were duplicates but some were created
        job.status = 'completed_with_warnings'
        job.error_message = f"Created {fitments_created} new fitments, but {fitments_skipped} fitments already existed."
        job.fitments_created = fitments_created
        job.fitments_failed = fitments_skipped
    else:
        # Normal completion
        job.status = 'completed'
        job.fitments_created = fitments_created
        job.fitments_failed = fitments_failed
    
    job.current_step = "Completed"
    
    # Store duplicate messages for frontend display
    if duplicate_messages:
        job.result = {
            'duplicate_messages': duplicate_messages[:10],  # Limit to first 10 messages
            'total_duplicates': len(duplicate_messages)
        }
    
    job.save()


def process_ai_fitments(job, vcdb_categories, product_data):
    """Process AI fitments"""
    fitments_created = 0
    fitments_failed = 0
    
    for product in product_data:
        for category in vcdb_categories:
            try:
                # Get VCDB data for this category
                vcdb_data = VCDBData.objects.filter(category=category)
                
                for vcdb_record in vcdb_data:
                    # Use AI to determine if fitment should be created
                    ai_result = generate_ai_fitment(product, vcdb_record, job)
                    
                    if ai_result['should_create']:
                        # Create fitment data structure for AI fitment
                        fitment_data = create_fitment_data(product, vcdb_record, job)
                        fitment_hash = generate_fitment_hash(fitment_data)
                        fitment_data['hash'] = fitment_hash
                        fitment_data['fitmentType'] = 'ai_fitment'
                        fitment_data['itemStatus'] = 'readyToApprove'  # Set status for approval
                        fitment_data['aiDescription'] = ai_result['reasoning']
                        fitment_data['confidenceScore'] = ai_result['confidence_score']
                        fitment_data['dynamicFields'] = ai_result.get('dynamic_fields', {})
                        
                        # Create fitment or get existing one
                        fitment, created = Fitment.objects.get_or_create(
                            hash=fitment_hash,
                            defaults=fitment_data
                        )
                        if created:
                            fitments_created += 1
                        else:
                            print(f"AI Fitment already exists for {product.part_number} -> {vcdb_record.year} {vcdb_record.make} {vcdb_record.model}")
                        
                        # Update job progress
                        job.completed_steps += 1
                        job.progress_percentage = int((job.completed_steps / job.total_steps) * 100)
                        job.current_step = f"AI analyzing {product.part_number} for {vcdb_record.year} {vcdb_record.make} {vcdb_record.model}"
                        job.save()
                        
            except Exception as e:
                fitments_failed += 1
                print(f"Error creating AI fitment for {product.part_number}: {e}")
                continue
    
    job.fitments_created = fitments_created
    job.fitments_failed = fitments_failed
    job.save()


def should_create_fitment(product, vcdb_record, job):
    """Determine if a manual fitment should be created"""
    # Basic matching logic - can be enhanced based on business rules
    return True  # For now, create all potential fitments


def create_fitment_data(product, vcdb_record, job):
    """Create fitment data structure"""
    return {
        'tenant': job.tenant,
        'partId': product.part_number,
        'baseVehicleId': f"{vcdb_record.year}_{vcdb_record.make}_{vcdb_record.model}",
        'year': vcdb_record.year,
        'makeName': vcdb_record.make,
        'modelName': vcdb_record.model,
        'subModelName': vcdb_record.submodel,
        'driveTypeName': vcdb_record.drive_type,
        'fuelTypeName': vcdb_record.fuel_type,
        'bodyNumDoors': vcdb_record.num_doors or 0,
        'bodyTypeName': vcdb_record.body_type,
        'ptid': product.ptid,
        'partTypeDescriptor': product.part_terminology_name,
        'quantity': 1,
        'fitmentTitle': f"{product.part_number} for {vcdb_record.year} {vcdb_record.make} {vcdb_record.model}",
        'fitmentDescription': product.part_terminology_name,
        'position': 'Universal',  # Default position
        'positionId': hash(f"{product.part_number}_{vcdb_record.year}_{vcdb_record.make}_{vcdb_record.model}") % 1000000,  # Required field - numeric ID
        'itemStatus': 'Active',
    }


def generate_ai_fitment(product, vcdb_record, job):
    """Generate AI fitment analysis"""
    # This is a simplified AI simulation
    # In a real implementation, this would call an AI service
    
    # Simulate AI analysis
    confidence_score = random.uniform(0.6, 0.95)
    should_create = confidence_score > 0.7
    
    reasoning = f"AI analysis for {product.part_terminology_name} on {vcdb_record.year} {vcdb_record.make} {vcdb_record.model}. "
    reasoning += f"Based on vehicle specifications including {vcdb_record.drive_type} drive system, "
    reasoning += f"{vcdb_record.body_type} body type, and {vcdb_record.fuel_type} fuel type, "
    reasoning += f"this fitment shows {'high' if confidence_score > 0.8 else 'moderate'} compatibility."
    
    return {
        'should_create': should_create,
        'confidence_score': confidence_score,
        'reasoning': reasoning,
        'position': 'Universal',
        'dynamic_fields': {
            'ai_analysis_date': timezone.now().isoformat(),
            'compatibility_score': confidence_score,
            'recommended_quantity': 1
        }
    }