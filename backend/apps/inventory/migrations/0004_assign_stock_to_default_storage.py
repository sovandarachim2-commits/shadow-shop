from django.db import migrations
from django.db.models import Sum


def assign_stock(apps, schema_editor):
    Warehouse = apps.get_model('inventory', 'Warehouse')
    WarehouseStock = apps.get_model('inventory', 'WarehouseStock')
    Stock = apps.get_model('inventory', 'Stock')

    warehouse = Warehouse.objects.filter(is_default=True).first()
    if warehouse is None:
        warehouse = Warehouse.objects.filter(is_active=True).order_by('id').first()
        if warehouse is None:
            return
        warehouse.is_default = True
        warehouse.save(update_fields=['is_default'])

    for stock in Stock.objects.filter(quantity__gt=0):
        stored = WarehouseStock.objects.filter(product_id=stock.product_id).aggregate(total=Sum('quantity'))['total'] or 0
        gap = int(stock.quantity) - int(stored)
        if gap <= 0:
            continue
        row, _ = WarehouseStock.objects.get_or_create(
            warehouse_id=warehouse.id,
            product_id=stock.product_id,
            defaults={'quantity': 0},
        )
        row.quantity = int(row.quantity) + gap
        row.save(update_fields=['quantity'])


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0003_warehouse_is_default'),
    ]

    operations = [
        migrations.RunPython(assign_stock, migrations.RunPython.noop),
    ]
