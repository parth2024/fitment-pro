from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from tenants.models import Tenant, Role, UserProfile


class Command(BaseCommand):
    help = 'Seed Admin and MFT user roles and create sample users'

    def handle(self, *args, **options):
        # Create or get the roles
        admin_role, _ = Role.objects.get_or_create(
            name="Admin",
            defaults={'description': 'Administrator with full access including VCDB data'}
        )
        
        mft_role, _ = Role.objects.get_or_create(
            name="MFT User",
            defaults={'description': 'MFT user with limited access (no VCDB data)'}
        )
        
        self.stdout.write(f'Created roles: {admin_role.name}, {mft_role.name}')
        
        # Get or create default tenant
        tenant, _ = Tenant.objects.get_or_create(
            slug='default', 
            defaults={
                'name': 'Default Tenant',
                'description': 'Default tenant for testing'
            }
        )
        
        # Create Admin user
        admin_user, created = User.objects.get_or_create(
            username='admin',
            defaults={
                'email': 'admin@fitmentpro.ai',
                'first_name': 'Admin',
                'last_name': 'User',
                'is_staff': True,
                'is_superuser': True
            }
        )
        
        if created:
            admin_user.set_password('admin123')
            admin_user.save()
            self.stdout.write('Created admin user with password: admin123')
        else:
            self.stdout.write('Admin user already exists')
        
        # Create Admin profile
        admin_profile, created = UserProfile.objects.get_or_create(
            user=admin_user,
            tenant=tenant,
            defaults={'display_name': 'Admin User'}
        )
        
        if not admin_profile.roles.filter(name="Admin").exists():
            admin_profile.roles.add(admin_role)
            self.stdout.write('Added Admin role to admin user')
        
        # Create MFT user
        mft_user, created = User.objects.get_or_create(
            username='mft_user',
            defaults={
                'email': 'mft@fitmentpro.ai',
                'first_name': 'MFT',
                'last_name': 'User',
                'is_staff': False,
                'is_superuser': False
            }
        )
        
        if created:
            mft_user.set_password('mft123')
            mft_user.save()
            self.stdout.write('Created MFT user with password: mft123')
        else:
            self.stdout.write('MFT user already exists')
        
        # Create MFT profile
        mft_profile, created = UserProfile.objects.get_or_create(
            user=mft_user,
            tenant=tenant,
            defaults={'display_name': 'MFT User'}
        )
        
        if not mft_profile.roles.filter(name="MFT User").exists():
            mft_profile.roles.add(mft_role)
            self.stdout.write('Added MFT User role to mft_user')
        
        self.stdout.write(self.style.SUCCESS('Successfully seeded user roles and sample users'))
        self.stdout.write('Login credentials:')
        self.stdout.write('  Admin: admin / admin123')
        self.stdout.write('  MFT User: mft_user / mft123')
