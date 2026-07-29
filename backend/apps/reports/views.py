from rest_framework import generics
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from collections import defaultdict
from decimal import Decimal
from django.db.models import Prefetch, Q
from django.db.models import Sum
from django.utils.dateparse import parse_date
from django.utils import timezone
import datetime
from utils.permissions import IsAdminOrSuperAdmin


class SalesReportView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, IsAdminOrSuperAdmin]

    def get(self, request):
        from apps.orders.models import Order, OrderStatusHistory
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        group_by = request.query_params.get('group_by', 'day')
        brand_id = request.query_params.get('brand_id')
        category_id = request.query_params.get('category_id')
        payment_method = request.query_params.get('payment_method')
        brand_ids = [
            value for value in (request.query_params.get('brand_ids') or brand_id or '').split(',')
            if value.strip()
        ]
        category_ids = [
            value for value in (request.query_params.get('category_ids') or category_id or '').split(',')
            if value.strip()
        ]
        payment_methods = [
            value for value in (request.query_params.get('payment_methods') or payment_method or '').split(',')
            if value.strip()
        ]
        seller_ids = [
            value for value in (request.query_params.get('seller_ids') or '').split(',')
            if value.strip()
        ]
        payment_statuses = [
            value for value in (request.query_params.get('payment_statuses') or '').split(',')
            if value.strip()
        ]
        order_statuses = [
            value for value in (request.query_params.get('order_statuses') or '').split(',')
            if value.strip()
        ]
        search = (request.query_params.get('search') or '').strip()

        qs = Order.objects.filter(is_draft=False).select_related(
            'customer',
            'seller',
        ).prefetch_related(
            'items',
            'items__product',
            Prefetch(
                'status_history',
                queryset=OrderStatusHistory.objects.select_related('changed_by').order_by('created_at'),
                to_attr='ordered_status_history',
            ),
        )
        current_tz = timezone.get_current_timezone()
        parsed_from = parse_date(date_from) if date_from else None
        parsed_to = parse_date(date_to) if date_to else None

        if payment_methods:
            qs = qs.filter(payment_method__in=payment_methods)
        if seller_ids:
            seller_q = Q()
            real_seller_ids = [value for value in seller_ids if value != 'shadow_shop']
            if real_seller_ids:
                seller_q |= Q(seller_id__in=real_seller_ids)
            if 'shadow_shop' in seller_ids:
                seller_q |= Q(seller__isnull=True)
            qs = qs.filter(seller_q)
        if payment_statuses:
            qs = qs.filter(payment_status__in=payment_statuses)
        if order_statuses:
            status_q = Q()
            for status in order_statuses:
                if status == 'pending':
                    status_q |= Q(status__in=['new', 'confirmed'])
                elif status == 'processing':
                    status_q |= Q(status__in=['confirmed', 'printed', 'preparing', 'packed'])
                elif status == 'delivered':
                    status_q |= Q(status='completed')
                else:
                    status_q |= Q(status=status)
            qs = qs.filter(status_q)
        if date_from:
            if parsed_from:
                start = timezone.make_aware(datetime.datetime.combine(parsed_from, datetime.time.min), current_tz)
                qs = qs.filter(created_at__gte=start)
        if date_to:
            if parsed_to:
                end = timezone.make_aware(datetime.datetime.combine(parsed_to + datetime.timedelta(days=1), datetime.time.min), current_tz)
                qs = qs.filter(created_at__lt=end)
        if brand_ids:
            qs = qs.filter(items__product__brand_id__in=brand_ids)
        if category_ids:
            qs = qs.filter(items__product__category_id__in=category_ids)
        if search:
            qs = qs.filter(
                Q(order_number__icontains=search)
                | Q(customer__name__icontains=search)
                | Q(customer__phone__icontains=search)
                | Q(items__product_name__icontains=search)
                | Q(items__product_code__icontains=search)
            )

        qs = qs.distinct()

        def period_for(order):
            local_date = timezone.localtime(order.created_at, current_tz).date()
            if group_by == 'week':
                return local_date - datetime.timedelta(days=local_date.weekday())
            if group_by == 'month':
                return local_date.replace(day=1)
            return local_date

        item_scoped = bool(brand_ids or category_ids)

        def matching_items(order):
            items = list(order.items.all())
            if brand_ids:
                items = [item for item in items if item.product and str(item.product.brand_id or '') in brand_ids]
            if category_ids:
                items = [item for item in items if item.product and str(item.product.category_id or '') in category_ids]
            return items

        grouped = defaultdict(lambda: {
            'total_orders': 0,
            'total_revenue': Decimal('0'),
            'total_items': 0,
        })
        order_rows = []

        for order in qs.order_by('created_at'):
            period = period_for(order)
            items = matching_items(order)
            amount = (
                sum((item.total_price for item in items), Decimal('0'))
                if item_scoped else order.grand_total
            )
            items_count = sum(item.quantity for item in items)
            grouped[period]['total_orders'] += 1
            grouped[period]['total_revenue'] += amount
            grouped[period]['total_items'] += items_count

            customer = order.customer
            seller = order.seller
            item_summary = str(items_count)
            product_summary = ', '.join(
                f'{item.product_name} x{item.quantity}' for item in items[:3]
            )
            if len(items) > 3:
                product_summary = f'{product_summary}, +{len(items) - 3} more'
            brand_values = sorted({
                str(item.product.brand_id)
                for item in items
                if item.product and item.product.brand_id
            })
            category_values = sorted({
                str(item.product.category_id)
                for item in items
                if item.product and item.product.category_id
            })
            status_history = []
            for history in getattr(order, 'ordered_status_history', []):
                changed_by = history.changed_by
                status_history.append({
                    'id': history.id,
                    'status': history.status,
                    'note': history.note,
                    'changed_by_name': (
                        changed_by.get_full_name() or changed_by.username
                    ) if changed_by else '',
                    'created_at': history.created_at,
                })

            order_rows.append({
                'id': order.id,
                'order_id': order.id,
                'received_at': order.created_at,
                'order_number': order.order_number,
                'reference': order.order_number,
                'customer_name': customer.name if customer else '',
                'customer_phone': customer.phone if customer else '',
                'seller_id': str(seller.id) if seller else 'shadow_shop',
                'seller_name': (seller.get_full_name() or seller.username) if seller else 'Shadow Shop',
                'payment_method': order.payment_method,
                'order_status': order.status,
                'payment_status': order.payment_status,
                'brand_ids': brand_values,
                'category_ids': category_values,
                'product_summary': product_summary,
                'items_count': items_count,
                'items_summary': item_summary,
                'amount': float(amount),
                'status_history': status_history,
            })

        if group_by == 'day' and grouped:
            first_period = parsed_from or min(grouped.keys())
            last_period = parsed_to or max(grouped.keys())
            cursor = first_period
            while cursor <= last_period:
                grouped[cursor]
                cursor += datetime.timedelta(days=1)

        summary_rows = []
        for period, row in sorted(grouped.items()):
            total_orders = row['total_orders']
            total_revenue = row['total_revenue']
            summary_rows.append({
                'period': period.isoformat(),
                'total_orders': total_orders,
                'total_revenue': float(total_revenue),
                'total_items': row['total_items'],
                'avg_order_value': float(total_revenue / total_orders) if total_orders else 0,
            })

        return Response({
            'summary_rows': summary_rows,
            'order_rows': order_rows,
        })


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
