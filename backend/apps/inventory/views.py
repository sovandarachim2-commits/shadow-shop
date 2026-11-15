from rest_framework import viewsets, generics, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db import transaction
from django.db.models import Sum, Count, Q, IntegerField, Value
from django.db.models.functions import Coalesce

SOLD_ORDER_STATUSES = ['new', 'confirmed', 'printed', 'preparing', 'packed', 'shipped', 'completed']


def with_sold_qty(queryset):
    return queryset.annotate(
        sold_qty=Coalesce(
            Sum(
                'product__order_items__quantity',
                filter=Q(
                    product__order_items__order__is_draft=False,
                    product__order_items__order__status__in=SOLD_ORDER_STATUSES,
                ),
            ),
            Value(0),
            output_field=IntegerField(),
        )
    )
from .models import Stock, StockMovement, Warehouse, StockTransfer
from .services import apply_transfer_to_storage
from .serializers import (
    StockSerializer, StockMovementSerializer, StockMovementCreateSerializer,
    WarehouseSerializer, StockTransferSerializer,
)
from utils.permissions import IsAdminOrSuperAdmin, IsWarehouse, IsStaff


class StockViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = with_sold_qty(
        Stock.objects.all().select_related('product__category').prefetch_related(
            'product__images',
            'product__warehouse_stocks__warehouse',
        )
    )
    serializer_class = StockSerializer
    permission_classes = [IsAuthenticated, IsStaff]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['product__category']
    search_fields = ['product__name', 'product__code']
    ordering_fields = ['quantity', 'updated_at']

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user or not user.is_authenticated:
            return qs.none()
        user_store_ids = list(user.store_memberships.filter(is_active=True).values_list('store_id', flat=True))
        if user_store_ids:
            return qs.filter(product__store_id__in=user_store_ids)
        elif user.role in ['store_owner', 'store_manager']:
            return qs.none()
        return qs

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        from apps.products.models import Product
        user = request.user
        user_store_ids = []
        if user.is_authenticated:
            user_store_ids = list(user.store_memberships.filter(is_active=True).values_list('store_id', flat=True))

        prod_qs = Product.objects.filter(is_active=True)
        stock_qs = Stock.objects.all()
        if user_store_ids:
            prod_qs = prod_qs.filter(store_id__in=user_store_ids)
            stock_qs = stock_qs.filter(product__store_id__in=user_store_ids)
        elif user.is_authenticated and user.role in ['store_owner', 'store_manager']:
            prod_qs = prod_qs.none()
            stock_qs = stock_qs.none()

        total_products = prod_qs.count()
        total_stock = stock_qs.aggregate(total=Sum('quantity'))['total'] or 0
        low_stock = stock_qs.filter(quantity__gt=0, quantity__lte=5).count()
        out_of_stock = stock_qs.filter(quantity__lte=0).count()

        stock_value = sum(
            float(s.product.cost_price) * s.quantity
            for s in stock_qs.select_related('product').filter(quantity__gt=0)
        )

        return Response({
            'total_products': total_products,
            'total_stock': total_stock,
            'low_stock': low_stock,
            'out_of_stock': out_of_stock,
            'stock_value': stock_value,
        })

    @action(detail=False, methods=['get'])
    def low_stock(self, request):
        stocks = with_sold_qty(self.get_queryset().filter(quantity__gt=0, quantity__lte=5))
        serializer = self.get_serializer(stocks, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def out_of_stock(self, request):
        stocks = with_sold_qty(self.get_queryset().filter(quantity__lte=0))
        serializer = self.get_serializer(stocks, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def adjust(self, request, pk=None):
        stock = self.get_object()
        new_qty = request.data.get('quantity')
        notes = request.data.get('notes', 'Manual adjustment')

        if new_qty is None:
            return Response({'detail': 'quantity is required.'}, status=status.HTTP_400_BAD_REQUEST)

        from .services import add_stock
        from apps.accounts.activity import log_activity
        diff = int(new_qty) - stock.quantity
        add_stock(
            product=stock.product,
            quantity=diff,
            movement_type='adjustment',
            notes=notes,
            user=request.user,
        )
        stock.refresh_from_db()
        log_activity(
            user=request.user,
            action='update',
            module='inventory',
            description=f'Adjusted stock for {stock.product.name} to {stock.quantity}',
            request=request,
            object_id=stock.product_id,
            object_type='Stock',
        )
        return Response(StockSerializer(stock, context={'request': request}).data)


class StockMovementViewSet(viewsets.ModelViewSet):
    queryset = StockMovement.objects.all().select_related('product', 'created_by').prefetch_related(
        'product__warehouse_stocks__warehouse',
    )
    permission_classes = [IsAuthenticated, IsStaff]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['type', 'product']
    search_fields = ['product__name', 'reference', 'notes']
    ordering_fields = ['created_at']

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user or not user.is_authenticated:
            return qs.none()
        user_store_ids = list(user.store_memberships.filter(is_active=True).values_list('store_id', flat=True))
        if user_store_ids:
            return qs.filter(product__store_id__in=user_store_ids)
        elif user.role in ['store_owner', 'store_manager']:
            return qs.none()
        return qs

    def get_serializer_class(self):
        if self.action == 'create':
            return StockMovementCreateSerializer
        return StockMovementSerializer

    def perform_create(self, serializer):
        serializer.save()


class WarehouseViewSet(viewsets.ModelViewSet):
    serializer_class = WarehouseSerializer
    permission_classes = [IsAuthenticated, IsStaff]

    def get_queryset(self):
        from .services import ensure_default_warehouse
        from apps.stores.models import Store

        user = self.request.user
        qs = Warehouse.objects.prefetch_related('stocks').annotate(
            product_count=Count('stocks', filter=Q(stocks__quantity__gt=0), distinct=True),
            total_quantity=Coalesce(Sum('stocks__quantity', filter=Q(stocks__quantity__gt=0)), 0),
        )

        if not user or not user.is_authenticated:
            return qs.none()

        # Check if user is staff belonging to a partner store
        user_store_ids = list(user.store_memberships.filter(is_active=True).values_list('store_id', flat=True))
        if user_store_ids:
            for store_id in user_store_ids:
                try:
                    store = Store.objects.filter(id=store_id).first()
                    if store:
                        ensure_default_warehouse(store=store)
                except Exception:
                    pass
            return qs.filter(store_id__in=user_store_ids).order_by('id')

        if user.role in ('super_admin', 'admin'):
            params = getattr(self.request, 'query_params', None) or getattr(self.request, 'GET', {})
            store_filter = params.get('store')
            if store_filter:
                clean = str(store_filter).strip()
                if clean in ('direct', 'official', 'null', '0'):
                    ensure_default_warehouse(store=None)
                    return qs.filter(store__isnull=True).order_by('id')
                elif clean.isdigit():
                    store = Store.objects.filter(id=int(clean)).first()
                    if store:
                        ensure_default_warehouse(store=store)
                    return qs.filter(store_id=int(clean)).order_by('id')

            ensure_default_warehouse(store=None)
            return qs.order_by('id')

        # Other staff without store membership (e.g. official store staff)
        ensure_default_warehouse(store=None)
        return qs.filter(store__isnull=True).order_by('id')

    def perform_create(self, serializer):
        user = self.request.user
        store = None
        if user.is_authenticated:
            user_store_ids = list(user.store_memberships.filter(is_active=True).values_list('store_id', flat=True))
            if user_store_ids:
                from apps.stores.models import Store
                store = Store.objects.filter(id=user_store_ids[0]).first()
            elif user.role in ('super_admin', 'admin'):
                store_id = self.request.data.get('store') or self.request.data.get('store_id')
                if store_id and str(store_id).isdigit():
                    from apps.stores.models import Store
                    store = Store.objects.filter(id=int(store_id)).first()
        serializer.save(store=store)


class StockTransferViewSet(viewsets.ModelViewSet):
    queryset = StockTransfer.objects.all().select_related(
        'from_warehouse', 'to_warehouse', 'created_by'
    ).prefetch_related('items__product')
    serializer_class = StockTransferSerializer
    permission_classes = [IsAuthenticated, IsStaff]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status']
    search_fields = ['transfer_number']

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user or not user.is_authenticated:
            return qs.none()
        user_store_ids = list(user.store_memberships.filter(is_active=True).values_list('store_id', flat=True))
        if user_store_ids:
            return qs.filter(
                Q(from_warehouse__store_id__in=user_store_ids) |
                Q(to_warehouse__store_id__in=user_store_ids)
            ).distinct()
        elif user.role in ['store_owner', 'store_manager']:
            return qs.none()
        return qs

    def perform_create(self, serializer):
        import datetime
        transfer_number = f"TRF{datetime.date.today().strftime('%y%m%d')}{StockTransfer.objects.count() + 1:04d}"
        serializer.save(created_by=self.request.user, transfer_number=transfer_number)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        transfer = self.get_object()
        if transfer.status == 'completed':
            return Response({'detail': 'Transfer is already completed.'}, status=400)
        if transfer.status == 'cancelled':
            return Response({'detail': 'Cancelled transfers cannot be completed.'}, status=400)
        from django.utils import timezone
        with transaction.atomic():
            apply_transfer_to_storage(transfer)
            transfer.status = 'completed'
            transfer.completed_at = timezone.now()
            transfer.approved_by = request.user
            transfer.save()
        return Response({'status': 'completed'})

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        transfer = self.get_object()
        if transfer.status == 'completed':
            return Response({'detail': 'Completed transfers cannot be cancelled.'}, status=400)
        transfer.status = 'cancelled'
        transfer.save()
        return Response({'status': 'cancelled'})
