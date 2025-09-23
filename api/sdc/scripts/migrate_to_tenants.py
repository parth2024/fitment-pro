#!/usr/bin/env python3
"""
Data migration script to assign existing data to a default tenant.
This script should be run after the database migrations have been applied.

Usage:
    python manage.py shell < scripts/migrate_to_tenants.py
"""

import os
import sys
import django

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sdc.settings')
django.setup()

from django.db import transaction
from tenants.models import Tenant
from fitments.models import Fitment, FitmentUploadSession, PotentialVehicleConfiguration
from data_uploads.models import DataUploadSession, VCDBData, ProductData, AIFitmentResult, AppliedFitment
from field_config.models import FieldConfiguration, FieldConfigurationHistory
from workflow.models import Upload, Job, NormalizationResult, Lineage, Preset
from django.contrib.auth.models import User


def create_default_tenant():
    """Create a default tenant if it doesn't exist"""
    default_tenant, created = Tenant.objects.get_or_create(
        slug='default',
        defaults={
            'name': 'Default Entity',
            'description': 'Default entity for existing data migration',
            'is_active': True,
            'is_default': True,
            'contact_email': 'admin@example.com',
        }
    )
    
    if created:
        print(f"✅ Created default tenant: {default_tenant.name}")
    else:
        print(f"✅ Using existing default tenant: {default_tenant.name}")
    
    return default_tenant


def migrate_fitments(tenant):
    """Migrate fitments to the default tenant"""
    fitments_without_tenant = Fitment.objects.filter(tenant__isnull=True)
    count = fitments_without_tenant.count()
    
    if count > 0:
        fitments_without_tenant.update(tenant=tenant)
        print(f"✅ Migrated {count} fitments to tenant '{tenant.name}'")
    else:
        print("ℹ️  No fitments to migrate")


def migrate_fitment_upload_sessions(tenant):
    """Migrate fitment upload sessions to the default tenant"""
    sessions_without_tenant = FitmentUploadSession.objects.filter(tenant__isnull=True)
    count = sessions_without_tenant.count()
    
    if count > 0:
        sessions_without_tenant.update(tenant=tenant)
        print(f"✅ Migrated {count} fitment upload sessions to tenant '{tenant.name}'")
    else:
        print("ℹ️  No fitment upload sessions to migrate")


def migrate_potential_vehicle_configurations(tenant):
    """Migrate potential vehicle configurations to the default tenant"""
    configs_without_tenant = PotentialVehicleConfiguration.objects.filter(tenant__isnull=True)
    count = configs_without_tenant.count()
    
    if count > 0:
        configs_without_tenant.update(tenant=tenant)
        print(f"✅ Migrated {count} potential vehicle configurations to tenant '{tenant.name}'")
    else:
        print("ℹ️  No potential vehicle configurations to migrate")


def migrate_data_upload_sessions(tenant):
    """Migrate data upload sessions to the default tenant"""
    sessions_without_tenant = DataUploadSession.objects.filter(tenant__isnull=True)
    count = sessions_without_tenant.count()
    
    if count > 0:
        sessions_without_tenant.update(tenant=tenant)
        print(f"✅ Migrated {count} data upload sessions to tenant '{tenant.name}'")
    else:
        print("ℹ️  No data upload sessions to migrate")


def migrate_vcdb_data(tenant):
    """Migrate VCDB data to the default tenant"""
    vcdb_without_tenant = VCDBData.objects.filter(tenant__isnull=True)
    count = vcdb_without_tenant.count()
    
    if count > 0:
        vcdb_without_tenant.update(tenant=tenant)
        print(f"✅ Migrated {count} VCDB records to tenant '{tenant.name}'")
    else:
        print("ℹ️  No VCDB data to migrate")


def migrate_product_data(tenant):
    """Migrate product data to the default tenant"""
    products_without_tenant = ProductData.objects.filter(tenant__isnull=True)
    count = products_without_tenant.count()
    
    if count > 0:
        products_without_tenant.update(tenant=tenant)
        print(f"✅ Migrated {count} product records to tenant '{tenant.name}'")
    else:
        print("ℹ️  No product data to migrate")


def migrate_ai_fitment_results(tenant):
    """Migrate AI fitment results to the default tenant"""
    ai_results_without_tenant = AIFitmentResult.objects.filter(tenant__isnull=True)
    count = ai_results_without_tenant.count()
    
    if count > 0:
        ai_results_without_tenant.update(tenant=tenant)
        print(f"✅ Migrated {count} AI fitment results to tenant '{tenant.name}'")
    else:
        print("ℹ️  No AI fitment results to migrate")


def migrate_applied_fitments(tenant):
    """Migrate applied fitments to the default tenant"""
    applied_without_tenant = AppliedFitment.objects.filter(tenant__isnull=True)
    count = applied_without_tenant.count()
    
    if count > 0:
        applied_without_tenant.update(tenant=tenant)
        print(f"✅ Migrated {count} applied fitments to tenant '{tenant.name}'")
    else:
        print("ℹ️  No applied fitments to migrate")


def migrate_field_configurations(tenant):
    """Migrate field configurations to the default tenant"""
    configs_without_tenant = FieldConfiguration.objects.filter(tenant__isnull=True)
    count = configs_without_tenant.count()
    
    if count > 0:
        configs_without_tenant.update(tenant=tenant)
        print(f"✅ Migrated {count} field configurations to tenant '{tenant.name}'")
    else:
        print("ℹ️  No field configurations to migrate")


def migrate_field_configuration_history(tenant):
    """Migrate field configuration history to the default tenant"""
    history_without_tenant = FieldConfigurationHistory.objects.filter(tenant__isnull=True)
    count = history_without_tenant.count()
    
    if count > 0:
        history_without_tenant.update(tenant=tenant)
        print(f"✅ Migrated {count} field configuration history records to tenant '{tenant.name}'")
    else:
        print("ℹ️  No field configuration history to migrate")


def create_default_user_profile(tenant):
    """Create a default user profile for admin users without profiles"""
    admin_users = User.objects.filter(is_superuser=True)
    
    for user in admin_users:
        from tenants.models import UserProfile
        profile, created = UserProfile.objects.get_or_create(
            user=user,
            defaults={
                'tenant': tenant,
                'display_name': user.get_full_name() or user.username,
                'is_active': True,
            }
        )
        
        if created:
            print(f"✅ Created user profile for admin: {user.username}")
        else:
            print(f"ℹ️  User profile already exists for admin: {user.username}")


def main():
    """Main migration function"""
    print("🚀 Starting tenant migration...")
    print("=" * 50)
    
    try:
        with transaction.atomic():
            # Create default tenant
            default_tenant = create_default_tenant()
            
            # Migrate all data to the default tenant
            migrate_fitments(default_tenant)
            migrate_fitment_upload_sessions(default_tenant)
            migrate_potential_vehicle_configurations(default_tenant)
            migrate_data_upload_sessions(default_tenant)
            migrate_vcdb_data(default_tenant)
            migrate_product_data(default_tenant)
            migrate_ai_fitment_results(default_tenant)
            migrate_applied_fitments(default_tenant)
            migrate_field_configurations(default_tenant)
            migrate_field_configuration_history(default_tenant)
            
            # Create user profiles for admin users
            create_default_user_profile(default_tenant)
            
            print("=" * 50)
            print("✅ Migration completed successfully!")
            print(f"📊 All existing data has been assigned to tenant: '{default_tenant.name}'")
            
            # Show summary
            print("\n📈 Migration Summary:")
            print(f"  - Tenant: {default_tenant.name} (ID: {default_tenant.id})")
            print(f"  - Fitments: {Fitment.objects.filter(tenant=default_tenant).count()}")
            print(f"  - Data Upload Sessions: {DataUploadSession.objects.filter(tenant=default_tenant).count()}")
            print(f"  - VCDB Records: {VCDBData.objects.filter(tenant=default_tenant).count()}")
            print(f"  - Product Records: {ProductData.objects.filter(tenant=default_tenant).count()}")
            print(f"  - Field Configurations: {FieldConfiguration.objects.filter(tenant=default_tenant).count()}")
            
    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        raise


if __name__ == "__main__":
    main()
