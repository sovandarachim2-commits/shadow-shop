from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('finance', '0002_add_bakong_payment_method_choice'),
    ]

    operations = [
        migrations.AlterField(
            model_name='revenue',
            name='payment_method',
            field=models.CharField(choices=[('bakong', 'Bakong KHQR'), ('aba', 'ABA Bank'), ('acleda', 'ACLEDA Bank'), ('wing', 'Wing'), ('cod', 'Cash on Delivery'), ('cash', 'Cash'), ('contact_sales', 'Contact Sales'), ('other', 'Other')], max_length=20),
        ),
    ]
