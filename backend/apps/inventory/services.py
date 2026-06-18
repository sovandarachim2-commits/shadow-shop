from .models import Stock, StockMovement


def deduct_stock_for_order(order, user):
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

            if stock.is_low_stock:
                from apps.notifications.services import TelegramService
                TelegramService().notify_low_stock(item.product, stock.quantity)


def add_stock(product, quantity, movement_type, reference='', notes='', user=None):
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
    return stock
