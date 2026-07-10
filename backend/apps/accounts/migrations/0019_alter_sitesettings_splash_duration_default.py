from django.db import migrations, models


def set_default_splash_duration(apps, schema_editor):
    SiteSettings = apps.get_model('accounts', 'SiteSettings')
    SiteSettings.objects.filter(splash_duration_ms=2500).update(splash_duration_ms=3000)


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0018_sitesettings_login_splash'),
    ]

    operations = [
        migrations.AlterField(
            model_name='sitesettings',
            name='splash_duration_ms',
            field=models.PositiveIntegerField(default=3000),
        ),
        migrations.RunPython(set_default_splash_duration, migrations.RunPython.noop),
    ]
