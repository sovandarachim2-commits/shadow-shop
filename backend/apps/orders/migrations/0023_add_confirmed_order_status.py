from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0022_reward_item_expires_at'),
    ]

    operations = [
        migrations.AlterField(
            model_name='order',
            name='status',
            field=models.CharField(
                choices=[
                    ('new', 'New'),
                    ('confirmed', 'Confirmed'),
                    ('printed', 'Printed'),
                    ('preparing', 'Preparing'),
                    ('packed', 'Packed'),
                    ('shipped', 'Shipped'),
                    ('completed', 'Completed'),
                    ('cancelled', 'Cancelled'),
                ],
                default='new',
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name='orderstatushistory',
            name='status',
            field=models.CharField(
                choices=[
                    ('new', 'New'),
                    ('confirmed', 'Confirmed'),
                    ('printed', 'Printed'),
                    ('preparing', 'Preparing'),
                    ('packed', 'Packed'),
                    ('shipped', 'Shipped'),
                    ('completed', 'Completed'),
                    ('cancelled', 'Cancelled'),
                ],
                max_length=20,
            ),
        ),
    ]
