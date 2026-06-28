from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0010_rewarditem_reward_image'),
    ]

    operations = [
        migrations.AddField(
            model_name='rewarditem',
            name='member_tier_requirement',
            field=models.CharField(
                choices=[('all', 'All Members'), ('silver', 'Silver'), ('gold', 'Gold'), ('platinum', 'Platinum')],
                default='all',
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name='rewarditem',
            name='type',
            field=models.CharField(
                choices=[
                    ('voucher', 'Voucher'),
                    ('discount', 'Discount Coupon'),
                    ('free_delivery', 'Free Delivery'),
                    ('gift', 'Gift Product'),
                    ('lucky_box', 'Lucky Box'),
                    ('manual', 'Manual Reward'),
                ],
                max_length=30,
            ),
        ),
        migrations.AlterField(
            model_name='rewardredemption',
            name='status',
            field=models.CharField(
                choices=[
                    ('active', 'Active'), ('pending', 'Pending'), ('approved', 'Approved'),
                    ('packed', 'Packed'), ('shipped', 'Shipped'), ('prepared', 'Prepared'),
                    ('completed', 'Completed'), ('used', 'Used'), ('rejected', 'Rejected'),
                    ('cancelled', 'Cancelled'),
                ],
                default='active',
                max_length=20,
            ),
        ),
        migrations.CreateModel(
            name='RewardSettings',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('points_per_dollar', models.PositiveIntegerField(default=10)),
                ('signup_bonus', models.PositiveIntegerField(default=0)),
                ('referral_bonus', models.PositiveIntegerField(default=0)),
                ('birthday_bonus', models.PositiveIntegerField(default=0)),
                ('review_bonus', models.PositiveIntegerField(default=0)),
                ('points_expiry_days', models.PositiveIntegerField(default=365)),
                ('expiration_enabled', models.BooleanField(default=True)),
                ('minimum_redeem_points', models.PositiveIntegerField(default=0)),
                ('maximum_points_per_order', models.PositiveIntegerField(default=0)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={'verbose_name_plural': 'reward settings', 'db_table': 'reward_settings'},
        ),
    ]
