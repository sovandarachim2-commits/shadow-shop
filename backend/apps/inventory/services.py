from .models import Stock, StockMovement, Warehouse, WarehouseStock


def has_stock_deduction_for_order(order):
    return StockMovement.objects.filter(
        reference=order.order_number,
        type=StockMovement.TYPE_STOCK_OUT,
        reference_type__in=['order', 'order_set'],
    ).exists()


def default_storage():
    warehouse = Warehouse.objects.filter(is_default=True).first()
    if warehouse:
        return warehouse
    warehouse = Warehouse.objects.filter(is_active=True).order_by('id').first()
    if not warehouse:
        return None
    warehouse.is_default = True
    warehouse.save(update_fields=['is_default'])
    return warehouse


def adjust_storage(product, delta, warehouse=None):
    """Add or remove a product quantity in one storage."""
    if not product or not delta:
        return
    warehouse = warehouse or default_storage()
    if not warehouse:
        return
    row, _ = WarehouseStock.objects.get_or_create(
        warehouse=warehouse,
        product=product,
        defaults={'quantity': 0},
    )
    row.quantity = max(0, int(row.quantity) + int(delta))
    row.save(update_fields=['quantity'])


def adjust_default_storage(product, delta):
    """Keep new stock in the default storage until it is transferred."""
    adjust_storage(product, delta)


def deduct_default_storage(product, quantity):
    """Reduce the print default storage by the same quantity as shop stock."""
    adjust_default_storage(product, -int(quantity or 0))


def assign_unassigned_stock_to_default(warehouse=None):
    """Put shop stock that is not already in a storage into the default storage."""
    from django.db.models import Sum

    warehouse = warehouse or default_storage()
    if not warehouse:
        return
    for stock in Stock.objects.select_related('product').filter(quantity__gt=0):
        stored = WarehouseStock.objects.filter(product=stock.product).aggregate(total=Sum('quantity'))['total'] or 0
        gap = int(stock.quantity) - int(stored)
        if gap <= 0:
            continue
        row, _ = WarehouseStock.objects.get_or_create(
            warehouse=warehouse,
            product=stock.product,
            defaults={'quantity': 0},
        )
        row.quantity = int(row.quantity) + gap
        row.save(update_fields=['quantity'])


def deduct_stock_for_order(order, user):
    if has_stock_deduction_for_order(order):
        return

    for item in order.items.select_related('product', 'product_set').prefetch_related('product_set__items__product').all():
        if item.product_set:
            set_items = item.product_set.items.select_related('product').all()
            for set_item in set_items:
                quantity_to_deduct = item.quantity * set_item.quantity
                stock, _ = Stock.objects.get_or_create(
                    product=set_item.product,
                    defaults={'quantity': 0}
                )
                before_qty = stock.quantity
                stock.quantity = max(0, stock.quantity - quantity_to_deduct)
                stock.save()

                StockMovement.objects.create(
                    type=StockMovement.TYPE_STOCK_OUT,
                    product=set_item.product,
                    quantity=-quantity_to_deduct,
                    before_qty=before_qty,
                    after_qty=stock.quantity,
                    reference=order.order_number,
                    reference_type='order_set',
                    notes=f"Stock deducted for set {item.product_set.name} in Order #{order.order_number}",
                    created_by=user,
                )

                deduct_default_storage(set_item.product, quantity_to_deduct)

                if stock.is_low_stock:
                    from apps.notifications.services import TelegramService
                    TelegramService().notify_low_stock(set_item.product, stock.quantity)
        elif item.product:
            stock, _ = Stock.objects.get_or_create(
                product=item.product,
                defaults={'quantity': 0}
            )
            before_qty = stock.quantity
            stock.quantity = max(0, stock.quantity - item.quantity)
            stock.save()

            StockMovement.objects.create(
                type=StockMovement.TYPE_STOCK_OUT,
                product=item.product,
                quantity=-item.quantity,
                before_qty=before_qty,
                after_qty=stock.quantity,
                reference=order.order_number,
                reference_type='order',
                notes=f"Stock deducted for Order #{order.order_number}",
                created_by=user,
            )

            deduct_default_storage(item.product, item.quantity)

            if stock.is_low_stock:
                from apps.notifications.services import TelegramService
                TelegramService().notify_low_stock(item.product, stock.quantity)


def add_stock(product, quantity, movement_type, reference='', notes='', user=None, warehouse=None):
    stock, _ = Stock.objects.get_or_create(
        product=product,
        defaults={'quantity': 0}
    )
    before_qty = stock.quantity
    stock.quantity += quantity
    stock.save()

    StockMovement.objects.create(
        type=movement_type,
        product=product,
        quantity=quantity,
        before_qty=before_qty,
        after_qty=stock.quantity,
        reference=reference,
        notes=notes,
        created_by=user,
    )
    adjust_storage(product, quantity, warehouse)
    return stock


def apply_transfer_to_storage(transfer):
    """Move completed transfer quantities between storage locations."""
    for item in transfer.items.all():
        qty = item.actual_qty or item.requested_qty or 0
        if qty <= 0:
            continue
        if transfer.from_warehouse_id:
            source, _ = WarehouseStock.objects.get_or_create(
                warehouse_id=transfer.from_warehouse_id,
                product_id=item.product_id,
                defaults={'quantity': 0},
            )
            source.quantity = max(0, source.quantity - qty)
            source.save(update_fields=['quantity'])
        if transfer.to_warehouse_id:
            destination, _ = WarehouseStock.objects.get_or_create(
                warehouse_id=transfer.to_warehouse_id,
                product_id=item.product_id,
                defaults={'quantity': 0},
            )
            destination.quantity += qty
            destination.save(update_fields=['quantity'])
