from django.db import migrations, models


MODULE = ('inventory_storage', 'Inventory Storage')
ACTIONS = ['view', 'create', 'edit', 'delete', 'export', 'print', 'approve', 'adjust_points']
MODULE_CHOICES = [
    ('dashboard', 'Dashboard'),
    ('orders', 'Orders'),
    ('customers', 'Customers'),
    ('products', 'Products'),
    ('product_brands', 'Product Brands'),
    ('product_categories', 'Product Categories'),
    ('product_sets', 'Product Sets'),
    ('product_flash_sale', 'Product Flash Sale'),
    ('product_banners', 'Product Banners'),
    ('inventory', 'Inventory'),
    ('inventory_movements', 'Inventory Movements'),
    ('inventory_storage', 'Inventory Storage'),
    ('inventory_transfers', 'Inventory Transfers'),
    ('delivery', 'Delivery'),
    ('finance', 'Finance'),
    ('finance_expenses', 'Finance Expenses'),
    ('finance_profit', 'Finance Profit'),
    ('reports', 'Reports'),
    ('reports_products', 'Product Reports'),
    ('reports_inventory', 'Inventory Reports'),
    ('users', 'Users'),
    ('users_roles', 'Roles & Permissions'),
    ('users_activity', 'Activity Logs'),
    ('settings', 'Settings'),
    ('settings_telegram', 'Telegram Settings'),
    ('settings_delivery', 'Delivery Settings'),
    ('settings_payment', 'Payment Methods'),
    ('settings_print_logo', 'Print Logo'),
    ('settings_login_logo', 'Login Logo'),
    ('settings_customer_footer', 'Customer Footer'),
    ('print', 'Print'),
    ('print_history', 'Print History'),
    ('scanner', 'Scanner'),
    ('scanner_delivery_config', 'Scanner Delivery Config'),
    ('storefront', 'Customer Storefront'),
    ('rewards', 'Rewards'),
    ('rewards_products', 'Reward Products'),
    ('rewards_coupons', 'Promo Codes'),
    ('rewards_exchanges', 'Redeem Requests'),
    ('rewards_settings', 'Reward Settings'),
    ('rewards_transactions', 'Point Transactions'),
    ('rewards_points', 'Customer Points'),
]


def create_inventory_storage_permissions(apps, schema_editor):
    Permission = apps.get_model('accounts', 'Permission')
    RolePermission = apps.get_model('accounts', 'RolePermission')

    permissions = []
    for action in ACTIONS:
        permission, _ = Permission.objects.get_or_create(
            module=MODULE[0],
            action=action,
            defaults={'description': f'{MODULE[1]} {action}'},
        )
        permissions.append(permission)

    for role in ('super_admin', 'admin'):
        for permission in permissions:
            RolePermission.objects.get_or_create(
                role=role,
                permission=permission,
                defaults={'granted': True},
            )


def remove_inventory_storage_permissions(apps, schema_editor):
    Permission = apps.get_model('accounts', 'Permission')
    Permission.objects.filter(module=MODULE[0]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0029_sitesettings_home_card_backgrounds'),
    ]

    operations = [
        migrations.AlterField(
            model_name='permission',
            name='module',
            field=models.CharField(choices=MODULE_CHOICES, max_length=50),
        ),
        migrations.RunPython(
            create_inventory_storage_permissions,
            remove_inventory_storage_permissions,
        ),
    ]
