from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0023_sitesettings_store_email'),
    ]

    operations = [
        migrations.AddField(
            model_name='sitesettings',
            name='footer_menus',
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
