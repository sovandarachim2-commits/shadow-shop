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
from django.db.models import Sum
from .models import Customer, Order, OrderStatusHistory, Wishlist, CartItem, PrepareRecord, OutRecord
from .serializers import (
    CustomerSerializer, OrderListSerializer, OrderDetailSerializer,
    OrderCreateSerializer, CustomerCheckoutSerializer, OrderStatusHistorySerializer,
    WishlistSerializer, CartItemSerializer, PrepareRecordSerializer, OutRecordSerializer,
    OrderAdminUpdateSerializer,
)
from utils.permissions import IsStaff, IsSeller, IsCashier
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
        'customer', 'seller', 'bakong_payment', 'aba_payment'
    ).prefetch_related(
        'items__product__images',
        'items__product_set',
        'items',
        'status_history',
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

    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser, JSONParser])
    def update_status(self, request, pk=None):
        order = self.get_object()
        new_status = request.data.get('status')
        note = request.data.get('note', '')

        valid_statuses = [s[0] for s in Order.STATUS_CHOICES]
        if new_status not in valid_statuses:
            return Response({'detail': 'Invalid status.'}, status=status.HTTP_400_BAD_REQUEST)

        old_status = order.status
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
            order.printed_at = timezone.now()
            order.printed_by = request.user
            order.save()

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
        qs = self.get_queryset()
        manual_prepare_qs = PrepareRecord.objects.filter(set_type='not_set')
        set_prepare_qs = PrepareRecord.objects.filter(set_type='set')
        manual_out_qs = OutRecord.objects.all()
        return Response({
            'packed': qs.filter(status=Order.STATUS_PREPARING).count() + manual_prepare_qs.count(),
            'shipped': qs.filter(status=Order.STATUS_SHIPPED).count() + manual_out_qs.count(),
            'sets': set_prepare_qs.count(),
            'returned': qs.filter(status=Order.STATUS_CANCELLED).count(),
            'unpaid': qs.filter(payment_status='unpaid').count(),
        })

    @action(detail=False, methods=['post'])
    def checkout(self, request):
        if request.user.role != 'customer':
            return Response({'detail': 'Only customers can use this checkout endpoint.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = CustomerCheckoutSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        order = serializer.save()
        data = OrderDetailSerializer(order, context={'request': request}).data
        if order.payment_method == 'bakong':
            from apps.payments.serializers import BakongPaymentSerializer
            from apps.payments.services import create_or_refresh_bakong_payment
            payment = create_or_refresh_bakong_payment(order)
            data['bakong_payment'] = BakongPaymentSerializer(payment, context={'request': request}).data
        return Response(
            data,
            status=status.HTTP_201_CREATED,
        )


class PrepareRecordFilter(filters.FilterSet):
    date_from = filters.DateFilter(field_name='created_at', lookup_expr='date__gte')
    date_to = filters.DateFilter(field_name='created_at', lookup_expr='date__lte')

    class Meta:
        model = PrepareRecord
        fields = ['payment_status', 'set_type']


class PrepareRecordViewSet(viewsets.ModelViewSet):
    queryset = PrepareRecord.objects.all().select_related('created_by').order_by('-created_at')
    serializer_class = PrepareRecordSerializer
    permission_classes = [IsAuthenticated, IsStaff]
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
    permission_classes = [IsAuthenticated, IsStaff]
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
