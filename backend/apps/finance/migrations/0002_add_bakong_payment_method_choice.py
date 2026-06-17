from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('finance', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='revenue',
            name='payment_method',
            field=models.CharField(choices=[('bakong', 'Bakong KHQR'), ('aba', 'ABA Bank'), ('acleda', 'ACLEDA Bank'), ('wing', 'Wing'), ('cod', 'Cash on Delivery'), ('cash', 'Cash'), ('other', 'Other')], max_length=20),
        ),
    ]
