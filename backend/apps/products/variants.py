from decimal import Decimal

from rest_framework import serializers

from utils.image_optimization import card_variant_url
from .models import Product


class VariantInputSerializer(serializers.Serializer):
    size = serializers.CharField(max_length=40)
    color = serializers.CharField(max_length=60)
    sku = serializers.CharField(max_length=50, required=False, allow_blank=True)
    retail_price = serializers.DecimalField(
        max_digits=12, decimal_places=2, required=False, allow_null=True, min_value=Decimal('0.00'),
    )
    cost_price = serializers.DecimalField(
        max_digits=12, decimal_places=2, required=False, allow_null=True, min_value=Decimal('0.00'),
    )
    initial_stock = serializers.IntegerField(required=False, min_value=0, max_value=2147483647)
    is_active = serializers.BooleanField(required=False, default=True)

    def validate_size(self, value):
        size = ' '.join(value.split()).upper()
        if len(size) > 40:
            raise serializers.ValidationError('Use up to 40 characters for the size.')
        return size

    def validate_color(self, value):
        return ' '.join(value.split())


def combination(size, color):
    return size.casefold(), color.casefold()


def serialize_variants(product, request):
    staff = bool(request and request.user.is_authenticated and request.user.role != 'customer')
    rows = []
    color_labels = {}
    for variant in product.variants.all():
        if variant.variant_archived or (not staff and (not product.variants_enabled or not variant.is_active)):
            continue
        images = list(variant.images.all())
        primary = next((image for image in images if image.is_primary), None) or (images[0] if images else None)
        row = {
            'id': variant.pk,
            'size': variant.variant_size,
            'color': color_labels.setdefault(variant.variant_color.casefold(), variant.variant_color),
            'sku': variant.code,
            'name': variant.name,
            'retail_price': variant.retail_price,
            'current_stock': variant.current_stock,
            'is_available_for_sale': variant.is_available_for_sale,
            'is_active': variant.is_active,
            'image_url': card_variant_url(primary.image, request) if primary and primary.image else None,
        }
        if staff:
            row.update(
                retail_price_override=variant.variant_retail_price,
                cost_price_override=variant.variant_cost_price,
            )
        rows.append(row)
    return rows


def save_variants(parent, rows, generate_code, user):
    from apps.inventory.models import Stock, StockMovement
    from apps.inventory.services import add_stock

    variants = {combination(v.variant_size, v.variant_color): v for v in parent.variants.all()}
    if rows is not None:
        parent.variants.exclude(variant_archived=True).update(variant_archived=True)
    else:
        rows = [
            {
                'size': variant.variant_size,
                'color': variant.variant_color,
                'sku': variant.code,
                'retail_price': variant.variant_retail_price,
                'cost_price': variant.variant_cost_price,
                'is_active': variant.is_active,
            }
            for variant in variants.values() if not variant.variant_archived
        ]

    reserved_codes = {row['sku'].casefold() for row in rows if row.get('sku')}
    for row in rows:
        size, color = row['size'], row['color']
        variant = variants.get(combination(size, color))
        new = variant is None
        if new:
            variant = Product(variant_parent=parent, variant_color=color, variant_size=size)
        suffix = f' ({color} / {size})'
        variant.name = parent.name[:300 - len(suffix)] + suffix
        variant.code = row.get('sku') or variant.code or generate_code(reserved_codes)
        variant.variant_archived = False
        variant.is_active = row.get('is_active', variant.is_active)
        variant.variant_retail_price = row.get('retail_price', variant.variant_retail_price)
        variant.variant_cost_price = row.get('cost_price', variant.variant_cost_price)
        variant.retail_price = parent.retail_price if variant.variant_retail_price is None else variant.variant_retail_price
        variant.cost_price = parent.cost_price if variant.variant_cost_price is None else variant.variant_cost_price
        for field in ('store', 'category', 'brand', 'unit', 'weight', 'min_order_qty', 'wholesale_price', 'availability_status'):
            setattr(variant, field, getattr(parent, field))
        variant.save()

        if new:
            quantity = row.get('initial_stock', 0)
            if quantity:
                add_stock(variant, quantity, StockMovement.TYPE_STOCK_IN, notes='Initial variant stock', user=user)
            else:
                Stock.objects.get_or_create(product=variant)
