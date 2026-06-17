from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('orders', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='BakongPayment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('amount', models.DecimalField(decimal_places=2, max_digits=15)),
                ('currency', models.CharField(default='USD', max_length=3)),
                ('qr_payload', models.TextField()),
                ('qr_image', models.TextField(blank=True)),
                ('md5', models.CharField(max_length=32, unique=True)),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('paid', 'Paid'), ('expired', 'Expired'), ('failed', 'Failed')], default='pending', max_length=20)),
                ('response_data', models.JSONField(blank=True, default=dict)),
                ('expires_at', models.DateTimeField()),
                ('paid_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('order', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='bakong_payment', to='orders.order')),
            ],
            options={
                'db_table': 'bakong_payments',
                'ordering': ['-created_at'],
            },
        ),
    ]
