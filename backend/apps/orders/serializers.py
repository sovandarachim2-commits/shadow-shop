from rest_framework import serializers
from django.db import transaction
from .models import (
    Customer, Order, OrderItem, OrderStatusHistory, Wishlist, CartItem, PrepareRecord, OutRecord,
    RewardItem, RewardRedemption, RewardSettings, PointTransaction,
)
from apps.products.models import Product, ProductSet


def resolve_product_image_url(product, request=None):
    if not product:
        return ''
    img = product.images.filter(is_primary=True).first() or product.images.first()
    if img and img.image:
        if request and hasattr(request, 'build_absolute_uri'):
            return request.build_absolute_uri(img.image.url)
        return img.image.url
    return ''


def resolve_product_set_image_url(product_set, request=None):
    if not product_set or not product_set.image:
        return ''
    if request and hasattr(request, 'build_absolute_uri'):
        return request.build_absolute_uri(product_set.image.url)
    return product_set.image.url


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


def validate_flash_sale_max_quantities(requested):
    errors = []
    for product, quantity in requested.items():
        max_qty = getattr(product, 'flash_sale_max_order_qty', None)
        if product.is_flash_sale_active and max_qty and quantity > max_qty:
            errors.append(f'{product.name} flash sale maximum order quantity is {max_qty}.')
    return errors


def get_product_set_stock(product_set):
    items = list(product_set.items.select_related('product', 'product__stock').all())
    if not items:
        return 0

    available_sets = []
    for item in items:
        if not item.product.is_available_for_sale:
            return 0
        if item.product.availability_status == Product.AVAILABILITY_AVAILABLE:
            continue
        required_qty = max(1, int(item.quantity or 1))
        try:
            product_stock = int(item.product.stock.quantity or 0)
        except Exception:
            product_stock = 0
        available_sets.append(product_stock // required_qty)

    return min(available_sets) if available_sets else 999999


def aggregate_order_targets(items):
    product_totals = {}
    set_totals = {}
    for item in items:
        quantity = int(item.get('quantity') or 0)
        product = item.get('product')
        product_set = item.get('product_set')
        if product:
            product_totals[product] = product_totals.get(product, 0) + quantity
        elif product_set:
            set_totals[product_set] = set_totals.get(product_set, 0) + quantity
    return product_totals, set_totals


def expand_set_component_totals(set_totals):
    component_totals = {}
    for product_set, set_quantity in set_totals.items():
        for set_item in product_set.items.select_related('product').all():
            component_totals[set_item.product] = (
                component_totals.get(set_item.product, 0)
                + int(set_quantity or 0) * int(set_item.quantity or 1)
            )
    return component_totals


def validate_order_target_stock(items, old_product_totals=None, old_set_totals=None):
    old_product_totals = old_product_totals or {}
    old_set_totals = old_set_totals or {}
    requested_products, requested_sets = aggregate_order_targets(items)

    errors = []
    requested_components = expand_set_component_totals(requested_sets)
    old_components = expand_set_component_totals(old_set_totals)
    combined_products = set(requested_products) | set(requested_components)

    for product in combined_products:
        quantity = requested_products.get(product, 0) + requested_components.get(product, 0)
        if not product.is_available_for_sale:
            errors.append(f'{product.name} is out of stock.')
            continue
        if product.availability_status == Product.AVAILABILITY_AVAILABLE:
            continue
        available = product.current_stock + old_product_totals.get(product, 0) + old_components.get(product, 0)
        if quantity > available:
            errors.append(f'{product.name} has only {available} in stock.')
    errors.extend(validate_flash_sale_max_quantities(requested_products))

    for product_set, quantity in requested_sets.items():
        available = get_product_set_stock(product_set) + old_set_totals.get(product_set, 0)
        if quantity > available:
            errors.append(f'{product_set.name} has only {available} sets in stock.')
        max_qty = getattr(product_set, 'flash_sale_max_order_qty', None)
        if product_set.is_flash_sale_active and max_qty and quantity > max_qty:
            errors.append(f'{product_set.name} flash sale maximum order quantity is {max_qty}.')

    return errors


def apply_order_item_snapshot(item_data, request=None):
    product = item_data.get('product')
    product_set = item_data.get('product_set')
    if product:
        item_data['product_name'] = product.name
        item_data['product_code'] = product.code
        item_data['cost_price'] = item_data.get('cost_price', product.cost_price)
        item_data['product_image'] = resolve_product_image_url(product, request)
    else:
        item_data['product_name'] = product_set.name
        item_data['product_code'] = f'SET-{product_set.id}'
        item_data['cost_price'] = item_data.get('cost_price') or 0
        item_data['product_image'] = resolve_product_set_image_url(product_set, request)
    return item_data


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
            'id', 'product', 'product_set', 'product_name', 'product_code', 'product_image',
            'quantity', 'unit_price', 'cost_price', 'discount', 'total_price', 'subtotal',
        ]
        read_only_fields = ['total_price', 'subtotal']

    def get_product_image(self, obj):
        if obj.product_image:
            return obj.product_image
        if obj.product_set:
            return resolve_product_set_image_url(obj.product_set, self.context.get('request')) or None
        return resolve_product_image_url(obj.product, self.context.get('request')) or None


class OrderItemWriteSerializer(serializers.ModelSerializer):
    product = serializers.PrimaryKeyRelatedField(queryset=Product.objects.all(), required=False, allow_null=True)
    product_set = serializers.PrimaryKeyRelatedField(queryset=ProductSet.objects.all(), required=False, allow_null=True)

    class Meta:
        model = OrderItem
        fields = ['product', 'product_set', 'quantity', 'unit_price', 'cost_price', 'discount']

    def validate(self, attrs):
        if bool(attrs.get('product')) == bool(attrs.get('product_set')):
            raise serializers.ValidationError('Provide either product or product_set.')
        return attrs


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
    prepared_at = serializers.SerializerMethodField()
    out_at = serializers.SerializerMethodField()
    delivery_by = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'customer', 'customer_name', 'customer_phone',
            'seller', 'seller_name', 'status', 'payment_status', 'payment_method',
            'grand_total', 'items_count', 'preview_image', 'preview_name',
            'items_preview', 'is_draft', 'printed_at', 'printed_by_name', 'created_at',
            'updated_at', 'status_changed_by_name', 'status_changed_at',
            'prepared_at', 'out_at',
            'prepare_invoice_photo', 'prepare_package_photo',
            'out_invoice_photo', 'out_package_photo', 'out_delivery_by', 'delivery_by',
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
                'product_code': item.product_code,
                'product_image': item.product_image or (
                    resolve_product_set_image_url(item.product_set, self.context.get('request'))
                    if item.product_set
                    else resolve_product_image_url(item.product, self.context.get('request'))
                ),
                'quantity': item.quantity,
                'unit_price': item.unit_price,
                'total_price': item.total_price,
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

    def get_prepared_at(self, obj):
        for item in obj.status_history.all():
            if item.status == Order.STATUS_PREPARING:
                return item.created_at
        return None

    def get_out_at(self, obj):
        for item in obj.status_history.all():
            if item.status == Order.STATUS_SHIPPED:
                return item.created_at
        return None

    def get_delivery_by(self, obj):
        if obj.out_delivery_by:
            return obj.out_delivery_by
        out_record = OutRecord.objects.filter(code=obj.order_number).only('delivery_by').first()
        return out_record.delivery_by if out_record else ''


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

    def validate(self, attrs):
        errors = validate_order_target_stock(attrs.get('items', []))
        if errors:
            raise serializers.ValidationError({'items': errors})
        return attrs

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        request = self.context['request']
        validated_data['seller'] = request.user
        order = Order.objects.create(**validated_data)

        subtotal = 0
        for item_data in items_data:
            apply_order_item_snapshot(item_data, request)
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

        return order


class OrderAdminUpdateSerializer(serializers.Serializer):
    customer_info = serializers.DictField(required=False)
    payment_method = serializers.ChoiceField(choices=[c[0] for c in Order.PAYMENT_METHOD_CHOICES], required=False, allow_blank=True)
    payment_status = serializers.ChoiceField(choices=[c[0] for c in Order.PAYMENT_STATUS_CHOICES], required=False)
    delivery_fee = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    discount = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    notes = serializers.CharField(required=False, allow_blank=True)
    is_draft = serializers.BooleanField(required=False)
    items = OrderItemWriteSerializer(many=True, required=False)

    def _aggregate_items(self, items):
        return aggregate_order_targets(items)

    def validate(self, attrs):
        order = self.instance
        items = attrs.get('items')
        if items is None:
            return attrs

        old_product_totals = {}
        old_set_totals = {}
        from apps.inventory.services import has_stock_deduction_for_order
        stock_already_deducted = has_stock_deduction_for_order(order)

        if stock_already_deducted:
            for item in order.items.select_related('product', 'product_set').all():
                if item.product:
                    old_product_totals[item.product] = old_product_totals.get(item.product, 0) + item.quantity
                elif item.product_set:
                    old_set_totals[item.product_set] = old_set_totals.get(item.product_set, 0) + item.quantity

        errors = validate_order_target_stock(items, old_product_totals, old_set_totals)
        if errors:
            raise serializers.ValidationError({'items': errors})
        return attrs

    def _adjust_stock(self, order, old_totals, new_totals, user):
        from apps.inventory.models import Stock, StockMovement

        products = set(old_totals.keys()) | set(new_totals.keys())
        for product in products:
            if product.availability_status == Product.AVAILABILITY_AVAILABLE:
                continue
            delta = new_totals.get(product, 0) - old_totals.get(product, 0)
            if delta == 0:
                continue

            stock, _ = Stock.objects.get_or_create(product=product, defaults={'quantity': 0})
            before_qty = stock.quantity
            movement_type = StockMovement.TYPE_STOCK_OUT if delta > 0 else StockMovement.TYPE_RETURN
            movement_qty = -delta if delta > 0 else abs(delta)
            stock.quantity = stock.quantity + movement_qty
            stock.save()

            StockMovement.objects.create(
                type=movement_type,
                product=product,
                quantity=movement_qty,
                before_qty=before_qty,
                after_qty=stock.quantity,
                reference=order.order_number,
                reference_type='order_edit',
                notes=f'Stock adjusted for edited Order #{order.order_number}',
                created_by=user,
            )

    def update(self, order, validated_data):
        from django.db import transaction

        request = self.context['request']
        items_data = validated_data.pop('items', None)
        customer_info = validated_data.pop('customer_info', None)

        with transaction.atomic():
            if customer_info:
                for field in ['name', 'phone', 'email', 'address', 'province', 'notes']:
                    if field in customer_info:
                        setattr(order.customer, field, customer_info[field] or '')
                order.customer.save()

            from apps.inventory.services import has_stock_deduction_for_order

            stock_already_deducted = has_stock_deduction_for_order(order)
            for field, value in validated_data.items():
                setattr(order, field, value)

            old_totals = {}
            if stock_already_deducted:
                old_set_totals = {}
                for item in order.items.select_related('product', 'product_set').all():
                    if item.product:
                        old_totals[item.product] = old_totals.get(item.product, 0) + item.quantity
                    elif item.product_set:
                        old_set_totals[item.product_set] = old_set_totals.get(item.product_set, 0) + item.quantity
                for product, quantity in expand_set_component_totals(old_set_totals).items():
                    old_totals[product] = old_totals.get(product, 0) + quantity

            if items_data is not None:
                new_product_totals, new_set_totals = self._aggregate_items(items_data)
                new_totals = {}
                if stock_already_deducted and not order.is_draft:
                    new_totals = dict(new_product_totals)
                    for product, quantity in expand_set_component_totals(new_set_totals).items():
                        new_totals[product] = new_totals.get(product, 0) + quantity

                order.items.all().delete()
                subtotal = 0
                for item_data in items_data:
                    apply_order_item_snapshot(item_data, request)
                    item = OrderItem.objects.create(order=order, **item_data)
                    subtotal += item.total_price
                order.subtotal = subtotal

                if stock_already_deducted:
                    self._adjust_stock(order, old_totals, new_totals, request.user)

            order.save()

            OrderStatusHistory.objects.create(
                order=order,
                status=order.status,
                changed_by=request.user,
                note='Order edited',
            )

            from apps.notifications.services import TelegramService
            transaction.on_commit(lambda: TelegramService.notify_order_edited_async(order.id))

            order.customer.total_orders = order.customer.orders.count()
            order.customer.total_spent = sum(o.grand_total for o in order.customer.orders.all())
            order.customer.save(update_fields=['total_orders', 'total_spent'])

        return order


class CustomerCheckoutSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=200)
    phone = serializers.CharField(max_length=20)
    email = serializers.EmailField(required=False, allow_blank=True, default='')
    address = serializers.CharField()
    province = serializers.CharField(max_length=50)
    district = serializers.CharField(required=False, allow_blank=True, default='')
    address_detail = serializers.CharField(required=False, allow_blank=True, default='')
    notes = serializers.CharField(required=False, allow_blank=True, default='')
    payment_method = serializers.ChoiceField(choices=[c[0] for c in Order.PAYMENT_METHOD_CHOICES])
    payment_status = serializers.ChoiceField(
        choices=[c[0] for c in Order.PAYMENT_STATUS_CHOICES],
        default='unpaid',
    )
    delivery_fee = serializers.DecimalField(max_digits=10, decimal_places=2, default=0)
    coupon_code = serializers.CharField(required=False, allow_blank=True, write_only=True, default='')
    items = OrderItemWriteSerializer(many=True)

    def validate(self, attrs):
        errors = validate_order_target_stock(attrs.get('items', []))
        if errors:
            raise serializers.ValidationError({'items': errors})
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        request = self.context['request']
        user = request.user
        items_data = validated_data.pop('items')
        coupon_code = validated_data.pop('coupon_code', '').strip()

        customer_defaults = {
            'name': validated_data.pop('name'),
            'phone': validated_data.pop('phone'),
            'email': validated_data.pop('email', ''),
            'address': validated_data.pop('address'),
            'province': validated_data.pop('province'),
            'notes': validated_data.pop('address_detail', ''),
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
            discount=0,
            notes=order_notes,
        )

        subtotal = 0
        for item_data in items_data:
            apply_order_item_snapshot(item_data, request)
            item = OrderItem.objects.create(order=order, **item_data)
            subtotal += item.total_price

        if coupon_code:
            from .rewards import get_coupon_discount
            try:
                redemption, discount = get_coupon_discount(
                    user,
                    coupon_code,
                    subtotal,
                    order.delivery_fee,
                    lock=True,
                )
            except ValueError as exc:
                raise serializers.ValidationError({'coupon_code': str(exc)}) from exc
            order.discount = discount
            redemption.status = RewardRedemption.STATUS_USED
            redemption.save(update_fields=['status'])

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
        if TelegramService.should_notify_new_order_on_placement(order.payment_method):
            transaction.on_commit(lambda: TelegramService.notify_new_order_async(order.id))

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


class RewardItemSerializer(serializers.ModelSerializer):
    can_exchange = serializers.SerializerMethodField()
    type_label = serializers.CharField(source='get_type_display', read_only=True)
    coupon_discount_type_label = serializers.CharField(source='get_coupon_discount_type_display', read_only=True)
    gift_product_name = serializers.CharField(source='gift_product.name', read_only=True)
    gift_product_code = serializers.CharField(source='gift_product.code', read_only=True)
    clear_reward_image = serializers.BooleanField(write_only=True, required=False)
    reward_image_url = serializers.SerializerMethodField()
    gift_product_image = serializers.SerializerMethodField()
    redeemed_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = RewardItem
        fields = [
            'id', 'name', 'description', 'points_required', 'type', 'type_label',
            'reward_image', 'reward_image_url', 'clear_reward_image',
            'coupon_discount_type', 'coupon_discount_type_label', 'coupon_value',
            'minimum_order_amount', 'gift_product', 'gift_product_name',
            'gift_product_code', 'gift_product_image', 'stock', 'per_customer_limit',
            'member_tier_requirement', 'redeemed_count',
            'starts_at', 'ends_at', 'is_active', 'can_exchange', 'created_at', 'updated_at',
        ]
        extra_kwargs = {'reward_image': {'write_only': True, 'required': False}}

    def get_reward_image_url(self, obj):
        if obj.reward_image:
            request = self.context.get('request')
            return request.build_absolute_uri(obj.reward_image.url) if request else obj.reward_image.url
        return None

    def update(self, instance, validated_data):
        clear_reward_image = validated_data.pop('clear_reward_image', False)
        if clear_reward_image and instance.reward_image:
            instance.reward_image.delete(save=False)
            instance.reward_image = None
        return super().update(instance, validated_data)

    def validate(self, attrs):
        reward_type = attrs.get('type') or getattr(self.instance, 'type', None)
        if reward_type not in {RewardItem.TYPE_GIFT, RewardItem.TYPE_LUCKY_BOX}:
            attrs['gift_product'] = None
        return attrs

    def _gift_product_has_inventory(self, obj):
        if obj.type not in {RewardItem.TYPE_GIFT, RewardItem.TYPE_LUCKY_BOX} or not obj.gift_product:
            return True
        product = obj.gift_product
        if not product.is_available_for_sale:
            return False
        if product.availability_status == Product.AVAILABILITY_AVAILABLE:
            return True
        return product.current_stock > 0

    def get_gift_product_image(self, obj):
        product = obj.gift_product
        if not product:
            return None
        img = product.images.filter(is_primary=True).first() or product.images.first()
        if img and img.image:
            request = self.context.get('request')
            return request.build_absolute_uri(img.image.url) if request else img.image.url
        return None

    def get_can_exchange(self, obj):
        current_points = self.context.get('current_points')
        if current_points is None:
            return False
        has_stock = obj.stock is None or obj.stock > 0
        from django.utils import timezone
        now = timezone.now()
        in_window = (not obj.starts_at or obj.starts_at <= now) and (not obj.ends_at or obj.ends_at >= now)
        gift_product_available = self._gift_product_has_inventory(obj)
        user = self.context.get('user')
        under_customer_limit = True
        if user and obj.per_customer_limit:
            used_count = RewardRedemption.objects.filter(user=user, reward_item=obj).exclude(
                status__in=[RewardRedemption.STATUS_REJECTED, RewardRedemption.STATUS_CANCELLED]
            ).count()
            under_customer_limit = used_count < obj.per_customer_limit
        return (
            obj.is_active
            and has_stock
            and in_window
            and gift_product_available
            and under_customer_limit
            and current_points >= obj.points_required
        )


class RewardRedemptionSerializer(serializers.ModelSerializer):
    reward_name = serializers.CharField(source='reward_item.name', read_only=True)
    reward_type = serializers.CharField(source='reward_item.type', read_only=True)
    coupon_discount_type = serializers.CharField(source='reward_item.coupon_discount_type', read_only=True)
    coupon_value = serializers.DecimalField(source='reward_item.coupon_value', max_digits=10, decimal_places=2, read_only=True)
    minimum_order_amount = serializers.DecimalField(source='reward_item.minimum_order_amount', max_digits=10, decimal_places=2, read_only=True)
    ends_at = serializers.DateTimeField(source='reward_item.ends_at', read_only=True)
    user_name = serializers.SerializerMethodField()
    user_phone = serializers.CharField(source='user.phone', read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    gift_product_name = serializers.CharField(source='reward_item.gift_product.name', read_only=True)
    reward_image_url = serializers.SerializerMethodField()
    gift_product_image = serializers.SerializerMethodField()

    class Meta:
        model = RewardRedemption
        fields = [
            'id', 'reward_item', 'reward_name', 'reward_type', 'points_spent',
            'coupon_code', 'coupon_discount_type', 'coupon_value',
            'minimum_order_amount', 'ends_at', 'status', 'created_at',
            'user', 'user_name', 'user_phone', 'user_email',
            'gift_product_name', 'reward_image_url', 'gift_product_image',
        ]

    def get_user_name(self, obj):
        return obj.user.get_full_name() or obj.user.username

    def get_reward_image_url(self, obj):
        image = obj.reward_item.reward_image
        if image:
            request = self.context.get('request')
            return request.build_absolute_uri(image.url) if request else image.url
        return None

    def get_gift_product_image(self, obj):
        product = obj.reward_item.gift_product
        if not product:
            return None
        img = product.images.filter(is_primary=True).first() or product.images.first()
        if img and img.image:
            request = self.context.get('request')
            return request.build_absolute_uri(img.image.url) if request else img.image.url
        return None


class PointTransactionSerializer(serializers.ModelSerializer):
    order_number = serializers.CharField(source='order.order_number', read_only=True)
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = PointTransaction
        fields = ['id', 'user', 'user_name', 'order', 'order_number', 'points', 'type', 'note', 'created_at', 'expires_at']

    def get_user_name(self, obj):
        return obj.user.get_full_name() or obj.user.username


class RewardSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = RewardSettings
        fields = [
            'points_per_dollar', 'signup_bonus', 'referral_bonus', 'birthday_bonus',
            'review_bonus', 'daily_checkin_bonus', 'points_expiry_days', 'expiry_reminder_days',
            'expiration_enabled',
            'minimum_redeem_points', 'maximum_points_per_order', 'updated_at',
            'silver_min_points', 'gold_min_points', 'platinum_min_points',
            'auto_approve_points', 'auto_apply_on_completed', 'low_stock_alert_enabled',
        ]
        read_only_fields = ['updated_at']

    def validate(self, attrs):
        instance = self.instance or RewardSettings.get_solo()
        silver = attrs.get('silver_min_points', instance.silver_min_points)
        gold = attrs.get('gold_min_points', instance.gold_min_points)
        platinum = attrs.get('platinum_min_points', instance.platinum_min_points)
        if not silver <= gold < platinum:
            raise serializers.ValidationError(
                'Member tiers must increase from Silver to Gold to Platinum.'
            )
        return attrs
