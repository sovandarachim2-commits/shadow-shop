import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0003_order_prepare_photos'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='PrepareRecord',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('code', models.CharField(max_length=100)),
                ('phone', models.CharField(blank=True, max_length=20)),
                ('payment_status', models.CharField(choices=[('paid', 'Paid'), ('unpaid', 'Unpaid'), ('partial', 'Partial'), ('refunded', 'Refunded')], default='unpaid', max_length=20)),
                ('amount', models.DecimalField(decimal_places=2, default=0, max_digits=15)),
                ('set_type', models.CharField(choices=[('not_set', 'Not Set'), ('set', 'Set')], default='not_set', max_length=20)),
                ('set_qr_values', models.JSONField(blank=True, default=list)),
                ('invoice_photo', models.ImageField(blank=True, null=True, upload_to='orders/prepare/manual/invoices/')),
                ('package_photo', models.ImageField(blank=True, null=True, upload_to='orders/prepare/manual/packages/')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='prepare_records', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'prepare_records',
                'ordering': ['-created_at'],
            },
        ),
    ]
