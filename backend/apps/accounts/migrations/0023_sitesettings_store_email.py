from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0022_pendingregistration'),
    ]

    operations = [
        migrations.AddField(
            model_name='sitesettings',
            name='store_email',
            field=models.EmailField(blank=True, max_length=254),
        ),
    ]
