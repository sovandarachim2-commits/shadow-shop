from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0007_productreview'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='flash_sale_max_order_qty',
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
    ]
