from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0017_user_google_auth'),
    ]

    operations = [
        migrations.AddField(
            model_name='sitesettings',
            name='login_logo',
            field=models.ImageField(blank=True, null=True, upload_to='site/login/'),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='splash_logo',
            field=models.ImageField(blank=True, null=True, upload_to='site/splash/'),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='splash_enabled',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='splash_duration_ms',
            field=models.PositiveIntegerField(default=2500),
        ),
    ]
