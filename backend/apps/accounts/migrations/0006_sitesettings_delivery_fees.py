from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0005_site_settings'),
    ]

    operations = [
        migrations.AddField(
            model_name='sitesettings',
            name='delivery_fees',
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
