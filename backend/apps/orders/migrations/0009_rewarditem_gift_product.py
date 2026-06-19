from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0008_rewards'),
        ('products', '0010_product_availability_status'),
    ]

    operations = [
        migrations.AddField(
            model_name='rewarditem',
            name='gift_product',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='reward_items', to='products.product'),
        ),
    ]
