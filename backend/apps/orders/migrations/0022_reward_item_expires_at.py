from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0021_reward_earning_statuses'),
    ]

    operations = [
        migrations.AddField(
            model_name='rewarditem',
            name='expires_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
