from django.db import migrations


def grant_scanner_to_warehouse(apps, schema_editor):
    Permission = apps.get_model('accounts', 'Permission')
    RolePermission = apps.get_model('accounts', 'RolePermission')

    scanner_permissions = Permission.objects.filter(
        module__in=['scanner', 'print', 'print_history'],
        action__in=['view', 'create', 'edit', 'delete', 'print']
    )

    for perm in scanner_permissions:
        RolePermission.objects.get_or_create(
            role='warehouse',
            permission=perm,
            defaults={'granted': True},
        )


def revoke_scanner_from_warehouse(apps, schema_editor):
    RolePermission = apps.get_model('accounts', 'RolePermission')
    RolePermission.objects.filter(
        role='warehouse',
        permission__module__in=['scanner', 'print', 'print_history']
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0030_inventory_storage_permission'),
    ]

    operations = [
        migrations.RunPython(
            grant_scanner_to_warehouse,
            revoke_scanner_from_warehouse,
        ),
    ]
