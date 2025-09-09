from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from tenants.models import Tenant, Role, UserProfile


class Command(BaseCommand):
    help = 'Seed default roles, tenant, and admin user'

    def handle(self, *args, **options):
        for name in ["SDC Admin", "Customer Admin", "Customer Contributor"]:
            Role.objects.get_or_create(name=name)
        tenant, _ = Tenant.objects.get_or_create(slug='default', defaults={'name': 'Default Tenant'})
        user, _ = User.objects.get_or_create(username='admin', defaults={'email': 'admin@localhost'})
        profile, _ = UserProfile.objects.get_or_create(user=user, tenant=tenant)
        admin_role = Role.objects.get(name='SDC Admin')
        profile.roles.add(admin_role)
        self.stdout.write(self.style.SUCCESS('Seeded defaults'))
