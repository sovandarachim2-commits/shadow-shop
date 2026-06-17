from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0006_sitesettings_delivery_fees'),
    ]

    operations = [
        migrations.AddField(
            model_name='sitesettings',
            name='payment_methods',
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
