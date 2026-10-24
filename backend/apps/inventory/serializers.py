from django.db.models import Sum
from rest_framework import serializers
from apps.products.models import Product
from .models import Stock, StockMovement, Warehouse, WarehouseStock, StockTransfer, StockTransferItem


class StockSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_code = serializers.CharField(source='product.code', read_only=True)
    product_image = serializers.SerializerMethodField()
    inventories = serializers.SerializerMethodField()
    is_low_stock = serializers.BooleanField(read_only=True)
    is_out_of_stock = serializers.BooleanField(read_only=True)
    sold_qty = serializers.SerializerMethodField()
    category_name = serializers.SerializerMethodField()

    class Meta:
        model = Stock
        fields = '__all__'

    def get_category_name(self, obj):
        category = getattr(obj.product, 'category', None)
        return category.name if category else ''

    def get_sold_qty(self, obj):
        annotated = obj.__dict__.get('sold_qty')
        if annotated is not None:
            return annotated
        from apps.orders.models import OrderItem
        total = OrderItem.objects.filter(
            product_id=obj.product_id,
            order__is_draft=False,
            order__status__in=['new', 'confirmed', 'printed', 'preparing', 'packed', 'shipped', 'completed'],
        ).aggregate(total=Sum('quantity'))['total']
        return total or 0

    def get_product_image(self, obj):
        img = obj.product.images.filter(is_primary=True).first()
        if img and img.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(img.image.url)
        return None

    def get_inventories(self, obj):
        rows = obj.product.warehouse_stocks.all()
        return [
            {'name': row.warehouse.name, 'quantity': row.quantity}
            for row in rows
            if row.quantity > 0
        ]


class StockMovementSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_code = serializers.CharField(source='product.code', read_only=True)
    inventories = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = StockMovement
        fields = '__all__'
        read_only_fields = ['before_qty', 'after_qty', 'created_at']

    def get_inventories(self, obj):
        rows = obj.product.warehouse_stocks.all()
        return [
            {'name': row.warehouse.name, 'quantity': row.quantity}
            for row in rows
            if row.quantity > 0
        ]

    def get_created_by_name(self, obj):
        return obj.created_by.get_full_name() if obj.created_by else 'System'


class StockMovementCreateSerializer(serializers.ModelSerializer):
    warehouse = serializers.PrimaryKeyRelatedField(
        queryset=Warehouse.objects.all(),
        required=False,
        allow_null=True,
        write_only=True,
    )

    class Meta:
        model = StockMovement
        fields = ['type', 'product', 'quantity', 'reference', 'notes', 'warehouse']

    def create(self, validated_data):
        from .services import add_stock
        product = validated_data['product']
        quantity = validated_data['quantity']
        movement_type = validated_data['type']
        warehouse = validated_data.get('warehouse')
        user = self.context['request'].user

        actual_qty = quantity if movement_type in ['stock_in', 'return'] else -abs(quantity)

        stock = add_stock(
            product=product,
            quantity=actual_qty,
            movement_type=movement_type,
            reference=validated_data.get('reference', ''),
            notes=validated_data.get('notes', ''),
            user=user,
            warehouse=warehouse,
        )
        movement = stock.product.stock_movements.latest('created_at')
        from apps.accounts.activity import log_activity
        log_activity(
            user=user,
            action='create',
            module='inventory',
            description=f'{movement_type.replace("_", " ").title()} for {product.name} ({actual_qty:+d})',
            request=self.context.get('request'),
            object_id=product.pk,
            object_type='Stock',
        )
        return movement


class WarehouseSerializer(serializers.ModelSerializer):
    product_count = serializers.SerializerMethodField()
    total_quantity = serializers.SerializerMethodField()
    stock_levels = serializers.SerializerMethodField()

    class Meta:
        model = Warehouse
        fields = '__all__'

    def get_stock_levels(self, obj):
        stocks = obj.stocks.all()
        return [
            {'product': row.product_id, 'quantity': row.quantity}
            for row in stocks
            if row.quantity > 0
        ]

    def _assign_default_stock(self, warehouse):
        if warehouse.is_default:
            from .services import assign_unassigned_stock_to_default
            assign_unassigned_stock_to_default(warehouse)

    def create(self, validated_data):
        warehouse = super().create(validated_data)
        self._assign_default_stock(warehouse)
        return warehouse

    def update(self, instance, validated_data):
        warehouse = super().update(instance, validated_data)
        self._assign_default_stock(warehouse)
        return warehouse

    def get_product_count(self, obj):
        annotated = getattr(obj, 'product_count', None)
        if annotated is not None:
            return annotated
        return obj.stocks.filter(quantity__gt=0).count()

    def get_total_quantity(self, obj):
        annotated = getattr(obj, 'total_quantity', None)
        if annotated is not None:
            return annotated
        return obj.stocks.aggregate(total=Sum('quantity')).get('total') or 0


class StockTransferItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_code = serializers.CharField(source='product.code', read_only=True)

    class Meta:
        model = StockTransferItem
        fields = '__all__'


class StockTransferItemWriteSerializer(serializers.Serializer):
    product = serializers.PrimaryKeyRelatedField(queryset=Product.objects.select_related('stock'))
    requested_qty = serializers.IntegerField(min_value=1)


class StockTransferSerializer(serializers.ModelSerializer):
    items = StockTransferItemSerializer(many=True, read_only=True)
    items_input = StockTransferItemWriteSerializer(many=True, write_only=True, required=False)
    created_by_name = serializers.SerializerMethodField()
    from_warehouse_name = serializers.CharField(source='from_warehouse.name', read_only=True)
    to_warehouse_name = serializers.CharField(source='to_warehouse.name', read_only=True)

    class Meta:
        model = StockTransfer
        fields = '__all__'
        read_only_fields = [
            'transfer_number',
            'status',
            'created_by',
            'approved_by',
            'completed_at',
            'created_at',
            'updated_at',
        ]

    def get_created_by_name(self, obj):
        return obj.created_by.get_full_name() if obj.created_by else 'System'

    def validate(self, attrs):
        items = attrs.get('items_input')
        if self.instance is None:
            items = items or []
            if not items:
                raise serializers.ValidationError({'detail': 'Add at least one product.'})
        if items:
            seen = set()
            for item in items:
                product = item['product']
                product_id = product.pk
                if product_id in seen:
                    raise serializers.ValidationError({'detail': f'{product.name} is listed more than once.'})
                seen.add(product_id)
                source = attrs.get('from_warehouse') or getattr(self.instance, 'from_warehouse', None)
                stored = WarehouseStock.objects.filter(warehouse=source, product=product).first() if source else None
                available = int(stored.quantity) if stored else 0
                if item['requested_qty'] > available:
                    raise serializers.ValidationError({
                        'detail': f'{product.name} only has {available} in the source storage.',
                    })
        return attrs

    def create(self, validated_data):
        items = validated_data.pop('items_input', [])
        transfer = super().create(validated_data)
        StockTransferItem.objects.bulk_create([
            StockTransferItem(
                transfer=transfer,
                product=item['product'],
                requested_qty=item['requested_qty'],
                actual_qty=item['requested_qty'],
            )
            for item in items
        ])
        return transfer
