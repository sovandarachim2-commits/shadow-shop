from django.db import migrations, models


MODULE = ('scanner_delivery_config', 'Scanner Delivery Config')
ACTIONS = ['view', 'create', 'edit', 'delete', 'approve', 'adjust_points', 'export', 'print']


def create_scanner_delivery_config_permissions(apps, schema_editor):
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

    for role in ['super_admin', 'admin']:
        for permission in permissions:
            RolePermission.objects.get_or_create(
                role=role,
                permission=permission,
                defaults={'granted': True},
            )


def remove_scanner_delivery_config_permissions(apps, schema_editor):
    Permission = apps.get_model('accounts', 'Permission')
    Permission.objects.filter(module=MODULE[0]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0015_alter_permission_module_product_submenus'),
    ]

    operations = [
        migrations.RunPython(
            create_scanner_delivery_config_permissions,
            remove_scanner_delivery_config_permissions,
        ),
        migrations.AlterField(
            model_name='permission',
            name='module',
            field=models.CharField(choices=[
                ('dashboard', 'Dashboard'),
                ('orders', 'Orders'),
                ('products', 'Products'),
                ('product_brands', 'Product Brands'),
                ('product_categories', 'Product Categories'),
                ('product_sets', 'Product Sets'),
                ('product_flash_sale', 'Product Flash Sale'),
                ('product_banners', 'Product Banners'),
                ('inventory', 'Inventory'),
                ('delivery', 'Delivery'),
                ('finance', 'Finance'),
                ('reports', 'Reports'),
                ('users', 'Users'),
                ('settings', 'Settings'),
                ('print', 'Print'),
                ('scanner', 'Scanner'),
                ('scanner_delivery_config', 'Scanner Delivery Config'),
                ('storefront', 'Customer Storefront'),
                ('rewards', 'Rewards'),
            ], max_length=50),
        ),
    ]
