from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0006_out_record'),
        ('products', '0008_product_flash_sale_max_order_qty'),
    ]

    operations = [
        migrations.AddField(
            model_name='orderitem',
            name='product_set',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='order_items', to='products.productset'),
        ),
    ]
