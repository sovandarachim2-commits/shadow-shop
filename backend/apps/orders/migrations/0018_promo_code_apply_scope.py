from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0013_performance_indexes'),
        ('orders', '0017_promo_codes'),
    ]

    operations = [
        migrations.AddField(
            model_name='promocode',
            name='apply_scope',
            field=models.CharField(
                choices=[
                    ('all_products', 'All Products'),
                    ('categories', 'Selected Categories'),
                    ('products', 'Selected Products'),
                    ('delivery', 'Delivery Fee'),
                    ('order', 'Products + Delivery'),
                ],
                default='all_products',
                max_length=30,
            ),
        ),
        migrations.AddField(
            model_name='promocode',
            name='target_categories',
            field=models.ManyToManyField(blank=True, related_name='promo_codes', to='products.category'),
        ),
        migrations.AddField(
            model_name='promocode',
            name='target_products',
            field=models.ManyToManyField(blank=True, related_name='promo_codes', to='products.product'),
        ),
    ]
