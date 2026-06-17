from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0008_role_alter_rolepermission_role'),
    ]

    operations = [
        migrations.AddField(
            model_name='sitesettings',
            name='print_logo',
            field=models.ImageField(blank=True, null=True, upload_to='site/print/'),
        ),
    ]
