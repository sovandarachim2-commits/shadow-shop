from django.core.management.base import BaseCommand
from apps.accounts.models import Permission, Role, RolePermission


DEFAULT_ROLES = [
    ('super_admin', 'Super Admin'),
    ('admin', 'Admin'),
    ('seller', 'Seller'),
    ('cashier', 'Cashier'),
    ('warehouse', 'Warehouse Staff'),
    ('scanner', 'Scanner Staff'),
    ('delivery', 'Delivery Staff'),
    ('customer', 'Customer'),
]

DEFAULTS = {
    'super_admin': '__all__',
    'admin':       '__all__',
    'seller': [
        ('dashboard', 'view'),
        ('orders',    'view'), ('orders',    'create'), ('orders',    'edit'), ('orders',    'print'),
        ('products',  'view'), ('products',  'create'), ('products',  'edit'),
        ('product_brands', 'view'), ('product_brands', 'create'), ('product_brands', 'edit'),
        ('product_categories', 'view'), ('product_categories', 'create'), ('product_categories', 'edit'),
        ('product_sets', 'view'), ('product_sets', 'create'), ('product_sets', 'edit'),
        ('product_flash_sale', 'view'), ('product_flash_sale', 'create'), ('product_flash_sale', 'edit'),
        ('product_banners', 'view'), ('product_banners', 'create'), ('product_banners', 'edit'),
        ('inventory', 'view'),
        ('reports',   'view'),
    ],
    'cashier': [
        ('dashboard', 'view'),
        ('orders',    'view'), ('orders',    'create'), ('orders',    'edit'), ('orders',    'print'),
        ('products',  'view'),
        ('product_brands', 'view'),
        ('product_categories', 'view'),
        ('product_sets', 'view'),
        ('product_flash_sale', 'view'),
        ('product_banners', 'view'),
        ('finance',   'view'), ('finance',   'create'), ('finance',   'edit'), ('finance',   'print'),
    ],
    'warehouse': [
        ('dashboard',  'view'),
        ('orders',     'view'), ('orders',     'print'),
        ('products',   'view'),
        ('product_brands', 'view'),
        ('product_categories', 'view'),
        ('product_sets', 'view'),
        ('product_flash_sale', 'view'),
        ('product_banners', 'view'),
        ('inventory',  'view'), ('inventory',  'create'), ('inventory',  'edit'), ('inventory',  'delete'), ('inventory',  'print'),
        ('delivery',   'view'),
    ],
    'scanner': [
        ('dashboard', 'view'),
        ('orders',    'view'), ('orders',    'print'),
        ('products',  'view'),
        ('product_brands', 'view'),
        ('product_categories', 'view'),
        ('product_sets', 'view'),
        ('product_flash_sale', 'view'),
        ('product_banners', 'view'),
        ('scanner',   'view'), ('scanner',   'create'), ('scanner',   'print'),
        ('print',     'view'), ('print',     'print'),
    ],
    'delivery': [
        ('dashboard', 'view'),
        ('orders',    'view'), ('orders',    'print'),
        ('products',  'view'),
        ('product_brands', 'view'),
        ('product_categories', 'view'),
        ('product_sets', 'view'),
        ('product_flash_sale', 'view'),
        ('product_banners', 'view'),
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
        for name, display_name in DEFAULT_ROLES:
            Role.objects.get_or_create(
                name=name,
                defaults={'display_name': display_name, 'is_system': True},
            )

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
