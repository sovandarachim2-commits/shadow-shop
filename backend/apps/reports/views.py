from rest_framework import generics
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Count, Avg, Q
from django.utils import timezone
import datetime
from utils.permissions import IsAdminOrSuperAdmin


class SalesReportView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, IsAdminOrSuperAdmin]

    def get(self, request):
        from apps.orders.models import Order
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        group_by = request.query_params.get('group_by', 'day')

        qs = Order.objects.filter(status__in=['completed', 'shipped'])

        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)

        from django.db.models.functions import TruncDay, TruncWeek, TruncMonth
        trunc_map = {
            'day': TruncDay,
            'week': TruncWeek,
            'month': TruncMonth,
        }
        trunc_fn = trunc_map.get(group_by, TruncDay)

        data = qs.annotate(
            period=trunc_fn('created_at')
        ).values('period').annotate(
            total_orders=Count('id'),
            total_revenue=Sum('grand_total'),
            total_items=Sum('items__quantity'),
        ).order_by('period')

        return Response(list(data))


class ProductReportView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, IsAdminOrSuperAdmin]

    def get(self, request):
        from apps.orders.models import OrderItem, Order
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')

        qs = OrderItem.objects.filter(order__status__in=['completed', 'shipped'])
        if date_from:
            qs = qs.filter(order__created_at__date__gte=date_from)
        if date_to:
            qs = qs.filter(order__created_at__date__lte=date_to)

        data = qs.values(
            'product_code', 'product_name'
        ).annotate(
            total_qty=Sum('quantity'),
            total_revenue=Sum('total_price'),
        ).order_by('-total_revenue')[:50]

        return Response(list(data))


class InventoryReportView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, IsAdminOrSuperAdmin]

    def get(self, request):
        from apps.inventory.models import Stock, StockMovement
        from apps.products.models import Product

        stocks = Stock.objects.all().select_related('product__category').order_by('product__name')
        data = []
        for stock in stocks:
            data.append({
                'product_code': stock.product.code,
                'product_name': stock.product.name,
                'category': stock.product.category.name if stock.product.category else '',
                'current_qty': stock.quantity,
                'min_qty': stock.min_quantity,
                'cost_price': float(stock.product.cost_price),
                'stock_value': float(stock.product.cost_price * stock.quantity),
                'status': 'out' if stock.quantity <= 0 else ('low' if stock.is_low_stock else 'ok'),
            })

        return Response(data)
