from django.db import migrations, models


def move_other_gender_to_prefer_not_to_say(apps, schema_editor):
    User = apps.get_model('accounts', 'User')
    User.objects.filter(gender='other').update(gender='prefer_not_to_say')


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0026_address_line1_optional'),
    ]

    operations = [
        migrations.RunPython(move_other_gender_to_prefer_not_to_say, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='user',
            name='gender',
            field=models.CharField(
                blank=True,
                choices=[
                    ('male', 'Male'),
                    ('female', 'Female'),
                    ('prefer_not_to_say', 'Prefer not to say'),
                ],
                max_length=20,
            ),
        ),
    ]
