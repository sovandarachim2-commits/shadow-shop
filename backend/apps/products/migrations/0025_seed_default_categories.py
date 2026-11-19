from django.db import migrations
from django.utils.text import slugify


DEFAULT_CATEGORY_NAMES = (
    'Automotive & Motorcycle',
    'Baby & Kids',
    'Beauty & Personal Care',
    'Books & Stationery',
    'Electronics & Technology',
    'Clothes',
    'Food & Grocery',
    'Gifts & Lifestyle',
    'Home & Living',
    'Jewelry & Accessories',
    'Pet Supplies',
    'Sports & Outdoors',
)


def seed_default_categories(apps, schema_editor):
    Category = apps.get_model('products', 'Category')
    categories = Category.objects.using(schema_editor.connection.alias)
    if categories.exists():
        return

    categories.bulk_create([
        Category(name=name, slug=slugify(name), order=order)
        for order, name in enumerate(DEFAULT_CATEGORY_NAMES)
    ])


class Migration(migrations.Migration):
    dependencies = [
        ('products', '0024_product_approval_status_product_approved_at_and_more'),
    ]

    operations = [
        migrations.RunPython(seed_default_categories, migrations.RunPython.noop, atomic=True),
    ]
