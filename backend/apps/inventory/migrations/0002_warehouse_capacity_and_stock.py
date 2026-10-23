from collections import defaultdict

from django.db import migrations, models
import django.db.models.deletion


def backfill_storage_stock(apps, schema_editor):
    StockTransferItem = apps.get_model('inventory', 'StockTransferItem')
    WarehouseStock = apps.get_model('inventory', 'WarehouseStock')
    balances = defaultdict(int)

    items = StockTransferItem.objects.filter(transfer__status='completed').select_related('transfer')
    for item in items:
        qty = item.actual_qty or item.requested_qty or 0
        if qty <= 0:
            continue
        transfer = item.transfer
        if transfer.from_warehouse_id:
            balances[(transfer.from_warehouse_id, item.product_id)] -= qty
        if transfer.to_warehouse_id:
            balances[(transfer.to_warehouse_id, item.product_id)] += qty

    WarehouseStock.objects.bulk_create([
        WarehouseStock(warehouse_id=warehouse_id, product_id=product_id, quantity=qty)
        for (warehouse_id, product_id), qty in balances.items()
        if qty > 0
    ])


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0001_initial'),
        ('products', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='warehouse',
            name='capacity',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.CreateModel(
            name='WarehouseStock',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('quantity', models.PositiveIntegerField(default=0)),
                ('product', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='warehouse_stocks', to='products.product')),
                ('warehouse', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='stocks', to='inventory.warehouse')),
            ],
            options={
                'db_table': 'warehouse_stocks',
                'unique_together': {('warehouse', 'product')},
            },
        ),
        migrations.RunPython(backfill_storage_stock, migrations.RunPython.noop),
    ]
