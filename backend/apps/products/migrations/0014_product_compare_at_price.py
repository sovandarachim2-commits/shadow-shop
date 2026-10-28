from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0013_performance_indexes'),
    ]

    operations = [
        migrations.AddField(
            model_name='product',
            name='compare_at_price',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True),
        ),
    ]
