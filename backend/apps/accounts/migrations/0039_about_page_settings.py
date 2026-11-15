from django.db import migrations, models


def create_about_permissions(apps, schema_editor):
    Permission = apps.get_model('accounts', 'Permission')
    RolePermission = apps.get_model('accounts', 'RolePermission')
    for action in ('view', 'edit'):
        permission, _ = Permission.objects.get_or_create(
            module='settings_about', action=action,
            defaults={'description': f'About Us ({action})'},
        )
        for role in ('super_admin', 'admin'):
            RolePermission.objects.get_or_create(role=role, permission=permission)


def remove_about_permissions(apps, schema_editor):
    apps.get_model('accounts', 'Permission').objects.filter(module='settings_about').delete()


class Migration(migrations.Migration):
    dependencies = [('accounts', '0038_rename_website_vis_created_3d07da_idx_website_vis_created_e056e6_idx')]
    operations = [
        migrations.AddField(model_name='sitesettings', name='about_page', field=models.JSONField(blank=True, default=dict)),
        migrations.AddField(model_name='sitesettings', name='about_hero_image', field=models.ImageField(blank=True, null=True, upload_to='site/about/')),
        migrations.AlterField(model_name='permission', name='module', field=models.CharField(max_length=50, choices=[('dashboard', 'Dashboard'),
 ('orders', 'Orders'),
 ('customers', 'Customers'),
 ('products', 'Products'),
 ('product_brands', 'Product Brands'),
 ('product_categories', 'Product Categories'),
 ('product_sets', 'Product Sets'),
 ('product_flash_sale', 'Product Flash Sale'),
 ('product_banners', 'Product Banners'),
 ('marketing_announcements', 'Marketing - Announcement Bar'),
 ('marketing_posters', 'Marketing - Poster Management'),
 ('marketing_videos', 'Marketing - Video Highlights'),
 ('stores', 'Stores & Partners'),
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
 ('settings_about', 'About Us'),
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
 ('rewards_points', 'Customer Points')])),
        migrations.RunPython(create_about_permissions, remove_about_permissions),
    ]
