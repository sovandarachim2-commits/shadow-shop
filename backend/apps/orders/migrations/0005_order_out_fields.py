from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0004_prepare_record'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='out_delivery_by',
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AddField(
            model_name='order',
            name='out_invoice_photo',
            field=models.ImageField(blank=True, null=True, upload_to='orders/out/invoices/'),
        ),
        migrations.AddField(
            model_name='order',
            name='out_package_photo',
            field=models.ImageField(blank=True, null=True, upload_to='orders/out/packages/'),
        ),
    ]
