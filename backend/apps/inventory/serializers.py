from rest_framework import serializers
from .models import Stock, StockMovement, Warehouse, StockTransfer, StockTransferItem


class StockSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_code = serializers.CharField(source='product.code', read_only=True)
    product_image = serializers.SerializerMethodField()
    is_low_stock = serializers.BooleanField(read_only=True)
    is_out_of_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = Stock
        fields = '__all__'

    def get_product_image(self, obj):
        img = obj.product.images.filter(is_primary=True).first()
        if img and img.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(img.image.url)
        return None


class StockMovementSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_code = serializers.CharField(source='product.code', read_only=True)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = StockMovement
        fields = '__all__'
        read_only_fields = ['before_qty', 'after_qty', 'created_at']

    def get_created_by_name(self, obj):
        return obj.created_by.get_full_name() if obj.created_by else 'System'


class StockMovementCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = StockMovement
        fields = ['type', 'product', 'quantity', 'reference', 'notes']

    def create(self, validated_data):
        from .services import add_stock
        product = validated_data['product']
        quantity = validated_data['quantity']
        movement_type = validated_data['type']
        user = self.context['request'].user

        actual_qty = quantity if movement_type in ['stock_in', 'return'] else -abs(quantity)

        stock = add_stock(
            product=product,
            quantity=actual_qty,
            movement_type=movement_type,
            reference=validated_data.get('reference', ''),
            notes=validated_data.get('notes', ''),
            user=user,
        )
        return stock.product.stock_movements.latest('created_at')


class WarehouseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Warehouse
        fields = '__all__'


class StockTransferItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)

    class Meta:
        model = StockTransferItem
        fields = '__all__'


class StockTransferSerializer(serializers.ModelSerializer):
    items = StockTransferItemSerializer(many=True, read_only=True)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = StockTransfer
        fields = '__all__'

    def get_created_by_name(self, obj):
        return obj.created_by.get_full_name() if obj.created_by else 'System'
