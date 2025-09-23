from django.core.management.base import BaseCommand
from django.db import transaction
from tenants.models import Tenant
from fitments.models import Fitment, FitmentUploadSession, PotentialVehicleConfiguration
from data_uploads.models import DataUploadSession, VCDBData, ProductData, AIFitmentResult, AppliedFitment
from field_config.models import FieldConfiguration, FieldConfigurationHistory
from workflow.models import Upload, Job, NormalizationResult, Lineage, Preset
from django.contrib.auth.models import User


class Command(BaseCommand):
    help = 'Migrate existing data to a default tenant'

    def add_arguments(self, parser):
        parser.add_argument(
            '--tenant-name',
            type=str,
            default='Default Entity',
            help='Name for the default tenant (default: "Default Entity")'
        )
        parser.add_argument(
            '--tenant-slug',
            type=str,
            default='default',
            help='Slug for the default tenant (default: "default")'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be migrated without making changes'
        )

    def handle(self, *args, **options):
        tenant_name = options['tenant_name']
        tenant_slug = options['tenant_slug']
        dry_run = options['dry_run']

        self.stdout.write(
            self.style.SUCCESS(f'🚀 Starting tenant migration{" (DRY RUN)" if dry_run else ""}...')
        )
        self.stdout.write('=' * 50)

        try:
            if dry_run:
                self.dry_run_migration(tenant_name, tenant_slug)
            else:
                with transaction.atomic():
                    self.perform_migration(tenant_name, tenant_slug)
                    
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Migration failed: {str(e)}')
            )
            raise

    def dry_run_migration(self, tenant_name, tenant_slug):
        """Show what would be migrated without making changes"""
        self.stdout.write(f'📊 Dry run - would create tenant: "{tenant_name}" (slug: {tenant_slug})')
        self.stdout.write('')
        
        # Count records that would be migrated
        counts = {
            'Fitments': Fitment.objects.filter(tenant__isnull=True).count(),
            'Fitment Upload Sessions': FitmentUploadSession.objects.filter(tenant__isnull=True).count(),
            'Potential Vehicle Configurations': PotentialVehicleConfiguration.objects.filter(tenant__isnull=True).count(),
            'Data Upload Sessions': DataUploadSession.objects.filter(tenant__isnull=True).count(),
            'VCDB Records': VCDBData.objects.filter(tenant__isnull=True).count(),
            'Product Records': ProductData.objects.filter(tenant__isnull=True).count(),
            'AI Fitment Results': AIFitmentResult.objects.filter(tenant__isnull=True).count(),
            'Applied Fitments': AppliedFitment.objects.filter(tenant__isnull=True).count(),
            'Field Configurations': FieldConfiguration.objects.filter(tenant__isnull=True).count(),
            'Field Configuration History': FieldConfigurationHistory.objects.filter(tenant__isnull=True).count(),
        }
        
        self.stdout.write('📈 Records that would be migrated:')
        for model_name, count in counts.items():
            if count > 0:
                self.stdout.write(f'  - {model_name}: {count}')
            else:
                self.stdout.write(f'  - {model_name}: 0 (no migration needed)')
        
        # Count admin users without profiles
        admin_users = User.objects.filter(is_superuser=True)
        users_without_profiles = 0
        for user in admin_users:
            try:
                user.profile
            except:
                users_without_profiles += 1
        
        if users_without_profiles > 0:
            self.stdout.write(f'  - Admin User Profiles: {users_without_profiles} would be created')
        else:
            self.stdout.write('  - Admin User Profiles: 0 (all users already have profiles)')

    def perform_migration(self, tenant_name, tenant_slug):
        """Perform the actual migration"""
        # Create default tenant
        default_tenant = self.create_default_tenant(tenant_name, tenant_slug)
        
        # Migrate all data to the default tenant
        self.migrate_fitments(default_tenant)
        self.migrate_fitment_upload_sessions(default_tenant)
        self.migrate_potential_vehicle_configurations(default_tenant)
        self.migrate_data_upload_sessions(default_tenant)
        self.migrate_vcdb_data(default_tenant)
        self.migrate_product_data(default_tenant)
        self.migrate_ai_fitment_results(default_tenant)
        self.migrate_applied_fitments(default_tenant)
        self.migrate_field_configurations(default_tenant)
        self.migrate_field_configuration_history(default_tenant)
        
        # Create user profiles for admin users
        self.create_default_user_profile(default_tenant)
        
        self.stdout.write('=' * 50)
        self.stdout.write(
            self.style.SUCCESS('✅ Migration completed successfully!')
        )
        self.stdout.write(f'📊 All existing data has been assigned to tenant: "{default_tenant.name}"')
        
        # Show summary
        self.stdout.write('\n📈 Migration Summary:')
        self.stdout.write(f'  - Tenant: {default_tenant.name} (ID: {default_tenant.id})')
        self.stdout.write(f'  - Fitments: {Fitment.objects.filter(tenant=default_tenant).count()}')
        self.stdout.write(f'  - Data Upload Sessions: {DataUploadSession.objects.filter(tenant=default_tenant).count()}')
        self.stdout.write(f'  - VCDB Records: {VCDBData.objects.filter(tenant=default_tenant).count()}')
        self.stdout.write(f'  - Product Records: {ProductData.objects.filter(tenant=default_tenant).count()}')
        self.stdout.write(f'  - Field Configurations: {FieldConfiguration.objects.filter(tenant=default_tenant).count()}')

    def create_default_tenant(self, tenant_name, tenant_slug):
        """Create a default tenant if it doesn't exist"""
        default_tenant, created = Tenant.objects.get_or_create(
            slug=tenant_slug,
            defaults={
                'name': tenant_name,
                'description': 'Default entity for existing data migration',
                'is_active': True,
                'is_default': True,
                'contact_email': 'admin@example.com',
            }
        )
        
        if created:
            self.stdout.write(
                self.style.SUCCESS(f'✅ Created default tenant: {default_tenant.name}')
            )
        else:
            self.stdout.write(f'✅ Using existing default tenant: {default_tenant.name}')
        
        return default_tenant

    def migrate_fitments(self, tenant):
        """Migrate fitments to the default tenant"""
        fitments_without_tenant = Fitment.objects.filter(tenant__isnull=True)
        count = fitments_without_tenant.count()
        
        if count > 0:
            fitments_without_tenant.update(tenant=tenant)
            self.stdout.write(f'✅ Migrated {count} fitments to tenant "{tenant.name}"')
        else:
            self.stdout.write('ℹ️  No fitments to migrate')

    def migrate_fitment_upload_sessions(self, tenant):
        """Migrate fitment upload sessions to the default tenant"""
        sessions_without_tenant = FitmentUploadSession.objects.filter(tenant__isnull=True)
        count = sessions_without_tenant.count()
        
        if count > 0:
            sessions_without_tenant.update(tenant=tenant)
            self.stdout.write(f'✅ Migrated {count} fitment upload sessions to tenant "{tenant.name}"')
        else:
            self.stdout.write('ℹ️  No fitment upload sessions to migrate')

    def migrate_potential_vehicle_configurations(self, tenant):
        """Migrate potential vehicle configurations to the default tenant"""
        configs_without_tenant = PotentialVehicleConfiguration.objects.filter(tenant__isnull=True)
        count = configs_without_tenant.count()
        
        if count > 0:
            configs_without_tenant.update(tenant=tenant)
            self.stdout.write(f'✅ Migrated {count} potential vehicle configurations to tenant "{tenant.name}"')
        else:
            self.stdout.write('ℹ️  No potential vehicle configurations to migrate')

    def migrate_data_upload_sessions(self, tenant):
        """Migrate data upload sessions to the default tenant"""
        sessions_without_tenant = DataUploadSession.objects.filter(tenant__isnull=True)
        count = sessions_without_tenant.count()
        
        if count > 0:
            sessions_without_tenant.update(tenant=tenant)
            self.stdout.write(f'✅ Migrated {count} data upload sessions to tenant "{tenant.name}"')
        else:
            self.stdout.write('ℹ️  No data upload sessions to migrate')

    def migrate_vcdb_data(self, tenant):
        """Migrate VCDB data to the default tenant"""
        vcdb_without_tenant = VCDBData.objects.filter(tenant__isnull=True)
        count = vcdb_without_tenant.count()
        
        if count > 0:
            vcdb_without_tenant.update(tenant=tenant)
            self.stdout.write(f'✅ Migrated {count} VCDB records to tenant "{tenant.name}"')
        else:
            self.stdout.write('ℹ️  No VCDB data to migrate')

    def migrate_product_data(self, tenant):
        """Migrate product data to the default tenant"""
        products_without_tenant = ProductData.objects.filter(tenant__isnull=True)
        count = products_without_tenant.count()
        
        if count > 0:
            products_without_tenant.update(tenant=tenant)
            self.stdout.write(f'✅ Migrated {count} product records to tenant "{tenant.name}"')
        else:
            self.stdout.write('ℹ️  No product data to migrate')

    def migrate_ai_fitment_results(self, tenant):
        """Migrate AI fitment results to the default tenant"""
        ai_results_without_tenant = AIFitmentResult.objects.filter(tenant__isnull=True)
        count = ai_results_without_tenant.count()
        
        if count > 0:
            ai_results_without_tenant.update(tenant=tenant)
            self.stdout.write(f'✅ Migrated {count} AI fitment results to tenant "{tenant.name}"')
        else:
            self.stdout.write('ℹ️  No AI fitment results to migrate')

    def migrate_applied_fitments(self, tenant):
        """Migrate applied fitments to the default tenant"""
        applied_without_tenant = AppliedFitment.objects.filter(tenant__isnull=True)
        count = applied_without_tenant.count()
        
        if count > 0:
            applied_without_tenant.update(tenant=tenant)
            self.stdout.write(f'✅ Migrated {count} applied fitments to tenant "{tenant.name}"')
        else:
            self.stdout.write('ℹ️  No applied fitments to migrate')

    def migrate_field_configurations(self, tenant):
        """Migrate field configurations to the default tenant"""
        configs_without_tenant = FieldConfiguration.objects.filter(tenant__isnull=True)
        count = configs_without_tenant.count()
        
        if count > 0:
            configs_without_tenant.update(tenant=tenant)
            self.stdout.write(f'✅ Migrated {count} field configurations to tenant "{tenant.name}"')
        else:
            self.stdout.write('ℹ️  No field configurations to migrate')

    def migrate_field_configuration_history(self, tenant):
        """Migrate field configuration history to the default tenant"""
        history_without_tenant = FieldConfigurationHistory.objects.filter(tenant__isnull=True)
        count = history_without_tenant.count()
        
        if count > 0:
            history_without_tenant.update(tenant=tenant)
            self.stdout.write(f'✅ Migrated {count} field configuration history records to tenant "{tenant.name}"')
        else:
            self.stdout.write('ℹ️  No field configuration history to migrate')

    def create_default_user_profile(self, tenant):
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
                self.stdout.write(f'✅ Created user profile for admin: {user.username}')
            else:
                self.stdout.write(f'ℹ️  User profile already exists for admin: {user.username}')
