from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('finance', '0003_add_contact_sales_payment_method'),
    ]

    operations = [
        migrations.AddField(
            model_name='expensecategory',
            name='parent',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='children',
                to='finance.expensecategory',
            ),
        ),
    ]
