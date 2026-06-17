from rest_framework import serializers
from .models import Customer, Order, OrderItem, OrderStatusHistory, Wishlist, CartItem, PrepareRecord, OutRecord


def resolve_product_image_url(product, request=None):
    if not product:
        return ''
    img = product.images.filter(is_primary=True).first() or product.images.first()
    if img and img.image:
        if request:
            return request.build_absolute_uri(img.image.url)
        return img.image.url
    return ''


def first_order_item_image(order, request=None):
    first = order.items.first()
    if not first:
        return None
    if first.product_image:
        return first.product_image
    return resolve_product_image_url(first.product, request) or None


def display_seller_name(order):
    seller = order.seller
    if not seller:
        return 'N/A'
    if seller.role == 'customer':
        from apps.accounts.models import SiteSettings
        return SiteSettings.get_solo().store_name or 'Shadow Shop'
    return seller.get_full_name() or seller.username


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = '__all__'
        read_only_fields = ['total_orders', 'total_spent', 'created_at', 'updated_at']


class OrderItemSerializer(serializers.ModelSerializer):
    product_image = serializers.SerializerMethodField()
    subtotal = serializers.DecimalField(source='total_price', max_digits=15, decimal_places=2, read_only=True)

    class Meta:
        model = OrderItem
        fields = [
            'id', 'product', 'product_name', 'product_code', 'product_image',
            'quantity', 'unit_price', 'cost_price', 'discount', 'total_price', 'subtotal',
        ]
        read_only_fields = ['total_price', 'subtotal']

    def get_product_image(self, obj):
        if obj.product_image:
            return obj.product_image
        return resolve_product_image_url(obj.product, self.context.get('request')) or None


class OrderItemWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ['product', 'quantity', 'unit_price', 'cost_price', 'discount']


class OrderStatusHistorySerializer(serializers.ModelSerializer):
    changed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = OrderStatusHistory
        fields = '__all__'

    def get_changed_by_name(self, obj):
        return obj.changed_by.get_full_name() if obj.changed_by else 'System'


class OrderListSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    customer_phone = serializers.CharField(source='customer.phone', read_only=True)
    seller_name = serializers.SerializerMethodField()
    items_count = serializers.SerializerMethodField()
    preview_image = serializers.SerializerMethodField()
    preview_name = serializers.SerializerMethodField()
    items_preview = serializers.SerializerMethodField()
    printed_by_name = serializers.SerializerMethodField()
    payment_status = serializers.SerializerMethodField()
    status_changed_by_name = serializers.SerializerMethodField()
    status_changed_at = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'customer', 'customer_name', 'customer_phone',
            'seller', 'seller_name', 'status', 'payment_status', 'payment_method',
            'grand_total', 'items_count', 'preview_image', 'preview_name',
            'items_preview', 'is_draft', 'printed_at', 'printed_by_name', 'created_at',
            'updated_at', 'status_changed_by_name', 'status_changed_at',
            'prepare_invoice_photo', 'prepare_package_photo',
            'out_invoice_photo', 'out_package_photo', 'out_delivery_by',
        ]

    def get_seller_name(self, obj):
        return display_seller_name(obj)

    def get_items_count(self, obj):
        return obj.items.count()

    def get_preview_image(self, obj):
        return first_order_item_image(obj, self.context.get('request'))

    def get_preview_name(self, obj):
        first = obj.items.first()
        return first.product_name if first else None

    def get_items_preview(self, obj):
        return [
            {
                'id': item.id,
                'product_name': item.product_name,
                'quantity': item.quantity,
            }
            for item in obj.items.all()
        ]

    def get_printed_by_name(self, obj):
        if not obj.printed_by:
            return '-'
        return obj.printed_by.get_full_name() or obj.printed_by.username

    def get_payment_status(self, obj):
        bakong_payment = getattr(obj, 'bakong_payment', None)
        aba_payment = getattr(obj, 'aba_payment', None)
        if bakong_payment and bakong_payment.status == 'paid':
            return 'paid'
        if aba_payment and aba_payment.status == 'paid':
            return 'paid'
        return obj.payment_status

    def _latest_current_status_history(self, obj):
        history = getattr(obj, 'status_history', None)
        if history is None:
            return None
        for item in history.all():
            if item.status == obj.status:
                return item
        return None

    def get_status_changed_by_name(self, obj):
        history = self._latest_current_status_history(obj)
        if not history or not history.changed_by:
            return '-'
        return history.changed_by.get_full_name() or history.changed_by.username

    def get_status_changed_at(self, obj):
        history = self._latest_current_status_history(obj)
        return history.created_at if history else obj.updated_at


class OrderDetailSerializer(serializers.ModelSerializer):
    customer_detail = CustomerSerializer(source='customer', read_only=True)
    items = OrderItemSerializer(many=True, read_only=True)
    status_history = OrderStatusHistorySerializer(many=True, read_only=True)
    seller_name = serializers.SerializerMethodField()
    profit = serializers.SerializerMethodField()
    payment_status = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = '__all__'

    def get_seller_name(self, obj):
        return display_seller_name(obj)

    def get_profit(self, obj):
        return float(obj.profit)

    def get_payment_status(self, obj):
        bakong_payment = getattr(obj, 'bakong_payment', None)
        aba_payment = getattr(obj, 'aba_payment', None)
        if bakong_payment and bakong_payment.status == 'paid':
            return 'paid'
        if aba_payment and aba_payment.status == 'paid':
            return 'paid'
        return obj.payment_status


class PrepareRecordSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = PrepareRecord
        fields = '__all__'
        read_only_fields = ['created_by', 'created_at', 'updated_at']

    def get_created_by_name(self, obj):
        if not obj.created_by:
            return '-'
        return obj.created_by.get_full_name() or obj.created_by.username


class OutRecordSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = OutRecord
        fields = '__all__'
        read_only_fields = ['created_by', 'created_at', 'updated_at']

    def get_created_by_name(self, obj):
        if not obj.created_by:
            return '-'
        return obj.created_by.get_full_name() or obj.created_by.username


class OrderCreateSerializer(serializers.ModelSerializer):
    items = OrderItemWriteSerializer(many=True)

    class Meta:
        model = Order
        fields = [
            'customer', 'payment_method', 'payment_status', 'delivery_fee',
            'discount', 'notes', 'is_draft', 'items',
        ]

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        request = self.context['request']
        validated_data['seller'] = request.user
        order = Order.objects.create(**validated_data)

        subtotal = 0
        for item_data in items_data:
            product = item_data['product']
            item_data['product_name'] = product.name
            item_data['product_code'] = product.code
            cost_price = item_data.get('cost_price', product.cost_price)
            item_data['cost_price'] = cost_price
            item_data['product_image'] = resolve_product_image_url(product, request)
            item = OrderItem.objects.create(order=order, **item_data)
            subtotal += item.total_price

        order.subtotal = subtotal
        order.grand_total = subtotal + order.delivery_fee - order.discount
        order.save()

        OrderStatusHistory.objects.create(
            order=order,
            status=order.status,
            changed_by=request.user,
            note='Order created',
        )

        from django.db import transaction
        from apps.notifications.services import TelegramService
        transaction.on_commit(lambda: TelegramService.notify_new_order_async(order.id))

        from apps.inventory.services import deduct_stock_for_order
        if not order.is_draft:
            deduct_stock_for_order(order, request.user)

        return order


class CustomerCheckoutSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=200)
    phone = serializers.CharField(max_length=20)
    email = serializers.EmailField(required=False, allow_blank=True, default='')
    address = serializers.CharField()
    province = serializers.CharField(max_length=50)
    district = serializers.CharField(required=False, allow_blank=True, default='')
    notes = serializers.CharField(required=False, allow_blank=True, default='')
    payment_method = serializers.ChoiceField(choices=[c[0] for c in Order.PAYMENT_METHOD_CHOICES])
    payment_status = serializers.ChoiceField(
        choices=[c[0] for c in Order.PAYMENT_STATUS_CHOICES],
        default='unpaid',
    )
    delivery_fee = serializers.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount = serializers.DecimalField(max_digits=10, decimal_places=2, default=0)
    items = OrderItemWriteSerializer(many=True)

    def create(self, validated_data):
        request = self.context['request']
        user = request.user
        items_data = validated_data.pop('items')

        customer_defaults = {
            'name': validated_data.pop('name'),
            'phone': validated_data.pop('phone'),
            'email': validated_data.pop('email', ''),
            'address': validated_data.pop('address'),
            'province': validated_data.pop('province'),
        }
        validated_data.pop('district', None)

        customer, created = Customer.objects.get_or_create(
            user=user,
            defaults={**customer_defaults, 'created_by': user},
        )
        if not created:
            for key, value in customer_defaults.items():
                setattr(customer, key, value)
            customer.save()

        order_notes = validated_data.pop('notes', '')
        order = Order.objects.create(
            customer=customer,
            seller=user,
            payment_method=validated_data['payment_method'],
            payment_status=validated_data.get('payment_status', 'unpaid'),
            delivery_fee=validated_data['delivery_fee'],
            discount=validated_data.get('discount', 0),
            notes=order_notes,
        )

        subtotal = 0
        for item_data in items_data:
            product = item_data['product']
            item_data['product_name'] = product.name
            item_data['product_code'] = product.code
            cost_price = item_data.get('cost_price', product.cost_price)
            item_data['cost_price'] = cost_price
            item_data['product_image'] = resolve_product_image_url(product, request)
            item = OrderItem.objects.create(order=order, **item_data)
            subtotal += item.total_price

        order.subtotal = subtotal
        order.grand_total = subtotal + order.delivery_fee - order.discount
        order.save()

        OrderStatusHistory.objects.create(
            order=order,
            status=order.status,
            changed_by=user,
            note='Order placed online',
        )

        from django.db import transaction
        from apps.notifications.services import TelegramService
        transaction.on_commit(lambda: TelegramService.notify_new_order_async(order.id))

        from apps.inventory.services import deduct_stock_for_order
        deduct_stock_for_order(order, user)

        customer.total_orders = customer.orders.count()
        customer.total_spent = sum(o.grand_total for o in customer.orders.all())
        customer.save(update_fields=['total_orders', 'total_spent'])

        return order


class WishlistSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_price = serializers.DecimalField(
        source='product.retail_price', max_digits=12, decimal_places=2, read_only=True
    )
    product_image = serializers.SerializerMethodField()

    class Meta:
        model = Wishlist
        fields = ['id', 'product', 'product_name', 'product_price', 'product_image', 'created_at']

    def get_product_image(self, obj):
        img = obj.product.images.filter(is_primary=True).first()
        if img and img.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(img.image.url)
        return None


class CartItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_price = serializers.DecimalField(
        source='product.retail_price', max_digits=12, decimal_places=2, read_only=True
    )
    product_image = serializers.SerializerMethodField()
    product_code = serializers.CharField(source='product.code', read_only=True)
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = [
            'id', 'product', 'product_name', 'product_code',
            'product_price', 'product_image', 'quantity', 'subtotal', 'updated_at',
        ]

    def get_product_image(self, obj):
        img = obj.product.images.filter(is_primary=True).first()
        if img and img.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(img.image.url)
        return None

    def get_subtotal(self, obj):
        return float(obj.product.retail_price * obj.quantity)
