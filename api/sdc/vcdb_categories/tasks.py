from celery import shared_task
from django.utils import timezone
from django.db import transaction
from .models import FitmentJob, AIFitment, VCDBCategory, VCDBData
from products.models import ProductData, ProductConfiguration
from fitments.models import Fitment
import hashlib
import json
import random
import uuid


def generate_fitment_hash(fitment_data):
    """Generate a unique hash for fitment data"""
    # Create a string representation of the fitment data including tenant
    tenant_id = str(fitment_data.get('tenant', ''))
    hash_string = f"{tenant_id}_{fitment_data.get('partId', '')}_{fitment_data.get('year', '')}_{fitment_data.get('makeName', '')}_{fitment_data.get('modelName', '')}_{fitment_data.get('subModelName', '')}"
    return hashlib.md5(hash_string.encode()).hexdigest()


@shared_task
def process_fitment_job(job_id):
    """Process a fitment job in the background"""
    try:
        job = FitmentJob.objects.get(id=job_id)
        
        # Check if job is already in progress or completed
        if job.status in ['in_progress', 'completed', 'failed']:
            print(f"Job {job_id} is already {job.status}, skipping...")
            return
        
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
    """Process manual fitments following the same pattern as apply_manual_fitment"""
    fitments_created = 0
    fitments_failed = 0
    fitments_skipped = 0
    completed_steps = 0
    duplicate_messages = []
    
    # Import AppliedFitment model for tracking
    from data_uploads.models import AppliedFitment
    
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
                            # Check if fitment already exists before creating
                            existing_fitment = Fitment.objects.filter(
                                tenant=job.tenant,
                                partId=product.part_number,
                                year=vcdb_record.year,
                                makeName=vcdb_record.make,
                                modelName=vcdb_record.model,
                                subModelName=vcdb_record.submodel,
                                isDeleted=False
                            ).first()
                            
                            if existing_fitment:
                                # Fitment already exists, count as skipped
                                fitments_skipped += 1
                                duplicate_msg = f"Fitment already exists for {product.part_number} -> {vcdb_record.year} {vcdb_record.make} {vcdb_record.model}"
                                duplicate_messages.append(duplicate_msg)
                                if len(duplicate_messages) <= 5:  # Limit warnings to first 5 duplicates
                                    print(duplicate_msg)
                            else:
                                # Create Fitment record (following apply_manual_fitment pattern)
                                fitment = Fitment.objects.create(
                                    hash=uuid.uuid4().hex,
                                    tenant=job.tenant,
                                    partId=product.part_number,
                                    itemStatus='Active',
                                    itemStatusCode=0,
                                    baseVehicleId=str(vcdb_record.id),
                                    year=vcdb_record.year,
                                    makeName=vcdb_record.make,
                                    modelName=vcdb_record.model,
                                    subModelName=vcdb_record.submodel or '',
                                    driveTypeName=vcdb_record.drive_type or '',
                                    fuelTypeName=vcdb_record.fuel_type or 'Gas',
                                    bodyNumDoors=vcdb_record.num_doors or 4,
                                    bodyTypeName=vcdb_record.body_type or 'Sedan',
                                    ptid='PT-22',  # Default part type ID
                                    partTypeDescriptor=product.part_terminology_name or 'Manual Fitment',
                                    uom='EA',  # Each
                                    quantity=1,  # Default quantity
                                    fitmentTitle=f"Manual Fitment - {product.part_number}",
                                    fitmentDescription=f"Manual fitment for {vcdb_record.make} {vcdb_record.model}",
                                    fitmentNotes='Applied via bulk processing',
                                    position='Front',  # Default position
                                    positionId=1,  # Default position ID
                                    liftHeight='Stock',  # Default value
                                    wheelType='Alloy',  # Default value
                                    fitmentType='manual_fitment',
                                    createdBy='bulk_processing',
                                    updatedBy='bulk_processing'
                                )
                                
                                # Create AppliedFitment record for tracking (following apply_manual_fitment pattern)
                                applied_fitment = AppliedFitment.objects.create(
                                    session_id=job.session_id if hasattr(job, 'session_id') else None,
                                    tenant=job.tenant,
                                    part_id=product.part_number,
                                    year=vcdb_record.year,
                                    make=vcdb_record.make,
                                    model=vcdb_record.model,
                                    submodel=vcdb_record.submodel or '',
                                    drive_type=vcdb_record.drive_type or '',
                                    fuel_type=vcdb_record.fuel_type or 'Gas',
                                    num_doors=vcdb_record.num_doors or 4,
                                    body_type=vcdb_record.body_type or 'Sedan',
                                    position='Front',  # Default position
                                    quantity=1,  # Default quantity
                                    title=f"Manual Fitment - {product.part_number}",
                                    description=f"Manual fitment for {vcdb_record.make} {vcdb_record.model}",
                                    notes='Applied via bulk processing',
                                    fitment_type='manual_fitment',
                                    created_by='bulk_processing'
                                )
                                
                                fitments_created += 1
                                print(f"✅ Created manual fitment: {product.part_number} -> {vcdb_record.year} {vcdb_record.make} {vcdb_record.model}")
                                
                        except Exception as e:
                            fitments_failed += 1
                            print(f"❌ Error creating fitment for {product.part_number}: {e}")
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
                print(f"❌ Error processing {product.part_number}: {e}")
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
    """Process AI fitments using Azure AI service"""
    from fitment_uploads.azure_ai_service import azure_ai_service
    
    fitments_created = 0
    fitments_failed = 0
    
    try:
        # Convert VCDB data to list of dictionaries for AI service
        vcdb_data_list = []
        for category in vcdb_categories:
            vcdb_records = VCDBData.objects.filter(category=category)
            for record in vcdb_records:
                vcdb_data_list.append({
                    'year': record.year,
                    'make': record.make,
                    'model': record.model,
                    'submodel': record.submodel,
                    'driveType': record.drive_type,
                    'bodyType': record.body_type,
                    'engineType': record.engine_type,
                    'transmissionType': record.transmission,
                    'fuelType': record.fuel_type,
                    'region': 'US',  # Default region since field doesn't exist in model
                    'category': str(category.id),
                    'category_name': category.name
                })
        
        # Convert product data to list of dictionaries for AI service
        products_data_list = []
        for product in product_data:
            products_data_list.append({
                'id': product.part_number,
                'description': product.part_terminology_name,
                'ptid': product.ptid,
                'parent_child': product.parent_child,
                'additional_attributes': product.additional_attributes
            })
        
        # Use Azure AI service to generate fitments
        ai_fitments = azure_ai_service.generate_fitments(vcdb_data_list, products_data_list)
        
        print(f"🤖 Azure AI generated {len(ai_fitments)} fitments")
        
        # Process each AI-generated fitment
        for fitment_data in ai_fitments:
            try:
                # Map AI response to our fitment structure
                fitment_dict = {
                    'tenant': job.tenant,
                    'partId': fitment_data.get('partId', ''),
                    'fitmentDescription': fitment_data.get('partDescription', ''),
                    'year': fitment_data.get('year', 2020),
                    'makeName': fitment_data.get('make', ''),
                    'modelName': fitment_data.get('model', ''),
                    'subModelName': fitment_data.get('submodel', ''),
                    'driveTypeName': fitment_data.get('driveType', ''),
                    'position': fitment_data.get('position', ''),
                    'quantity': fitment_data.get('quantity', 1),
                    'fitmentType': 'ai_fitment',
                    'itemStatus': 'readyToApprove',
                    'confidenceScore': fitment_data.get('confidence', 0.7),
                    'aiDescription': fitment_data.get('ai_reasoning', 'AI-generated fitment'),
                    'fitmentNotes': fitment_data.get('confidence_explanation', ''),
                    'isDeleted': False,
                    # Required fields with defaults
                    'baseVehicleId': f"{fitment_data.get('year', 2020)}_{fitment_data.get('make', '')}_{fitment_data.get('model', '')}",
                    'fuelTypeName': 'Gasoline',  # Default fuel type
                    'bodyNumDoors': 4,  # Default number of doors
                    'bodyTypeName': 'SUV',  # Default body type
                    'ptid': 'AI001',  # Default PTID for AI fitments
                    'partTypeDescriptor': fitment_data.get('partDescription', 'AI Generated Part'),
                    'uom': 'EA',  # Default unit of measure
                    'fitmentTitle': f"{fitment_data.get('partId', '')} for {fitment_data.get('year', 2020)} {fitment_data.get('make', '')} {fitment_data.get('model', '')}",
                    'positionId': hash(f"{fitment_data.get('partId', '')}_{fitment_data.get('year', 2020)}_{fitment_data.get('make', '')}_{fitment_data.get('model', '')}") % 1000000,
                    'liftHeight': 'Standard',
                    'wheelType': 'Alloy',
                    'itemStatusCode': 0,
                    'createdBy': 'ai_system',
                    'updatedBy': 'ai_system'
                }
                
                # Generate hash for uniqueness
                fitment_hash = generate_fitment_hash(fitment_dict)
                fitment_dict['hash'] = fitment_hash
                
                # Check if fitment already exists
                existing_fitment = Fitment.objects.filter(
                    tenant=job.tenant,
                    partId=fitment_dict['partId'],
                    year=fitment_dict['year'],
                    makeName=fitment_dict['makeName'],
                    modelName=fitment_dict['modelName'],
                    subModelName=fitment_dict['subModelName'],
                    isDeleted=False
                ).first()
                
                if not existing_fitment:
                    # Create new AI fitment
                    fitment = Fitment.objects.create(**fitment_dict)
                    fitments_created += 1
                    print(f"✅ Created AI fitment: {fitment_dict['partId']} -> {fitment_dict['year']} {fitment_dict['makeName']} {fitment_dict['modelName']}")
                else:
                    print(f"⏭️  Skipped existing fitment: {fitment_dict['partId']} -> {fitment_dict['year']} {fitment_dict['makeName']} {fitment_dict['modelName']}")
                
                # Update job progress
                job.completed_steps += 1
                job.progress_percentage = int((job.completed_steps / job.total_steps) * 100)
                job.current_step = f"AI processing fitment {fitments_created + fitments_failed + 1} of {len(ai_fitments)}"
                job.save()
                
            except Exception as e:
                fitments_failed += 1
                print(f"❌ Error processing AI fitment: {e}")
                continue
        
        print(f"🎯 AI Fitment processing complete: {fitments_created} created, {fitments_failed} failed")
        
    except Exception as e:
        print(f"❌ Error in AI fitment processing: {e}")
        fitments_failed += len(product_data)  # Mark all as failed if AI service fails
        job.status = 'failed'
        job.error_message = str(e)
    
    # Set final job status
    if job.status != 'failed':
        if fitments_created > 0:
            job.status = 'completed'
            job.current_step = "Completed"
        else:
            job.status = 'failed'
            job.error_message = "No fitments were created"
    
    job.fitments_created = fitments_created
    job.fitments_failed = fitments_failed
    job.save()


def should_create_fitment(product, vcdb_record, job):
    """Determine if a manual fitment should be created"""
    # Basic matching logic - can be enhanced based on business rules
    return True  # For now, create all potential fitments


# Old generate_ai_fitment function removed - now using Azure AI service directly