from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0002_add_bakong_payment_method_choice'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='prepare_invoice_photo',
            field=models.ImageField(blank=True, null=True, upload_to='orders/prepare/invoices/'),
        ),
        migrations.AddField(
            model_name='order',
            name='prepare_package_photo',
            field=models.ImageField(blank=True, null=True, upload_to='orders/prepare/packages/'),
        ),
    ]
