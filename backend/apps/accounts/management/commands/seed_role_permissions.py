from django.core.management.base import BaseCommand
from apps.accounts.models import Permission, RolePermission

DEFAULTS = {
    'super_admin': '__all__',
    'admin':       '__all__',
    'seller': [
        ('dashboard', 'view'),
        ('orders',    'view'), ('orders',    'create'), ('orders',    'edit'), ('orders',    'print'),
        ('products',  'view'), ('products',  'create'), ('products',  'edit'),
        ('inventory', 'view'),
        ('reports',   'view'),
    ],
    'cashier': [
        ('dashboard', 'view'),
        ('orders',    'view'), ('orders',    'create'), ('orders',    'edit'), ('orders',    'print'),
        ('products',  'view'),
        ('finance',   'view'), ('finance',   'create'), ('finance',   'edit'), ('finance',   'print'),
    ],
    'warehouse': [
        ('dashboard',  'view'),
        ('orders',     'view'), ('orders',     'print'),
        ('products',   'view'),
        ('inventory',  'view'), ('inventory',  'create'), ('inventory',  'edit'), ('inventory',  'delete'), ('inventory',  'print'),
        ('delivery',   'view'),
    ],
    'scanner': [
        ('dashboard', 'view'),
        ('orders',    'view'), ('orders',    'print'),
        ('products',  'view'),
        ('scanner',   'view'), ('scanner',   'create'), ('scanner',   'print'),
        ('print',     'view'), ('print',     'print'),
    ],
    'delivery': [
        ('dashboard', 'view'),
        ('orders',    'view'), ('orders',    'print'),
        ('products',  'view'),
        ('inventory', 'view'),
        ('delivery',  'view'), ('delivery',  'edit'),  ('delivery',  'print'),
        ('print',     'view'), ('print',     'print'),
    ],
}


class Command(BaseCommand):
    help = 'Seed default RolePermission rows for each system role'

    def add_arguments(self, parser):
        parser.add_argument('--reset', action='store_true', help='Delete existing role permissions before seeding')

    def handle(self, *args, **options):
        if options['reset']:
            RolePermission.objects.filter(role__in=DEFAULTS.keys()).delete()
            self.stdout.write('Cleared existing role permissions.')

        all_perms = {(p.module, p.action): p for p in Permission.objects.all()}
        created_total = 0

        for role, spec in DEFAULTS.items():
            pairs = [(p.module, p.action) for p in Permission.objects.all()] if spec == '__all__' else spec
            for module, action in pairs:
                perm = all_perms.get((module, action))
                if not perm:
                    continue
                _, was_created = RolePermission.objects.get_or_create(
                    role=role, permission=perm,
                    defaults={'granted': True},
                )
                if was_created:
                    created_total += 1

        self.stdout.write(self.style.SUCCESS(f'Done. {created_total} new role permissions created.'))
