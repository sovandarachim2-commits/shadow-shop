from rest_framework import viewsets, generics, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db.models import Sum, Count, Q
from .models import Stock, StockMovement, Warehouse, StockTransfer
from .serializers import (
    StockSerializer, StockMovementSerializer, StockMovementCreateSerializer,
    WarehouseSerializer, StockTransferSerializer,
)
from utils.permissions import IsAdminOrSuperAdmin, IsWarehouse, IsStaff


class StockViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Stock.objects.all().select_related('product__category').prefetch_related('product__images')
    serializer_class = StockSerializer
    permission_classes = [IsAuthenticated, IsStaff]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['product__category']
    search_fields = ['product__name', 'product__code']
    ordering_fields = ['quantity', 'updated_at']

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        from apps.products.models import Product
        total_products = Product.objects.filter(is_active=True).count()
        total_stock = Stock.objects.aggregate(total=Sum('quantity'))['total'] or 0
        low_stock = Stock.objects.filter(quantity__gt=0, quantity__lte=5).count()
        out_of_stock = Stock.objects.filter(quantity__lte=0).count()

        from apps.products.models import Product
        stock_value = sum(
            float(s.product.cost_price) * s.quantity
            for s in Stock.objects.select_related('product').filter(quantity__gt=0)
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
        stocks = Stock.objects.filter(quantity__gt=0, quantity__lte=5).select_related('product')
        serializer = self.get_serializer(stocks, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def out_of_stock(self, request):
        stocks = Stock.objects.filter(quantity__lte=0).select_related('product')
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
        diff = int(new_qty) - stock.quantity
        add_stock(
            product=stock.product,
            quantity=diff,
            movement_type='adjustment',
            notes=notes,
            user=request.user,
        )
        stock.refresh_from_db()
        return Response(StockSerializer(stock, context={'request': request}).data)


class StockMovementViewSet(viewsets.ModelViewSet):
    queryset = StockMovement.objects.all().select_related('product', 'created_by')
    permission_classes = [IsAuthenticated, IsStaff]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['type', 'product']
    search_fields = ['product__name', 'reference', 'notes']
    ordering_fields = ['created_at']

    def get_serializer_class(self):
        if self.action == 'create':
            return StockMovementCreateSerializer
        return StockMovementSerializer

    def perform_create(self, serializer):
        serializer.save()


class WarehouseViewSet(viewsets.ModelViewSet):
    queryset = Warehouse.objects.all()
    serializer_class = WarehouseSerializer
    permission_classes = [IsAuthenticated, IsAdminOrSuperAdmin]


class StockTransferViewSet(viewsets.ModelViewSet):
    queryset = StockTransfer.objects.all().select_related(
        'from_warehouse', 'to_warehouse', 'created_by'
    ).prefetch_related('items__product')
    serializer_class = StockTransferSerializer
    permission_classes = [IsAuthenticated, IsStaff]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status']
    search_fields = ['transfer_number']

    def perform_create(self, serializer):
        import datetime
        transfer_number = f"TRF{datetime.date.today().strftime('%y%m%d')}{StockTransfer.objects.count() + 1:04d}"
        serializer.save(created_by=self.request.user, transfer_number=transfer_number)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        transfer = self.get_object()
        from django.utils import timezone
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
