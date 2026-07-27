from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0020_reward_settings_status'),
    ]

    operations = [
        migrations.AddField(
            model_name='rewardsettings',
            name='purchase_points_enabled',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='rewardsettings',
            name='signup_bonus_enabled',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='rewardsettings',
            name='referral_bonus_enabled',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='rewardsettings',
            name='birthday_bonus_enabled',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='rewardsettings',
            name='review_bonus_enabled',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='rewardsettings',
            name='daily_checkin_enabled',
            field=models.BooleanField(default=True),
        ),
    ]
