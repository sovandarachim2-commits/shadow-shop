from django.core.management.base import BaseCommand
from apps.accounts.models import Permission


MODULES = [
    'dashboard',
    'orders', 'customers',
    'products', 'product_brands', 'product_categories',
    'product_sets', 'product_flash_sale', 'product_banners',
    'inventory', 'inventory_movements', 'inventory_transfers',
    'delivery',
    'finance', 'finance_expenses', 'finance_profit',
    'reports', 'reports_products', 'reports_inventory',
    'users', 'users_roles', 'users_activity',
    'settings', 'settings_telegram', 'settings_delivery', 'settings_payment',
    'settings_print_logo', 'settings_login_logo', 'settings_customer_footer',
    'print', 'print_history',
    'scanner', 'scanner_delivery_config',
    'storefront',
    'rewards', 'rewards_products', 'rewards_coupons', 'rewards_exchanges',
    'rewards_settings', 'rewards_transactions', 'rewards_points',
]
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
