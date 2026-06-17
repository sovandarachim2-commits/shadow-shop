from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0005_home_section_style'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='flash_sale_price',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True),
        ),
        migrations.AddField(
            model_name='product',
            name='flash_sale_starts_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='product',
            name='flash_sale_ends_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
