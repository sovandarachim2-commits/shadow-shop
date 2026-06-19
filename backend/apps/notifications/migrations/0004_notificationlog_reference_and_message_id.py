from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('notifications', '0003_telegramconfig_topic_id'),
    ]

    operations = [
        migrations.AddField(
            model_name='notificationlog',
            name='reference',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name='notificationlog',
            name='telegram_message_id',
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
    ]
