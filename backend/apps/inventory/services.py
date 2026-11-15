from .models import Stock, StockMovement, Warehouse, WarehouseStock


def has_stock_deduction_for_order(order):
    return StockMovement.objects.filter(
        reference=order.order_number,
        type=StockMovement.TYPE_STOCK_OUT,
        reference_type__in=['order', 'order_set'],
    ).exists()


def ensure_default_warehouse(store=None):
    """Ensure a default storage exists for the given store (or official store if store is None)."""
    qs = Warehouse.objects.filter(store=store) if store is not None else Warehouse.objects.filter(store__isnull=True)
    existing = qs.filter(is_default=True).first() or qs.filter(is_active=True).first() or qs.first()
    if existing:
        if not existing.is_default:
            existing.is_default = True
            existing.save(update_fields=['is_default'])
        return existing

    import uuid
    if store is not None:
        store_code = str(store.code or f"STR{store.id}").strip()
        base_code = f"{store_code[:12]}-ST01"
        code = base_code
        idx = 1
        while Warehouse.objects.filter(code=code).exists():
            idx += 1
            code = f"{store_code[:12]}-ST{idx:02d}"
        warehouse = Warehouse.objects.create(
            name=f"{store.name} Main Storage",
            code=code,
            address=store.address or '',
            is_active=True,
            is_default=True,
            capacity=0,
            store=store,
        )
    else:
        code = "ST01"
        idx = 1
        while Warehouse.objects.filter(code=code).exists():
            idx += 1
            code = f"ST{idx:02d}"
        warehouse = Warehouse.objects.create(
            name="Main Storage",
            code=code,
            address="",
            is_active=True,
            is_default=True,
            capacity=0,
            store=None,
        )

    assign_unassigned_stock_to_default(warehouse)
    return warehouse


def default_storage(store=None):
    return ensure_default_warehouse(store)


def adjust_storage(product, delta, warehouse=None):
    """Add or remove a product quantity in one storage."""
    if not product or not delta:
        return
    store = getattr(product, 'store', None)
    warehouse = warehouse or default_storage(store=store)
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
    stock_qs = Stock.objects.select_related('product').filter(quantity__gt=0)
    if warehouse.store_id:
        stock_qs = stock_qs.filter(product__store_id=warehouse.store_id)
    else:
        stock_qs = stock_qs.filter(product__store__isnull=True)

    for stock in stock_qs:
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
            stock.refresh_from_db()
            before_qty = stock.quantity
            stock.quantity = max(0, stock.quantity - item.quantity)
            stock.save()

            is_gift = getattr(item, 'is_free_gift', False)
            gift_label = f"free gift ({item.product.name})" if is_gift else "Order"
            StockMovement.objects.create(
                type=StockMovement.TYPE_STOCK_OUT,
                product=item.product,
                quantity=-item.quantity,
                before_qty=before_qty,
                after_qty=stock.quantity,
                reference=order.order_number,
                reference_type='order',
                notes=f"Stock deducted for {gift_label} in Order #{order.order_number}",
                created_by=user,
            )

            deduct_default_storage(item.product, item.quantity)

            if stock.is_low_stock:
                from apps.notifications.services import TelegramService
                TelegramService().notify_low_stock(item.product, stock.quantity)


def restore_stock_for_order(order, user, reason=''):
    """Restore stock deducted for an order upon return or cancellation."""
    if not has_stock_deduction_for_order(order):
        return

    already_returned = StockMovement.objects.filter(
        reference=order.order_number,
        type=StockMovement.TYPE_RETURN,
        reference_type__in=['order_return', 'order_set_return'],
    ).exists()
    if already_returned:
        return

    for item in order.items.select_related('product', 'product_set').prefetch_related('product_set__items__product').all():
        if item.product_set:
            for set_item in item.product_set.items.select_related('product').all():
                qty = item.quantity * set_item.quantity
                stock, _ = Stock.objects.get_or_create(product=set_item.product, defaults={'quantity': 0})
                before_qty = stock.quantity
                stock.quantity = stock.quantity + qty
                stock.save(update_fields=['quantity'])

                StockMovement.objects.create(
                    type=StockMovement.TYPE_RETURN,
                    product=set_item.product,
                    quantity=qty,
                    before_qty=before_qty,
                    after_qty=stock.quantity,
                    reference=order.order_number,
                    reference_type='order_set_return',
                    notes=f"Stock restored for returned set {item.product_set.name} in Order #{order.order_number}" + (f": {reason}" if reason else ""),
                    created_by=user,
                )
                adjust_storage(set_item.product, qty)
        elif item.product:
            qty = item.quantity
            stock, _ = Stock.objects.get_or_create(product=item.product, defaults={'quantity': 0})
            before_qty = stock.quantity
            stock.quantity = stock.quantity + qty
            stock.save(update_fields=['quantity'])

            StockMovement.objects.create(
                type=StockMovement.TYPE_RETURN,
                product=item.product,
                quantity=qty,
                before_qty=before_qty,
                after_qty=stock.quantity,
                reference=order.order_number,
                reference_type='order_return',
                notes=f"Stock restored for returned Order #{order.order_number}" + (f": {reason}" if reason else ""),
                created_by=user,
            )
            adjust_storage(item.product, qty)


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
    from_name = transfer.from_warehouse.name if transfer.from_warehouse_id else 'Storage'
    to_name = transfer.to_warehouse.name if transfer.to_warehouse_id else 'Storage'
    for item in transfer.items.select_related('product').all():
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
        record_transfer_movement(transfer, item, qty, from_name, to_name)


def record_transfer_movement(transfer, item, qty, from_name, to_name):
    """Add a transfer row to stock movements without changing shop stock."""
    if StockMovement.objects.filter(
        type=StockMovement.TYPE_TRANSFER,
        product_id=item.product_id,
        reference=transfer.transfer_number,
    ).exists():
        return
    stock = Stock.objects.filter(product_id=item.product_id).first()
    current = stock.quantity if stock else 0
    StockMovement.objects.create(
        type=StockMovement.TYPE_TRANSFER,
        product_id=item.product_id,
        quantity=qty,
        before_qty=current,
        after_qty=current,
        reference=transfer.transfer_number,
        reference_type='transfer',
        notes=f'{from_name} -> {to_name}',
        created_by=transfer.approved_by or transfer.created_by,
    )
