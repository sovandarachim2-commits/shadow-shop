from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='order',
            name='payment_method',
            field=models.CharField(blank=True, choices=[('bakong', 'Bakong KHQR'), ('aba', 'ABA Bank'), ('acleda', 'ACLEDA Bank'), ('wing', 'Wing'), ('cod', 'Cash on Delivery'), ('cash', 'Cash'), ('other', 'Other')], max_length=20),
        ),
    ]
