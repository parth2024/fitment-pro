#!/usr/bin/env python3
"""
Script to help migrate the database for tenant-aware unique constraints.
This script provides instructions and commands to update the database schema.
"""

import os
import sys

def print_instructions():
    print("🔧 Database Migration for Tenant-Aware Unique Constraints")
    print("="*60)
    print()
    print("The database schema needs to be updated to support tenant-aware unique constraints.")
    print("This will allow the same data to exist across different tenants.")
    print()
    print("⚠️  IMPORTANT: This migration will modify database constraints.")
    print("Make sure to backup your database before proceeding!")
    print()
    print("📋 Steps to migrate:")
    print()
    print("1. Navigate to your Django project directory:")
    print("   cd /path/to/your/django/project")
    print()
    print("2. Create and apply the migration:")
    print("   python manage.py makemigrations data_uploads")
    print("   python manage.py migrate data_uploads")
    print()
    print("3. If you encounter issues with existing data, you may need to:")
    print("   - Clear existing duplicate data first")
    print("   - Or modify the migration to handle existing data")
    print()
    print("🔍 What this migration does:")
    print("- Updates VCDBData unique constraint to include tenant field")
    print("- Updates ProductData unique constraint to include tenant field")
    print("- Allows same vehicle/product data across different tenants")
    print("- Prevents duplicates within the same tenant")
    print()
    print("📊 Expected behavior after migration:")
    print("- Same tenant, same data: Updates existing record (no duplicate)")
    print("- Different tenant, same data: Creates new record (duplicate allowed)")
    print("- Data isolation: Each tenant sees only their own data")
    print()

def check_django_setup():
    """Check if Django is properly set up"""
    try:
        import django
        from django.conf import settings
        print("✅ Django is properly configured")
        return True
    except ImportError:
        print("❌ Django is not installed or not in Python path")
        return False
    except Exception as e:
        print(f"❌ Django configuration error: {e}")
        return False

def check_migration_file():
    """Check if the migration file exists"""
    migration_file = "api/sdc/data_uploads/migrations/0002_update_unique_constraints_for_tenant.py"
    if os.path.exists(migration_file):
        print(f"✅ Migration file exists: {migration_file}")
        return True
    else:
        print(f"❌ Migration file not found: {migration_file}")
        return False

def main():
    print_instructions()
    
    print("🔍 Pre-migration checks:")
    print("-" * 30)
    
    # Check Django setup
    django_ok = check_django_setup()
    
    # Check migration file
    migration_ok = check_migration_file()
    
    print()
    if django_ok and migration_ok:
        print("✅ All checks passed! You can proceed with the migration.")
        print()
        print("🚀 Ready to migrate! Run these commands:")
        print("   python manage.py makemigrations data_uploads")
        print("   python manage.py migrate data_uploads")
    else:
        print("❌ Some checks failed. Please fix the issues before migrating.")
        print()
        print("💡 Troubleshooting:")
        if not django_ok:
            print("- Make sure Django is installed and configured")
            print("- Check your PYTHONPATH and virtual environment")
        if not migration_ok:
            print("- Make sure you're in the correct project directory")
            print("- Check that the migration file was created properly")
    
    print()
    print("📚 For more help:")
    print("- Django migrations: https://docs.djangoproject.com/en/stable/topics/migrations/")
    print("- Database constraints: https://docs.djangoproject.com/en/stable/ref/models/options/#unique-together")

if __name__ == "__main__":
    main()
