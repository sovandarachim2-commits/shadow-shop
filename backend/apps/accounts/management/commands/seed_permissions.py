from django.core.management.base import BaseCommand
from apps.accounts.models import Permission


MODULES = ['dashboard', 'orders', 'products', 'inventory', 'delivery', 'finance', 'reports', 'users', 'settings', 'print', 'scanner', 'storefront', 'rewards']
ACTIONS = ['view', 'create', 'edit', 'delete', 'export', 'print', 'approve', 'adjust_points']


class Command(BaseCommand):
    help = 'Seed all Permission objects (module × action combinations)'

    def handle(self, *args, **kwargs):
        created = 0
        for module in MODULES:
            for action in ACTIONS:
                _, was_created = Permission.objects.get_or_create(module=module, action=action)
                if was_created:
                    created += 1
        self.stdout.write(self.style.SUCCESS(f'Done. {created} new permissions created ({Permission.objects.count()} total).'))
