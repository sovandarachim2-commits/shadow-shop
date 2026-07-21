"""Batch flash-sale order stats to avoid N+1 aggregates on product lists."""
from collections import defaultdict

from apps.orders.models import OrderItem


def attach_flash_sale_stats(products):
    """Attach `_flash_sale_order_count` / `_flash_sale_quantity_sold` in one query."""
    products = list(products)
    for product in products:
        product._flash_sale_order_count = 0
        product._flash_sale_quantity_sold = 0

    active = [p for p in products if getattr(p, 'is_flash_sale_active', False)]
    if not active:
        return products

    by_id = {p.id: p for p in active}
    rows = (
        OrderItem.objects.filter(
            product_id__in=by_id.keys(),
            order__is_draft=False,
        )
        .exclude(order__status='cancelled')
        .values_list('product_id', 'order_id', 'quantity', 'unit_price', 'order__created_at')
    )

    order_ids = defaultdict(set)
    quantities = defaultdict(int)
    for product_id, order_id, quantity, unit_price, created_at in rows:
        product = by_id.get(product_id)
        if not product or unit_price != product.flash_sale_price:
            continue
        if product.flash_sale_starts_at and created_at < product.flash_sale_starts_at:
            continue
        if product.flash_sale_ends_at and created_at > product.flash_sale_ends_at:
            continue
        order_ids[product_id].add(order_id)
        quantities[product_id] += int(quantity or 0)

    for product in active:
        product._flash_sale_order_count = len(order_ids[product.id])
        product._flash_sale_quantity_sold = quantities[product.id]
    return products
