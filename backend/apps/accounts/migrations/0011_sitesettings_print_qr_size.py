from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0010_sitesettings_print_logo_size'),
    ]

    operations = [
        migrations.AddField(
            model_name='sitesettings',
            name='print_qr_size',
            field=models.PositiveIntegerField(default=68),
        ),
    ]
