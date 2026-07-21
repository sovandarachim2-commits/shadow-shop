from rest_framework import viewsets, generics, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django_filters import rest_framework as filters
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.exceptions import ValidationError
from django.utils import timezone
from django.db import transaction
from django.db.models import Count, OuterRef, Subquery, Sum, Q
from django.contrib.auth import get_user_model
from datetime import timedelta
from .models import Customer, Order, OrderStatusHistory, Wishlist, CartItem, PrepareRecord, OutRecord, RewardItem, RewardRedemption, RewardSettings, PointTransaction
from .serializers import (
    CustomerSerializer, OrderListSerializer, OrderDetailSerializer,
    OrderCreateSerializer, CustomerCheckoutSerializer, OrderStatusHistorySerializer,
    WishlistSerializer, CartItemSerializer, PrepareRecordSerializer, OutRecordSerializer,
    OrderAdminUpdateSerializer, RewardItemSerializer, RewardRedemptionSerializer, RewardSettingsSerializer, PointTransactionSerializer,
)
from .rewards import (
    award_points_for_paid_order, exchange_reward, get_member_level, get_next_tier_points,
    get_points_balance, get_coupon_discount, sync_paid_order_points,
)
from utils.permissions import HasModulePermission, IsStaff, IsSeller, IsCashier, user_has_module_permission
from utils.pagination import StandardPagination


class OrderPagination(StandardPagination):
    page_size = 100
    max_page_size = 1000


def get_order_print_stock_issues(order):
    from apps.inventory.models import StockMovement
    from apps.products.models import Product

    requirements = {}
    for item in order.items.select_related('product', 'product_set').prefetch_related('product_set__items__product__stock').all():
        if item.product:
            requirements[item.product] = requirements.get(item.product, 0) + int(item.quantity or 0)
            continue
        if item.product_set:
            for set_item in item.product_set.items.select_related('product', 'product__stock').all():
                requirements[set_item.product] = requirements.get(set_item.product, 0) + (
                    int(item.quantity or 0) * int(set_item.quantity or 1)
                )

    issues = []
    for product, required_qty in requirements.items():
        if product.availability_status == Product.AVAILABILITY_AVAILABLE:
            continue

        try:
            current_qty = int(product.stock.quantity or 0)
        except Exception:
            current_qty = 0

        reserved_qty = abs(StockMovement.objects.filter(
            product=product,
            reference=order.order_number,
            type=StockMovement.TYPE_STOCK_OUT,
        ).aggregate(total=Sum('quantity'))['total'] or 0)
        available_for_order = current_qty + reserved_qty

        if product.availability_status == Product.AVAILABILITY_OUT_OF_STOCK or available_for_order < required_qty:
            issues.append({
                'order_id': order.id,
                'order_number': order.order_number,
                'product_id': product.id,
                'product_name': product.name,
                'product_code': product.code,
                'required': required_qty,
                'available': available_for_order,
                'current_stock': current_qty,
                'reserved_for_order': reserved_qty,
                'availability_status': product.availability_status,
            })
    return issues


def get_batch_print_stock_issues(orders):
    from apps.inventory.services import has_stock_deduction_for_order
    from apps.products.models import Product

    requirements = {}
    order_numbers = {}
    for order in orders:
        if has_stock_deduction_for_order(order):
            continue
        for item in order.items.select_related('product', 'product_set').prefetch_related(
            'product_set__items__product__stock'
        ):
            if item.product:
                requirements[item.product] = requirements.get(item.product, 0) + int(item.quantity or 0)
                order_numbers.setdefault(item.product, []).append(order.order_number)
            elif item.product_set:
                for set_item in item.product_set.items.select_related('product', 'product__stock'):
                    required = int(item.quantity or 0) * int(set_item.quantity or 1)
                    requirements[set_item.product] = requirements.get(set_item.product, 0) + required
                    order_numbers.setdefault(set_item.product, []).append(order.order_number)

    issues = []
    for product, required_qty in requirements.items():
        if product.availability_status == Product.AVAILABILITY_AVAILABLE:
            continue
        try:
            available_qty = int(product.stock.quantity or 0)
        except Exception:
            available_qty = 0
        if product.availability_status == Product.AVAILABILITY_OUT_OF_STOCK or available_qty < required_qty:
            issues.append({
                'product_id': product.id,
                'product_name': product.name,
                'product_code': product.code,
                'required': required_qty,
                'available': available_qty,
                'order_numbers': list(dict.fromkeys(order_numbers.get(product, []))),
                'availability_status': product.availability_status,
            })
    return issues


class CustomerFilter(filters.FilterSet):
    class Meta:
        model = Customer
        fields = ['province', 'is_active']


class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all().order_by('-created_at')
    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticated, IsStaff]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = CustomerFilter
    search_fields = ['name', 'phone', 'email', 'address']
    ordering_fields = ['created_at', 'name', 'total_spent']

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class OrderFilter(filters.FilterSet):
    date_from = filters.DateFilter(field_name='created_at', lookup_expr='date__gte')
    date_to = filters.DateFilter(field_name='created_at', lookup_expr='date__lte')

    class Meta:
        model = Order
        fields = ['status', 'payment_status', 'payment_method', 'seller', 'is_draft']


class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all().select_related(
        'customer', 'seller', 'bakong_payment', 'aba_payment', 'printed_by'
    ).prefetch_related(
        'items__product__images',
        'items__product_set',
        'items',
        'status_history__changed_by',
    ).annotate(
        out_record_delivery_by=Subquery(
            OutRecord.objects.filter(code=OuterRef('order_number')).values('delivery_by')[:1]
        )
    ).order_by('-created_at')
    permission_classes = [IsAuthenticated, IsStaff]
    pagination_class = OrderPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = OrderFilter
    search_fields = ['order_number', 'customer__name', 'customer__phone']
    ordering_fields = ['created_at', 'grand_total']

    def get_permissions(self):
        if self.action in ('list', 'retrieve', 'checkout'):
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsStaff()]

    def get_serializer_class(self):
        if self.action == 'list':
            return OrderListSerializer
        if self.action == 'create':
            return OrderCreateSerializer
        return OrderDetailSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.role == 'seller':
            qs = qs.filter(seller=user)
        elif user.role == 'customer':
            try:
                qs = qs.filter(customer__user=user)
            except Exception:
                return qs.none()
        return qs

    def destroy(self, request, *args, **kwargs):
        order = self.get_object()
        if order.status in [Order.STATUS_PREPARING, Order.STATUS_SHIPPED] and not user_has_module_permission(request.user, 'scanner', 'delete'):
            return Response(
                {'detail': 'You do not have permission to delete scanner records.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        if not user_has_module_permission(request.user, 'orders', 'delete'):
            return Response(
                {'detail': 'You do not have permission to delete orders.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser, JSONParser])
    def update_status(self, request, pk=None):
        order = self.get_object()
        new_status = request.data.get('status')
        note = request.data.get('note', '')

        valid_statuses = [s[0] for s in Order.STATUS_CHOICES]
        if new_status not in valid_statuses:
            return Response({'detail': 'Invalid status.'}, status=status.HTTP_400_BAD_REQUEST)

        old_status = order.status
        if new_status in [Order.STATUS_PREPARING, Order.STATUS_SHIPPED]:
            can_scan_save = user_has_module_permission(request.user, 'scanner', 'create')
            can_edit_orders = user_has_module_permission(request.user, 'orders', 'edit')
            if not (can_scan_save or can_edit_orders):
                return Response(
                    {'detail': 'You do not have permission to save scanner records.'},
                    status=status.HTTP_403_FORBIDDEN,
                )
        elif not user_has_module_permission(request.user, 'orders', 'edit'):
            return Response(
                {'detail': 'You do not have permission to update order status.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if new_status == Order.STATUS_PRINTED:
            stock_issues = get_order_print_stock_issues(order)
            if stock_issues:
                return Response(
                    {
                        'detail': 'Cannot print because some products do not have enough stock.',
                        'stock_issues': stock_issues,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
        if new_status == Order.STATUS_PREPARING and old_status == Order.STATUS_PREPARING:
            return Response(
                {'detail': 'This QR already saved in Prepare Package.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if new_status == Order.STATUS_SHIPPED:
            if old_status == Order.STATUS_SHIPPED:
                return Response(
                    {'detail': 'This QR already saved in Out Package.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if old_status != Order.STATUS_PREPARING:
                return Response(
                    {'detail': 'This barcode is not in Prepare Package yet.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        order.status = new_status
        if new_status == 'preparing':
            invoice_photo = request.FILES.get('prepare_invoice_photo')
            package_photo = request.FILES.get('prepare_package_photo')
            if invoice_photo:
                order.prepare_invoice_photo = invoice_photo
            if package_photo:
                order.prepare_package_photo = package_photo
        if new_status == 'shipped':
            invoice_photo = request.FILES.get('out_invoice_photo')
            package_photo = request.FILES.get('out_package_photo')
            delivery_by = request.data.get('out_delivery_by')
            if invoice_photo:
                order.out_invoice_photo = invoice_photo
            if package_photo:
                order.out_package_photo = package_photo
            if delivery_by is not None:
                order.out_delivery_by = delivery_by
        order.save()

        OrderStatusHistory.objects.create(
            order=order, status=new_status,
            changed_by=request.user, note=note,
        )

        if new_status == 'printed':
            from apps.inventory.services import deduct_stock_for_order
            deduct_stock_for_order(order, request.user)
            order.printed_at = timezone.now()
            order.printed_by = request.user
            order.save()
        if new_status == Order.STATUS_COMPLETED and order.payment_status == 'paid':
            award_points_for_paid_order(order)

        if request.query_params.get('compact') in ('1', 'true', 'yes'):
            return Response({
                'id': order.id,
                'order_number': order.order_number,
                'status': order.status,
            })

        return Response(OrderDetailSerializer(order, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def admin_update(self, request, pk=None):
        order = self.get_object()
        serializer = OrderAdminUpdateSerializer(order, data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        order = serializer.save()
        return Response(OrderDetailSerializer(order, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def mark_paid(self, request, pk=None):
        order = self.get_object()
        payment_method = request.data.get('payment_method', 'cash')
        order.payment_status = 'paid'
        order.payment_method = payment_method
        order.save()
        award_points_for_paid_order(order)

        from apps.finance.models import Revenue
        Revenue.objects.get_or_create(
            order=order,
            defaults={
                'amount': order.grand_total,
                'payment_method': payment_method,
                'received_at': timezone.now(),
                'received_by': request.user,
            }
        )

        from apps.notifications.services import TelegramService
        TelegramService().notify_payment_received(order)

        return Response({'payment_status': 'paid'})

    @action(detail=False, methods=['post'])
    def validate_print_stock(self, request):
        order_ids = request.data.get('order_ids') or request.data.get('orders') or []
        if not isinstance(order_ids, list) or not order_ids:
            return Response({'detail': 'Select at least one order.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            order_ids = [int(order_id) for order_id in order_ids]
        except (TypeError, ValueError):
            return Response({'detail': 'Invalid order selected.'}, status=status.HTTP_400_BAD_REQUEST)

        orders = self.get_queryset().filter(id__in=order_ids).prefetch_related(
            'items__product__stock',
            'items__product_set__items__product__stock',
        )
        found_ids = {order.id for order in orders}
        missing_ids = [order_id for order_id in order_ids if order_id not in found_ids]
        issues = []
        for order in orders:
            issues.extend(get_order_print_stock_issues(order))

        return Response({
            'ok': not issues and not missing_ids,
            'issues': issues,
            'missing_order_ids': missing_ids,
        })

    @action(detail=False, methods=['post'])
    def mark_printed(self, request):
        from apps.inventory.models import Stock
        from apps.inventory.services import deduct_stock_for_order

        order_ids = request.data.get('order_ids') or request.data.get('orders') or []
        if not isinstance(order_ids, list) or not order_ids:
            return Response({'detail': 'Select at least one order.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            order_ids = list(dict.fromkeys(int(order_id) for order_id in order_ids))
        except (TypeError, ValueError):
            return Response({'detail': 'Invalid order selected.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            orders = list(
                self.get_queryset().select_for_update().filter(id__in=order_ids).prefetch_related(
                    'items__product__stock',
                    'items__product_set__items__product__stock',
                )
            )
            found_ids = {order.id for order in orders}
            missing_ids = [order_id for order_id in order_ids if order_id not in found_ids]
            if missing_ids:
                return Response(
                    {'detail': 'Some selected orders were not found.', 'missing_order_ids': missing_ids},
                    status=status.HTTP_404_NOT_FOUND,
                )

            product_ids = set()
            for order in orders:
                for item in order.items.all():
                    if item.product_id:
                        product_ids.add(item.product_id)
                    elif item.product_set_id:
                        product_ids.update(
                            item.product_set.items.values_list('product_id', flat=True)
                        )
            existing_stock_ids = set(Stock.objects.filter(product_id__in=product_ids).values_list('product_id', flat=True))
            Stock.objects.bulk_create(
                [Stock(product_id=product_id, quantity=0) for product_id in product_ids - existing_stock_ids],
                ignore_conflicts=True,
            )
            list(Stock.objects.select_for_update().filter(product_id__in=product_ids))

            issues = get_batch_print_stock_issues(orders)
            if issues:
                return Response(
                    {
                        'detail': 'Cannot print because selected orders need more stock than is available.',
                        'ok': False,
                        'issues': issues,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            printed_at = timezone.now()
            for order in orders:
                deduct_stock_for_order(order, request.user)
                if order.status != Order.STATUS_PRINTED or not order.printed_at:
                    order.status = Order.STATUS_PRINTED
                    order.printed_at = printed_at
                    order.printed_by = request.user
                    order.save(update_fields=['status', 'printed_at', 'printed_by', 'updated_at'])
                    OrderStatusHistory.objects.create(
                        order=order,
                        status=Order.STATUS_PRINTED,
                        changed_by=request.user,
                        note='Printed from Print Center',
                    )

        return Response({
            'ok': True,
            'printed_order_ids': order_ids,
        })

    @action(detail=True, methods=['get'])
    def generate_qr(self, request, pk=None):
        import qrcode
        import io
        from django.core.files.base import ContentFile
        order = self.get_object()
        qr_data = f"SS-ORDER:{order.order_number}"
        qr = qrcode.make(qr_data)
        buffer = io.BytesIO()
        qr.save(buffer, format='PNG')
        order.qr_code.save(f"order_{order.order_number}.png", ContentFile(buffer.getvalue()), save=True)
        return Response({'qr_url': request.build_absolute_uri(order.qr_code.url)})

    @action(detail=False, methods=['get'])
    def today(self, request):
        today = timezone.now().date()
        orders = self.get_queryset().filter(created_at__date=today)
        serializer = OrderListSerializer(orders, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def kanban(self, request):
        statuses = [s[0] for s in Order.STATUS_CHOICES]
        data = {}
        for s in statuses:
            orders = self.get_queryset().filter(status=s)[:10]
            data[s] = OrderListSerializer(orders, many=True, context={'request': request}).data
        return Response(data)

    @action(detail=False, methods=['get'])
    def operation_summary(self, request):
        today = timezone.now().date()
        qs = self.get_queryset()
        manual_prepare_qs = PrepareRecord.objects.filter(set_type='not_set', created_at__date=today)
        set_prepare_qs = PrepareRecord.objects.filter(set_type='set', created_at__date=today)
        manual_out_qs = OutRecord.objects.filter(created_at__date=today)
        prepared_order_ids = OrderStatusHistory.objects.filter(
            status=Order.STATUS_PREPARING,
            created_at__date=today,
        ).values('order_id')
        shipped_order_ids = OrderStatusHistory.objects.filter(
            status=Order.STATUS_SHIPPED,
            created_at__date=today,
        ).values('order_id')
        cancelled_order_ids = OrderStatusHistory.objects.filter(
            status=Order.STATUS_CANCELLED,
            created_at__date=today,
        ).values('order_id')
        return Response({
            'packed': qs.filter(id__in=prepared_order_ids).count() + manual_prepare_qs.count(),
            'shipped': qs.filter(id__in=shipped_order_ids).count() + manual_out_qs.count(),
            'sets': set_prepare_qs.count(),
            'returned': qs.filter(id__in=cancelled_order_ids).count(),
            'unpaid': qs.filter(payment_status='unpaid').count(),
        })

    @action(detail=False, methods=['post'])
    def checkout(self, request):
        if request.user.role != 'customer':
            return Response({'detail': 'Only customers can use this checkout endpoint.'}, status=status.HTTP_403_FORBIDDEN)

        from apps.notifications.services import ONLINE_PAY_NOW_METHODS
        payment_method = request.data.get('payment_method')
        if payment_method in ONLINE_PAY_NOW_METHODS:
            from apps.payments.checkout_flow import prepare_online_checkout
            result = prepare_online_checkout(request, request.data)
            return Response(result, status=status.HTTP_201_CREATED)

        serializer = CustomerCheckoutSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        order = serializer.save()
        data = OrderDetailSerializer(order, context={'request': request}).data
        return Response(
            data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=['get'])
    def checkout_status(self, request):
        if request.user.role != 'customer':
            return Response({'detail': 'Only customers can use this endpoint.'}, status=status.HTTP_403_FORBIDDEN)
        reference = request.query_params.get('reference')
        if not reference:
            return Response({'detail': 'reference is required.'}, status=status.HTTP_400_BAD_REQUEST)
        from apps.payments.models import PendingCheckout
        from apps.payments.checkout_flow import get_pending_checkout_status
        try:
            data = get_pending_checkout_status(request, reference)
        except PendingCheckout.DoesNotExist:
            return Response({'detail': 'Checkout session not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(data)


class PrepareRecordFilter(filters.FilterSet):
    date_from = filters.DateFilter(field_name='created_at', lookup_expr='date__gte')
    date_to = filters.DateFilter(field_name='created_at', lookup_expr='date__lte')

    class Meta:
        model = PrepareRecord
        fields = ['payment_status', 'set_type']


class PrepareRecordViewSet(viewsets.ModelViewSet):
    queryset = PrepareRecord.objects.all().select_related('created_by').order_by('-created_at')
    serializer_class = PrepareRecordSerializer
    permission_classes = [IsAuthenticated, HasModulePermission]
    permission_module = 'scanner'
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = PrepareRecordFilter
    search_fields = ['code', 'phone', 'created_by__username', 'created_by__first_name', 'created_by__last_name']
    ordering_fields = ['created_at', 'amount']

    def perform_create(self, serializer):
        code = self.request.data.get('code', '').strip()
        if code:
            if PrepareRecord.objects.filter(code=code).exists():
                raise ValidationError({'code': 'This QR already saved in Prepare Package.'})
            if Order.objects.filter(order_number=code, status__in=[Order.STATUS_PREPARING, Order.STATUS_SHIPPED]).exists():
                raise ValidationError({'code': 'This QR already saved.'})
        set_qr_values = self.request.data.get('set_qr_values', [])
        if isinstance(set_qr_values, str):
            import json
            try:
                set_qr_values = json.loads(set_qr_values)
            except ValueError:
                set_qr_values = [v.strip() for v in set_qr_values.split(',') if v.strip()]
        serializer.save(created_by=self.request.user, set_qr_values=set_qr_values)


class OutRecordFilter(filters.FilterSet):
    date_from = filters.DateFilter(field_name='created_at', lookup_expr='date__gte')
    date_to = filters.DateFilter(field_name='created_at', lookup_expr='date__lte')

    class Meta:
        model = OutRecord
        fields = ['delivery_by']


class OutRecordViewSet(viewsets.ModelViewSet):
    queryset = OutRecord.objects.all().select_related('created_by', 'prepare_record').order_by('-created_at')
    serializer_class = OutRecordSerializer
    permission_classes = [IsAuthenticated, HasModulePermission]
    permission_module = 'scanner'
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = OutRecordFilter
    search_fields = ['code', 'phone', 'delivery_by', 'created_by__username', 'created_by__first_name', 'created_by__last_name']
    ordering_fields = ['created_at']

    def perform_create(self, serializer):
        code = self.request.data.get('code', '').strip()
        if not code:
            raise ValidationError({'code': 'Enter Code.'})
        if OutRecord.objects.filter(code=code).exists() or Order.objects.filter(order_number=code, status=Order.STATUS_SHIPPED).exists():
            raise ValidationError({'code': 'This QR already saved in Out Package.'})
        prepare_record = PrepareRecord.objects.filter(code=code).first()
        if not prepare_record and not Order.objects.filter(order_number=code, status=Order.STATUS_PREPARING).exists():
            raise ValidationError({'code': 'This QR is not in Prepare Package.'})
        serializer.save(created_by=self.request.user, prepare_record=prepare_record)


class WishlistViewSet(viewsets.ModelViewSet):
    serializer_class = WishlistSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Wishlist.objects.filter(user=self.request.user).select_related('product')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['delete'])
    def clear(self, request):
        Wishlist.objects.filter(user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CartViewSet(viewsets.ModelViewSet):
    serializer_class = CartItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return CartItem.objects.filter(user=self.request.user).select_related('product')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['delete'])
    def clear(self, request):
        CartItem.objects.filter(user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        items = CartItem.objects.filter(user=request.user).select_related('product')
        total_items = sum(item.quantity for item in items)
        subtotal = sum(item.product.retail_price * item.quantity for item in items)
        return Response({
            'total_items': total_items,
            'subtotal': float(subtotal),
        })


class RewardsViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def _summary(self, request):
        sync_paid_order_points(request.user)
        current_points = get_points_balance(request.user)
        reward_settings = RewardSettings.get_solo()
        next_tier_points = get_next_tier_points(current_points)
        progress_pct = 100 if next_tier_points <= current_points else round((current_points / next_tier_points) * 100)
        items = RewardItem.objects.filter(is_active=True).select_related('gift_product').prefetch_related('gift_product__images').order_by('points_required', 'name')
        redemptions = RewardRedemption.objects.filter(user=request.user).select_related('reward_item', 'reward_item__gift_product').prefetch_related('reward_item__gift_product__images')[:20]
        transactions = PointTransaction.objects.filter(user=request.user).select_related('order')[:20]
        return {
            'current_points': current_points,
            'member_level': get_member_level(current_points),
            'next_tier_points': next_tier_points,
            'points_to_next_level': max(0, next_tier_points - current_points),
            'progress_pct': min(100, progress_pct),
            'catalog': RewardItemSerializer(items, many=True, context={'current_points': current_points, 'user': request.user}).data,
            'redemptions': RewardRedemptionSerializer(redemptions, many=True).data,
            'transactions': PointTransactionSerializer(transactions, many=True).data,
            'earning_rules': {
                'points_per_dollar': reward_settings.points_per_dollar,
                'review_bonus': reward_settings.review_bonus,
                'referral_bonus': reward_settings.referral_bonus,
                'birthday_bonus': reward_settings.birthday_bonus,
                'daily_checkin_bonus': reward_settings.daily_checkin_bonus,
            },
            'checked_in_today': PointTransaction.objects.filter(
                user=request.user,
                type=PointTransaction.TYPE_EARN,
                note='Daily check-in bonus',
                created_at__date=timezone.localdate(),
            ).exists(),
        }

    def list(self, request):
        return Response(self._summary(request))

    @action(detail=False, methods=['post'])
    def exchange(self, request):
        reward_item_id = request.data.get('reward_item')
        if not reward_item_id:
            return Response({'detail': 'Reward item is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            redemption = exchange_reward(request.user, reward_item_id)
        except RewardItem.DoesNotExist:
            return Response({'detail': 'Reward not found.'}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        data = self._summary(request)
        data['redemption'] = RewardRedemptionSerializer(redemption).data
        return Response(data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'])
    def validate_coupon(self, request):
        try:
            redemption, discount = get_coupon_discount(
                request.user,
                request.data.get('coupon_code'),
                request.data.get('subtotal'),
                request.data.get('delivery_fee'),
            )
        except (ValueError, TypeError) as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        reward = redemption.reward_item
        return Response({
            'coupon_code': redemption.coupon_code,
            'name': reward.name,
            'reward_type': reward.type,
            'discount_type': reward.coupon_discount_type,
            'coupon_value': reward.coupon_value,
            'minimum_order_amount': reward.minimum_order_amount,
            'discount': discount,
        })

    @action(detail=False, methods=['post'])
    def daily_checkin(self, request):
        User = get_user_model()
        with transaction.atomic():
            User.objects.select_for_update().get(pk=request.user.pk)
            reward_settings = RewardSettings.get_solo()
            bonus = reward_settings.daily_checkin_bonus
            if bonus <= 0:
                return Response(
                    {'detail': 'Daily check-in rewards are not enabled yet.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if PointTransaction.objects.filter(
                user=request.user,
                type=PointTransaction.TYPE_EARN,
                note='Daily check-in bonus',
                created_at__date=timezone.localdate(),
            ).exists():
                return Response(
                    {'detail': 'You already checked in today.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            PointTransaction.objects.create(
                user=request.user,
                points=bonus,
                type=PointTransaction.TYPE_EARN,
                note='Daily check-in bonus',
            )
        return Response(self._summary(request))

    @action(detail=False, methods=['get'])
    def history(self, request):
        transactions = PointTransaction.objects.filter(user=request.user).select_related(
            'order', 'reward_redemption', 'reward_redemption__reward_item'
        ).order_by('-created_at')[:300]
        return Response(PointTransactionSerializer(transactions, many=True).data)


class AdminRewardItemViewSet(viewsets.ModelViewSet):
    queryset = RewardItem.objects.select_related('gift_product').prefetch_related(
        'gift_product__images'
    ).annotate(redeemed_count=Count('redemptions')).order_by('-created_at')
    serializer_class = RewardItemSerializer
    permission_classes = [IsAuthenticated, IsStaff]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['type', 'is_active', 'member_tier_requirement']
    search_fields = ['name', 'description', 'type']
    ordering_fields = ['created_at', 'points_required', 'stock']

    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        reward = self.get_object()
        reward.is_active = not reward.is_active
        reward.save(update_fields=['is_active', 'updated_at'])
        return Response(RewardItemSerializer(reward).data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        issued = PointTransaction.objects.filter(points__gt=0).aggregate(total=Sum('points'))['total'] or 0
        redeemed = abs(PointTransaction.objects.filter(points__lt=0).aggregate(total=Sum('points'))['total'] or 0)
        active_members = PointTransaction.objects.values('user_id').annotate(balance=Sum('points')).filter(balance__gt=0).count()
        pending = RewardRedemption.objects.filter(status=RewardRedemption.STATUS_PENDING).count()
        reward_settings = RewardSettings.get_solo()
        reminder_until = timezone.now() + timedelta(days=reward_settings.expiry_reminder_days)
        expiring_points = PointTransaction.objects.filter(
            points__gt=0,
            expires_at__gte=timezone.now(),
            expires_at__lte=reminder_until,
        ).aggregate(total=Sum('points'))['total'] or 0
        top_rewards = list(
            RewardItem.objects.annotate(redeemed_count=Count('redemptions'))
            .order_by('-redeemed_count', 'name')
            .values('id', 'name', 'redeemed_count')[:5]
        )
        return Response({
            'total_points_issued': issued,
            'total_points_redeemed': redeemed,
            'active_members': active_members,
            'pending_redemptions': pending,
            'expiring_points': expiring_points,
            'top_redeemed_rewards': top_rewards,
        })


class AdminRewardRedemptionViewSet(viewsets.ModelViewSet):
    queryset = RewardRedemption.objects.select_related('user', 'reward_item', 'reward_item__gift_product').prefetch_related('reward_item__gift_product__images').order_by('-created_at')
    serializer_class = RewardRedemptionSerializer
    permission_classes = [IsAuthenticated, IsStaff]
    http_method_names = ['get', 'post', 'patch', 'head', 'options']
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'reward_item', 'reward_item__type']
    search_fields = ['coupon_code', 'user__username', 'user__first_name', 'user__last_name', 'user__phone', 'reward_item__name']
    ordering_fields = ['created_at', 'points_spent']

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def update_status(self, request, pk=None):
        redemption = self.get_queryset().select_for_update().get(pk=pk)
        new_status = request.data.get('status')
        valid_statuses = [choice[0] for choice in RewardRedemption.STATUS_CHOICES]
        if new_status not in valid_statuses:
            return Response({'detail': 'Invalid redemption status.'}, status=status.HTTP_400_BAD_REQUEST)

        old_status = redemption.status
        transitions = {
            RewardRedemption.STATUS_PENDING: {RewardRedemption.STATUS_APPROVED, RewardRedemption.STATUS_REJECTED},
            RewardRedemption.STATUS_APPROVED: {RewardRedemption.STATUS_PACKED, RewardRedemption.STATUS_REJECTED},
            RewardRedemption.STATUS_PACKED: {RewardRedemption.STATUS_SHIPPED},
            RewardRedemption.STATUS_SHIPPED: {RewardRedemption.STATUS_COMPLETED},
        }
        allowed = transitions.get(old_status)
        if allowed is not None and new_status not in allowed:
            return Response(
                {'detail': f'Cannot change redemption from {old_status} to {new_status}.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        redemption.status = new_status
        redemption.save(update_fields=['status'])

        if new_status in [RewardRedemption.STATUS_REJECTED, RewardRedemption.STATUS_CANCELLED] and old_status != new_status:
            refund_exists = PointTransaction.objects.filter(
                user=redemption.user,
                reward_redemption=redemption,
                type=PointTransaction.TYPE_ADJUST,
                note__icontains='Refunded',
            ).exists()
            if not refund_exists:
                PointTransaction.objects.create(
                    user=redemption.user,
                    reward_redemption=redemption,
                    points=redemption.points_spent,
                    type=PointTransaction.TYPE_ADJUST,
                    note=f'Refunded points for rejected reward {redemption.reward_item.name}',
                )
                reward = RewardItem.objects.select_for_update().get(pk=redemption.reward_item_id)
                if reward.stock is not None:
                    reward.stock += 1
                    reward.save(update_fields=['stock', 'updated_at'])

                if reward.type in {RewardItem.TYPE_GIFT, RewardItem.TYPE_LUCKY_BOX} and reward.gift_product_id:
                    from apps.inventory.models import Stock, StockMovement

                    original_reference = f'REWARD-{redemption.id}'
                    original_movement = StockMovement.objects.filter(
                        product_id=reward.gift_product_id,
                        reference=original_reference,
                        reference_type='reward_redemption',
                    ).exists()
                    refund_reference = f'{original_reference}-REFUND'
                    if original_movement and not StockMovement.objects.filter(reference=refund_reference).exists():
                        stock, _ = Stock.objects.select_for_update().get_or_create(
                            product_id=reward.gift_product_id,
                            defaults={'quantity': 0},
                        )
                        before_qty = stock.quantity
                        stock.quantity += 1
                        stock.save(update_fields=['quantity', 'updated_at'])
                        StockMovement.objects.create(
                            type=StockMovement.TYPE_RETURN,
                            product_id=reward.gift_product_id,
                            quantity=1,
                            before_qty=before_qty,
                            after_qty=stock.quantity,
                            reference=refund_reference,
                            reference_type='reward_redemption_refund',
                            notes=f'Restored stock for rejected reward redemption #{redemption.id}',
                            created_by=request.user,
                        )

        return Response(RewardRedemptionSerializer(redemption).data)


class AdminRewardPointsViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated, IsStaff]

    def list(self, request):
        User = get_user_model()
        search = (request.query_params.get('search') or '').strip()
        users = User.objects.filter(role='customer').order_by('first_name', 'username')
        if search:
            users = users.filter(
                Q(username__icontains=search)
                | Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(email__icontains=search)
                | Q(phone__icontains=search)
            )

        data = []
        for user in users[:300]:
            customer = getattr(user, 'customer_profile', None)
            data.append({
                'user': user.id,
                'name': user.get_full_name() or user.username,
                'username': user.username,
                'phone': user.phone or getattr(customer, 'phone', ''),
                'email': user.email or getattr(customer, 'email', ''),
                'points': get_points_balance(user),
                'total_orders': getattr(customer, 'total_orders', 0) if customer else 0,
                'total_spent': getattr(customer, 'total_spent', 0) if customer else 0,
            })
        return Response(data)

    @action(detail=False, methods=['post'])
    def adjust(self, request):
        user_id = request.data.get('user')
        points = request.data.get('points')
        note = request.data.get('note', '').strip()
        try:
            points = int(points)
        except (TypeError, ValueError):
            return Response({'detail': 'Enter a valid points amount.'}, status=status.HTTP_400_BAD_REQUEST)
        if points == 0:
            return Response({'detail': 'Points adjustment cannot be zero.'}, status=status.HTTP_400_BAD_REQUEST)

        User = get_user_model()
        try:
            user = User.objects.get(pk=user_id, role='customer')
        except User.DoesNotExist:
            return Response({'detail': 'Customer not found.'}, status=status.HTTP_404_NOT_FOUND)

        current_balance = get_points_balance(user)
        if current_balance + points < 0:
            return Response({'detail': 'Adjustment would make customer points negative.'}, status=status.HTTP_400_BAD_REQUEST)

        transaction_obj = PointTransaction.objects.create(
            user=user,
            points=points,
            type=PointTransaction.TYPE_ADJUST,
            note=note or f'Manual adjustment by {request.user.get_full_name() or request.user.username}',
        )
        return Response({
            'transaction': PointTransactionSerializer(transaction_obj).data,
            'balance': get_points_balance(user),
        }, status=status.HTTP_201_CREATED)


class AdminRewardTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PointTransactionSerializer
    permission_classes = [IsAuthenticated, IsStaff]
    pagination_class = StandardPagination
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['user__username', 'user__first_name', 'user__last_name', 'user__email', 'note', 'order__order_number']
    ordering_fields = ['created_at', 'points']
    ordering = ['-created_at']

    def get_queryset(self):
        queryset = PointTransaction.objects.select_related('user', 'order', 'reward_redemption', 'reward_redemption__reward_item')
        tx_type = self.request.query_params.get('type')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        if tx_type:
            queryset = queryset.filter(type=tx_type)
        if date_from:
            queryset = queryset.filter(created_at__date__gte=date_from)
        if date_to:
            queryset = queryset.filter(created_at__date__lte=date_to)
        return queryset


class AdminRewardSettingsView(generics.RetrieveUpdateAPIView):
    serializer_class = RewardSettingsSerializer
    permission_classes = [IsAuthenticated, IsStaff]

    def get_object(self):
        return RewardSettings.get_solo()
