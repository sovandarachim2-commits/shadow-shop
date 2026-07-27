from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0019_promo_code_staff_scope'),
    ]

    operations = [
        migrations.AddField(
            model_name='rewardsettings',
            name='is_active',
            field=models.BooleanField(default=True),
        ),
    ]
