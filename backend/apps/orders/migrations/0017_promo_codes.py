from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('orders', '0016_expand_customer_provinces'),
    ]

    operations = [
        migrations.CreateModel(
            name='PromoCode',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=150)),
                ('code', models.CharField(max_length=40, unique=True)),
                ('discount_type', models.CharField(choices=[('percent', 'Percentage'), ('amount', 'Fixed Amount'), ('free_delivery', 'Free Delivery')], default='percent', max_length=20)),
                ('value', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('apply_to', models.CharField(choices=[('products', 'Products Only'), ('delivery', 'Delivery Fee'), ('order', 'Products + Delivery')], default='products', max_length=20)),
                ('minimum_order_amount', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('max_discount_amount', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)),
                ('usage_limit', models.PositiveIntegerField(blank=True, null=True)),
                ('per_customer_limit', models.PositiveIntegerField(blank=True, default=1, null=True)),
                ('customer_scope', models.CharField(choices=[('all', 'All Customers'), ('new', 'New Customers Only')], default='all', max_length=20)),
                ('starts_at', models.DateTimeField(blank=True, null=True)),
                ('ends_at', models.DateTimeField(blank=True, null=True)),
                ('priority', models.PositiveIntegerField(default=1)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_promo_codes', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'promo_codes',
                'ordering': ['-priority', '-created_at'],
            },
        ),
        migrations.CreateModel(
            name='PromoCodeUsage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('discount_amount', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('order', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='promo_code_usages', to='orders.order')),
                ('promo_code', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='usages', to='orders.promocode')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='promo_code_usages', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'promo_code_usages',
                'ordering': ['-created_at'],
                'unique_together': {('promo_code', 'order')},
            },
        ),
    ]
