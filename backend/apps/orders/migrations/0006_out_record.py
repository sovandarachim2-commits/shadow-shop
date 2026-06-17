from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0005_order_out_fields'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='OutRecord',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('code', models.CharField(max_length=100, unique=True)),
                ('phone', models.CharField(blank=True, max_length=20)),
                ('delivery_by', models.CharField(blank=True, max_length=200)),
                ('invoice_photo', models.ImageField(blank=True, null=True, upload_to='orders/out/manual/invoices/')),
                ('package_photo', models.ImageField(blank=True, null=True, upload_to='orders/out/manual/packages/')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='out_records', to=settings.AUTH_USER_MODEL)),
                ('prepare_record', models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='out_record', to='orders.preparerecord')),
            ],
            options={
                'db_table': 'out_records',
                'ordering': ['-created_at'],
            },
        ),
    ]
