from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0009_productsetimage'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='availability_status',
            field=models.CharField(
                choices=[
                    ('auto', 'Auto by Stock'),
                    ('available', 'Available'),
                    ('out_of_stock', 'Out of Stock'),
                ],
                default='auto',
                max_length=20,
            ),
        ),
    ]
