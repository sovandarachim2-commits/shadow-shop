# Generated to expose product submenu permission modules in Django choices.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0014_product_submenu_permissions'),
    ]

    operations = [
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
                ('storefront', 'Customer Storefront'),
                ('rewards', 'Rewards'),
            ], max_length=50),
        ),
    ]
