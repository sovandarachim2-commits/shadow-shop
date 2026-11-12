from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0017_offerposter'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='flash_sale_stock',
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='productset',
            name='flash_sale_stock',
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
    ]

