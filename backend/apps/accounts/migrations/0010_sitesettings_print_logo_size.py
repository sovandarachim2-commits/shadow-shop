from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0009_sitesettings_print_logo'),
    ]

    operations = [
        migrations.AddField(
            model_name='sitesettings',
            name='print_logo_size',
            field=models.PositiveIntegerField(default=64),
        ),
    ]
