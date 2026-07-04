from django.db import migrations


PRODUCT_SUBMODULES = [
    ('product_brands', 'Product Brands'),
    ('product_categories', 'Product Categories'),
    ('product_sets', 'Product Sets'),
    ('product_flash_sale', 'Product Flash Sale'),
    ('product_banners', 'Product Banners'),
]


def create_product_submenu_permissions(apps, schema_editor):
    Permission = apps.get_model('accounts', 'Permission')
    RolePermission = apps.get_model('accounts', 'RolePermission')

    actions = list(Permission.objects.values_list('action', flat=True).distinct())
    if not actions:
        actions = ['view', 'create', 'edit', 'delete', 'approve', 'adjust_points', 'export', 'print']

    for module, label in PRODUCT_SUBMODULES:
        for action in actions:
            Permission.objects.get_or_create(
                module=module,
                action=action,
                defaults={'description': f'{label}: {action.replace("_", " ")}'},
            )

    product_grants = RolePermission.objects.filter(permission__module='products').select_related('permission')
    permission_lookup = {
        (permission.module, permission.action): permission
        for permission in Permission.objects.filter(module__in=[module for module, _ in PRODUCT_SUBMODULES])
    }

    for grant in product_grants:
        for module, _ in PRODUCT_SUBMODULES:
            permission = permission_lookup.get((module, grant.permission.action))
            if permission:
                RolePermission.objects.update_or_create(
                    role=grant.role,
                    permission=permission,
                    defaults={'granted': grant.granted},
                )


def remove_product_submenu_permissions(apps, schema_editor):
    Permission = apps.get_model('accounts', 'Permission')
    Permission.objects.filter(module__in=[module for module, _ in PRODUCT_SUBMODULES]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0013_rewards_permissions'),
    ]

    operations = [
        migrations.RunPython(create_product_submenu_permissions, remove_product_submenu_permissions),
    ]
