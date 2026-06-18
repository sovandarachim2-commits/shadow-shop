from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('notifications', '0002_telegramconfig_bot_username'),
    ]

    operations = [
        migrations.AddField(
            model_name='telegramconfig',
            name='topic_id',
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
    ]
