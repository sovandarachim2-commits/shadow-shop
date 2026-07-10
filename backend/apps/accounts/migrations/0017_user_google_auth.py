from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0016_scanner_delivery_config_permission'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='google_auth_date',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='user',
            name='google_id',
            field=models.CharField(blank=True, max_length=100, null=True, unique=True),
        ),
        migrations.AddField(
            model_name='user',
            name='google_picture_url',
            field=models.URLField(blank=True),
        ),
    ]
