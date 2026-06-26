from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0009_rewarditem_gift_product'),
    ]

    operations = [
        migrations.AddField(
            model_name='rewarditem',
            name='reward_image',
            field=models.ImageField(blank=True, null=True, upload_to='rewards/'),
        ),
    ]
