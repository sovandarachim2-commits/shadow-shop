from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0018_promo_code_apply_scope'),
    ]

    operations = [
        migrations.AlterField(
            model_name='promocode',
            name='customer_scope',
            field=models.CharField(
                choices=[
                    ('all', 'All Customers'),
                    ('new', 'New Customers Only'),
                    ('staff', 'Staff Only'),
                ],
                default='all',
                max_length=20,
            ),
        ),
    ]
