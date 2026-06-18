from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0008_product_flash_sale_max_order_qty'),
    ]

    operations = [
        migrations.CreateModel(
            name='ProductSetImage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('image', models.ImageField(upload_to='product_sets/')),
                ('alt_text', models.CharField(blank=True, max_length=200)),
                ('is_primary', models.BooleanField(default=False)),
                ('order', models.PositiveIntegerField(default=0)),
                ('product_set', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='images', to='products.productset')),
            ],
            options={
                'db_table': 'product_set_images',
                'ordering': ['order'],
            },
        ),
    ]
