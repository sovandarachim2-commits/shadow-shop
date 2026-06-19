from django.db import migrations, models


def seed_rewards_permissions(apps, schema_editor):
    Permission = apps.get_model('accounts', 'Permission')
    RolePermission = apps.get_model('accounts', 'RolePermission')
    actions = ['view', 'create', 'edit', 'delete', 'approve', 'adjust_points']
    for action in actions:
        permission, _ = Permission.objects.get_or_create(module='rewards', action=action)
        for role in ['super_admin', 'admin']:
            RolePermission.objects.get_or_create(role=role, permission=permission, defaults={'granted': True})


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0012_alter_permission_module'),
    ]

    operations = [
        migrations.AlterField(
            model_name='permission',
            name='action',
            field=models.CharField(choices=[('view', 'View'), ('create', 'Create'), ('edit', 'Edit'), ('delete', 'Delete'), ('export', 'Export'), ('print', 'Print'), ('approve', 'Approve'), ('adjust_points', 'Adjust Points')], max_length=20),
        ),
        migrations.AlterField(
            model_name='permission',
            name='module',
            field=models.CharField(choices=[('dashboard', 'Dashboard'), ('orders', 'Orders'), ('products', 'Products'), ('inventory', 'Inventory'), ('delivery', 'Delivery'), ('finance', 'Finance'), ('reports', 'Reports'), ('users', 'Users'), ('settings', 'Settings'), ('print', 'Print'), ('scanner', 'Scanner'), ('storefront', 'Customer Storefront'), ('rewards', 'Rewards')], max_length=50),
        ),
        migrations.RunPython(seed_rewards_permissions, migrations.RunPython.noop),
    ]
