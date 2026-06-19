from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


def seed_rewards(apps, schema_editor):
    RewardItem = apps.get_model('orders', 'RewardItem')
    rewards = [
        {
            'name': '$1 Discount Coupon',
            'description': 'Redeem points for a $1 discount code on your next order.',
            'points_required': 100,
            'type': 'discount',
            'coupon_discount_type': 'amount',
            'coupon_value': '1.00',
            'minimum_order_amount': '0.00',
            'stock': 500,
        },
        {
            'name': '$5 Discount Coupon',
            'description': 'Save $5 on your next checkout with this reward coupon.',
            'points_required': 450,
            'type': 'discount',
            'coupon_discount_type': 'amount',
            'coupon_value': '5.00',
            'minimum_order_amount': '0.00',
            'stock': 300,
        },
        {
            'name': 'Free Delivery Coupon',
            'description': 'Exchange points for free delivery on a future order.',
            'points_required': 200,
            'type': 'free_delivery',
            'coupon_discount_type': 'amount',
            'coupon_value': '0.00',
            'minimum_order_amount': '0.00',
            'stock': 300,
        },
    ]
    for reward in rewards:
        RewardItem.objects.update_or_create(
            name=reward['name'],
            defaults={**reward, 'is_active': True},
        )


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('orders', '0007_orderitem_product_set'),
    ]

    operations = [
        migrations.CreateModel(
            name='RewardItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=150)),
                ('description', models.TextField(blank=True)),
                ('points_required', models.PositiveIntegerField()),
                ('type', models.CharField(choices=[('discount', 'Discount Coupon'), ('free_delivery', 'Free Delivery'), ('gift', 'Gift Product'), ('manual', 'Manual Reward')], max_length=30)),
                ('coupon_discount_type', models.CharField(choices=[('amount', 'Amount'), ('percent', 'Percent')], default='amount', max_length=20)),
                ('coupon_value', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('minimum_order_amount', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('stock', models.PositiveIntegerField(blank=True, null=True)),
                ('per_customer_limit', models.PositiveIntegerField(blank=True, null=True)),
                ('is_active', models.BooleanField(default=True)),
                ('starts_at', models.DateTimeField(blank=True, null=True)),
                ('ends_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'reward_items',
                'ordering': ['points_required', 'name'],
            },
        ),
        migrations.CreateModel(
            name='RewardRedemption',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('points_spent', models.PositiveIntegerField()),
                ('coupon_code', models.CharField(blank=True, max_length=30, null=True, unique=True)),
                ('status', models.CharField(choices=[('active', 'Active'), ('pending', 'Pending'), ('prepared', 'Prepared'), ('completed', 'Completed'), ('used', 'Used'), ('rejected', 'Rejected'), ('cancelled', 'Cancelled')], default='active', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('reward_item', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='redemptions', to='orders.rewarditem')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='reward_redemptions', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'reward_redemptions',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='PointTransaction',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('points', models.IntegerField()),
                ('type', models.CharField(choices=[('earn', 'Earn'), ('redeem', 'Redeem'), ('adjust', 'Adjust')], max_length=20)),
                ('note', models.CharField(blank=True, max_length=255)),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('order', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='point_transactions', to='orders.order')),
                ('reward_redemption', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='point_transactions', to='orders.rewardredemption')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='point_transactions', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'point_transactions',
                'ordering': ['-created_at'],
                'unique_together': {('user', 'order', 'type')},
            },
        ),
        migrations.RunPython(seed_rewards, migrations.RunPython.noop),
    ]
