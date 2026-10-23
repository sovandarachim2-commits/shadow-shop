from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('notifications', '0007_telegramconfig_notify_staff_login'),
    ]

    operations = [
        migrations.AddField(
            model_name='telegramconfig',
            name='payment_received_methods',
            field=models.JSONField(blank=True, default=list),
        ),
    ]
