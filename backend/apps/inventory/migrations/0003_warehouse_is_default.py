from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0002_warehouse_capacity_and_stock'),
    ]

    operations = [
        migrations.AddField(
            model_name='warehouse',
            name='is_default',
            field=models.BooleanField(default=False),
        ),
    ]
