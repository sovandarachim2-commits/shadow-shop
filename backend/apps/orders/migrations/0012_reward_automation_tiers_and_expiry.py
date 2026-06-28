from django.db import migrations, models


def set_default_points_rate(apps, schema_editor):
    RewardSettings = apps.get_model('orders', 'RewardSettings')
    RewardSettings.objects.filter(pk=1, points_per_dollar=10).update(points_per_dollar=1)


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0011_reward_management_settings_and_workflow'),
    ]

    operations = [
        migrations.AlterField(
            model_name='rewardsettings',
            name='points_per_dollar',
            field=models.PositiveIntegerField(default=1),
        ),
        migrations.AddField(model_name='rewardsettings', name='daily_checkin_bonus', field=models.PositiveIntegerField(default=0)),
        migrations.AddField(model_name='rewardsettings', name='expiry_reminder_days', field=models.PositiveIntegerField(default=7)),
        migrations.AddField(model_name='rewardsettings', name='silver_min_points', field=models.PositiveIntegerField(default=0)),
        migrations.AddField(model_name='rewardsettings', name='gold_min_points', field=models.PositiveIntegerField(default=2000)),
        migrations.AddField(model_name='rewardsettings', name='platinum_min_points', field=models.PositiveIntegerField(default=5000)),
        migrations.AddField(model_name='rewardsettings', name='auto_approve_points', field=models.BooleanField(default=True)),
        migrations.AddField(model_name='rewardsettings', name='auto_apply_on_completed', field=models.BooleanField(default=False)),
        migrations.AddField(model_name='rewardsettings', name='low_stock_alert_enabled', field=models.BooleanField(default=True)),
        migrations.AddField(model_name='pointtransaction', name='expires_at', field=models.DateTimeField(blank=True, null=True)),
        migrations.RunPython(set_default_points_rate, migrations.RunPython.noop),
    ]
