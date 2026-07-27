from django.db import migrations, models


# Parent module -> new per-menu child modules (label, module_key)
MENU_SPLITS = {
    'orders': [
        ('customers', 'Customers'),
    ],
    'inventory': [
        ('inventory_movements', 'Inventory Movements'),
        ('inventory_transfers', 'Inventory Transfers'),
    ],
    'print': [
        ('print_history', 'Print History'),
    ],
    'finance': [
        ('finance_expenses', 'Finance Expenses'),
        ('finance_profit', 'Finance Profit'),
    ],
    'rewards': [
        ('rewards_products', 'Reward Products'),
        ('rewards_coupons', 'Promo Codes'),
        ('rewards_exchanges', 'Redeem Requests'),
        ('rewards_settings', 'Reward Settings'),
        ('rewards_transactions', 'Point Transactions'),
        ('rewards_points', 'Customer Points'),
    ],
    'reports': [
        ('reports_products', 'Product Reports'),
        ('reports_inventory', 'Inventory Reports'),
    ],
    'users': [
        ('users_roles', 'Roles & Permissions'),
        ('users_activity', 'Activity Logs'),
    ],
    'settings': [
        ('settings_telegram', 'Telegram Settings'),
        ('settings_delivery', 'Delivery Settings'),
        ('settings_payment', 'Payment Methods'),
        ('settings_print_logo', 'Print Logo'),
        ('settings_login_logo', 'Login Logo'),
        ('settings_customer_footer', 'Customer Footer'),
    ],
}

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


def create_menu_submenu_permissions(apps, schema_editor):
    Permission = apps.get_model('accounts', 'Permission')
    RolePermission = apps.get_model('accounts', 'RolePermission')

    actions = list(Permission.objects.values_list('action', flat=True).distinct())
    if not actions:
        actions = ['view', 'create', 'edit', 'delete', 'approve', 'adjust_points', 'export', 'print']

    child_modules = []
    for children in MENU_SPLITS.values():
        child_modules.extend(children)

    for module, label in child_modules:
        for action in actions:
            Permission.objects.get_or_create(
                module=module,
                action=action,
                defaults={'description': f'{label}: {action.replace("_", " ")}'},
            )

    permission_lookup = {
        (permission.module, permission.action): permission
        for permission in Permission.objects.filter(module__in=[module for module, _ in child_modules])
    }

    for parent_module, children in MENU_SPLITS.items():
        parent_grants = RolePermission.objects.filter(
            permission__module=parent_module,
        ).select_related('permission')
        for grant in parent_grants:
            for module, _ in children:
                permission = permission_lookup.get((module, grant.permission.action))
                if permission:
                    RolePermission.objects.update_or_create(
                        role=grant.role,
                        permission=permission,
                        defaults={'granted': grant.granted},
                    )


def remove_menu_submenu_permissions(apps, schema_editor):
    Permission = apps.get_model('accounts', 'Permission')
    modules = [module for children in MENU_SPLITS.values() for module, _ in children]
    Permission.objects.filter(module__in=modules).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0024_sitesettings_footer_menus'),
    ]

    operations = [
        migrations.AlterField(
            model_name='permission',
            name='module',
            field=models.CharField(choices=MODULE_CHOICES, max_length=50),
        ),
        migrations.RunPython(create_menu_submenu_permissions, remove_menu_submenu_permissions),
    ]
