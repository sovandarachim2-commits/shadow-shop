from collections import defaultdict

from django.db import transaction
from rest_framework.exceptions import ValidationError

from .models import Stock, StockMovement, Warehouse, WarehouseStock


ORDER_VARIANT_MOVEMENTS = {'order', 'order_set', 'order_edit', 'order_return', 'order_set_return'}


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


def validate_variant_warehouse(product, warehouse):
    if warehouse is not None and warehouse.store_id != product.store_id:
        raise ValidationError({'warehouse': 'Choose a warehouse in the same store as the variant.'})


@transaction.atomic
def move_variant_stock(product, quantity, movement_type, reference='', reference_type='', notes='', user=None, warehouse=None):
    validate_variant_warehouse(product, warehouse)
    stock, _ = Stock.objects.select_for_update().get_or_create(product=product)
    before = stock.quantity
    deltas = defaultdict(int)
    order_movement = reference_type in ORDER_VARIANT_MOVEMENTS

    if quantity < 0:
        rows = WarehouseStock.objects.select_for_update().filter(product=product, warehouse__store_id=product.store_id)
        if warehouse is not None:
            rows = rows.filter(warehouse=warehouse)
        remaining = min(-quantity, max(0, before)) if order_movement else -quantity
        for row in rows.order_by('-warehouse__is_default', 'warehouse_id'):
            taken = min(remaining, row.quantity)
            if taken:
                row.quantity -= taken
                row.save(update_fields=['quantity'])
                deltas[row.warehouse_id] -= taken
                remaining -= taken
            if not remaining:
                break
        if remaining and not order_movement:
            raise ValidationError({'quantity': f'{product.code} has insufficient stock in the selected storage.'})
    elif quantity > 0:
        if order_movement:
            outstanding = defaultdict(int)
            order_moves = StockMovement.objects.filter(
                product=product, reference=reference,
                reference_type__in=ORDER_VARIANT_MOVEMENTS,
            )
            for move in order_moves:
                for warehouse_id, delta in move.warehouse_deltas.items():
                    outstanding[int(warehouse_id)] -= delta
            warehouses = Warehouse.objects.filter(pk__in=outstanding, store_id=product.store_id).in_bulk()
            for warehouse_id, outstanding_qty in outstanding.items():
                restored = min(quantity, outstanding_qty)
                if restored <= 0:
                    continue
                # Preserve the original allocation even if its warehouse has since been removed.
                target = warehouses.get(warehouse_id) or default_storage(product.store)
                adjust_storage(product, restored, target)
                deltas[warehouse_id] += restored
                quantity -= restored
        else:
            target = warehouse or default_storage(product.store)
            adjust_storage(product, quantity, target)
            deltas[target.pk] += quantity

    actual = sum(deltas.values())
    if actual:
        stock.quantity = before + actual
        stock.save(update_fields=['quantity', 'updated_at'])
    StockMovement.objects.create(
        product=product, type=movement_type, quantity=actual, before_qty=before, after_qty=stock.quantity,
        reference=reference, reference_type=reference_type, notes=notes, created_by=user, warehouse_deltas=dict(deltas),
    )
    return stock


@transaction.atomic
def deduct_stock_for_order(order, user):
    type(order).objects.select_for_update().get(pk=order.pk)
    if has_stock_deduction_for_order(order):
        return

    for item in order.items.select_related('product', 'product_set').prefetch_related('product_set__items__product').all():
        if item.product_set:
            set_items = item.product_set.items.select_related('product').all()
            for set_item in set_items:
                quantity_to_deduct = item.quantity * set_item.quantity
                if set_item.product.variant_parent_id:
                    move_variant_stock(set_item.product, -quantity_to_deduct, StockMovement.TYPE_STOCK_OUT,
                                       order.order_number, 'order_set', user=user)
                    continue
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
            if item.product.variant_parent_id:
                move_variant_stock(item.product, -item.quantity, StockMovement.TYPE_STOCK_OUT,
                                   order.order_number, 'order', user=user)
                continue
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


@transaction.atomic
def restore_stock_for_order(order, user, reason=''):
    """Restore stock deducted for an order upon return or cancellation."""
    type(order).objects.select_for_update().get(pk=order.pk)
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
                if set_item.product.variant_parent_id:
                    move_variant_stock(set_item.product, qty, StockMovement.TYPE_RETURN,
                                       order.order_number, 'order_set_return', notes=reason, user=user)
                    continue
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
            if item.product.variant_parent_id:
                move_variant_stock(item.product, qty, StockMovement.TYPE_RETURN,
                                   order.order_number, 'order_return', notes=reason, user=user)
                continue
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
    if product.variant_parent_id:
        return move_variant_stock(product, quantity, movement_type, reference, notes=notes, user=user, warehouse=warehouse)
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
        if item.product.variant_parent_id:
            validate_variant_warehouse(item.product, transfer.from_warehouse)
            validate_variant_warehouse(item.product, transfer.to_warehouse)
            if not transfer.from_warehouse_id or not transfer.to_warehouse_id or transfer.from_warehouse_id == transfer.to_warehouse_id:
                raise ValidationError({'detail': 'Choose different source and destination warehouses for a variant transfer.'})
            Stock.objects.select_for_update().get_or_create(product=item.product)
        if transfer.from_warehouse_id:
            source, _ = WarehouseStock.objects.select_for_update().get_or_create(
                warehouse_id=transfer.from_warehouse_id,
                product_id=item.product_id,
                defaults={'quantity': 0},
            )
            if item.product.variant_parent_id and qty > source.quantity:
                raise ValidationError({'detail': f'{item.product.code} only has {source.quantity} in the source warehouse.'})
            source.quantity = max(0, source.quantity - qty)
            source.save(update_fields=['quantity'])
        if transfer.to_warehouse_id:
            destination, _ = WarehouseStock.objects.select_for_update().get_or_create(
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
