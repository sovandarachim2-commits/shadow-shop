from rest_framework import viewsets, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django_filters import rest_framework as filters
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db.models import Sum, Count, Q
from django.utils import timezone
import datetime
from .models import ExpenseCategory, Expense, ExpenseAudit, Revenue, DailySummary
from .serializers import (
    ExpenseCategorySerializer, ExpenseSerializer, ExpenseAuditSerializer,
    RevenueSerializer, DailySummarySerializer,
)
from utils.permissions import IsAdminOrSuperAdmin, IsStaff


class ExpenseCategoryViewSet(viewsets.ModelViewSet):
    queryset = ExpenseCategory.objects.select_related('parent').order_by('name')
    serializer_class = ExpenseCategorySerializer
    permission_classes = [IsAuthenticated, IsAdminOrSuperAdmin]


class ExpenseFilter(filters.FilterSet):
    date_from = filters.DateFilter(field_name='date', lookup_expr='gte')
    date_to = filters.DateFilter(field_name='date', lookup_expr='lte')

    class Meta:
        model = Expense
        fields = ['category', 'date']


class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.all().select_related('category', 'category__parent', 'created_by').order_by('-date')
    serializer_class = ExpenseSerializer
    permission_classes = [IsAuthenticated, IsAdminOrSuperAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = ExpenseFilter
    search_fields = ['description', 'reference']

    def perform_create(self, serializer):
        expense = serializer.save(created_by=self.request.user)
        _write_expense_audit(expense, self.request.user, 'created')

    def perform_update(self, serializer):
        before = _expense_snapshot(serializer.instance)
        expense = serializer.save()
        _write_expense_audit(expense, self.request.user, 'updated', before)

    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        expense = self.get_object()
        logs = expense.audits.select_related('user')
        data = ExpenseAuditSerializer(logs, many=True).data
        recorded = _recorded_changes(_expense_snapshot(expense))
        has_update = any(item['action'] == 'updated' for item in data)
        if not any(item['action'] == 'created' for item in data):
            data.append({
                'id': None,
                'action': 'created',
                'user_name': _user_name(expense.created_by),
                'changes': [] if has_update else recorded,
                'created_at': expense.created_at.isoformat() if expense.created_at else '',
            })
        elif not has_update:
            for item in data:
                if item['action'] == 'created' and not item.get('changes'):
                    item['changes'] = recorded
        data.sort(key=lambda item: item['created_at'] or '', reverse=True)
        return Response(data)


def _user_name(user):
    if not user:
        return 'System'
    return user.get_full_name() or user.username


def _category_label(category):
    if not category:
        return ''
    if category.parent_id:
        parent_name = category.parent.name if category.parent_id else ''
        return f'{parent_name} / {category.name}'.strip(' /')
    return category.name


def _expense_snapshot(expense):
    category = expense.category
    if category and category.parent_id and not getattr(category, 'parent', None):
        category = ExpenseCategory.objects.select_related('parent').filter(pk=category.pk).first()
    return {
        'Description': expense.description or '',
        'Amount': f'{expense.amount:.2f}',
        'Date': expense.date.isoformat() if expense.date else '',
        'Main Category': _category_label(category).split(' / ')[0] if category else '',
        'Subcategory': category.name if category and category.parent_id else '',
        'Notes': expense.notes or '',
    }


def _recorded_changes(snapshot):
    return [
        {'field': field, 'from': '', 'to': value}
        for field, value in snapshot.items()
        if value and field != 'Notes'
    ]


def _write_expense_audit(expense, user, action, before=None):
    current = Expense.objects.select_related('category', 'category__parent').get(pk=expense.pk)
    after = _expense_snapshot(current)
    if before:
        changes = [
            {'field': field, 'from': old_value, 'to': after[field]}
            for field, old_value in before.items()
            if old_value != after[field] and field != 'Notes'
        ]
        if not changes:
            return
    else:
        changes = _recorded_changes(after)
    ExpenseAudit.objects.create(expense=current, action=action, user=user, changes=changes)


class RevenueFilter(filters.FilterSet):
    date_from = filters.DateTimeFilter(field_name='order__created_at', lookup_expr='gte')
    date_to = filters.DateTimeFilter(field_name='order__created_at', lookup_expr='lte')
    order_status = filters.CharFilter(method='filter_order_status')
    payment_method = filters.CharFilter(method='filter_payment_method')
    seller_ids = filters.CharFilter(method='filter_sellers')

    STATUS_GROUPS = {
        'pending': ['new', 'pending'],
        'confirmed': ['confirmed', 'printed'],
        'preparing': ['preparing'],
        'packed': ['packed'],
        'shipped': ['shipped'],
        'delivered': ['completed'],
        'cancelled': ['cancelled'],
    }

    class Meta:
        model = Revenue
        fields = ['payment_method']

    def filter_order_status(self, queryset, name, value):
        statuses = []
        for selected in filter(None, value.split(',')):
            statuses.extend(self.STATUS_GROUPS.get(selected, [selected]))
        return queryset.filter(order__status__in=statuses)

    def filter_payment_method(self, queryset, name, value):
        methods = [method for method in value.split(',') if method]
        return queryset.filter(payment_method__in=methods)

    def filter_sellers(self, queryset, name, value):
        selected = [seller for seller in value.split(',') if seller]
        seller_ids = [seller for seller in selected if seller != 'shadow_shop']
        seller_query = Q()
        if 'shadow_shop' in selected:
            seller_query |= Q(order__seller__isnull=True)
        if seller_ids:
            seller_query |= Q(order__seller_id__in=seller_ids)
        return queryset.filter(seller_query)


class RevenueViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Revenue.objects.all().select_related(
        'order__customer', 'order__seller', 'received_by'
    ).prefetch_related('order__items').order_by('-received_at')
    serializer_class = RevenueSerializer
    permission_classes = [IsAuthenticated, IsAdminOrSuperAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = RevenueFilter
    search_fields = [
        'order__order_number', 'reference', 'order__customer__name', 'order__customer__phone',
        'received_by__username', 'received_by__first_name', 'received_by__last_name',
    ]

    @action(detail=False, methods=['get'])
    def filter_counts(self, request):
        params = request.query_params.copy()
        selected_statuses = params.pop('order_status', [])
        selected_methods = params.pop('payment_method', [])
        selected_sellers = params.pop('seller_ids', [])
        queryset = RevenueFilter(data=params, queryset=self.get_queryset(), request=request).qs
        queryset = SearchFilter().filter_queryset(request, queryset, self)

        status_queryset = queryset
        if selected_methods:
            methods = [method for value in selected_methods for method in value.split(',') if method]
            status_queryset = status_queryset.filter(payment_method__in=methods)

        payment_queryset = queryset
        if selected_statuses:
            statuses = []
            for value in selected_statuses:
                for selected in filter(None, value.split(',')):
                    statuses.extend(RevenueFilter.STATUS_GROUPS.get(selected, [selected]))
            payment_queryset = payment_queryset.filter(order__status__in=statuses)

        seller_queryset = queryset
        if selected_methods:
            methods = [method for value in selected_methods for method in value.split(',') if method]
            seller_queryset = seller_queryset.filter(payment_method__in=methods)
        if selected_statuses:
            statuses = []
            for value in selected_statuses:
                for selected in filter(None, value.split(',')):
                    statuses.extend(RevenueFilter.STATUS_GROUPS.get(selected, [selected]))
            seller_queryset = seller_queryset.filter(order__status__in=statuses)

        if selected_sellers:
            selected = [seller for value in selected_sellers for seller in value.split(',') if seller]
            seller_ids = [seller for seller in selected if seller != 'shadow_shop']
            seller_query = Q()
            if 'shadow_shop' in selected:
                seller_query |= Q(order__seller__isnull=True)
            if seller_ids:
                seller_query |= Q(order__seller_id__in=seller_ids)
            status_queryset = status_queryset.filter(seller_query)
            payment_queryset = payment_queryset.filter(seller_query)

        status_counts = status_queryset.order_by().values('order__status').annotate(count=Count('id'))
        payment_counts = payment_queryset.order_by().values('payment_method').annotate(count=Count('id'))
        seller_counts = seller_queryset.order_by().values('order__seller_id').annotate(count=Count('id'))
        return Response({
            'statuses': {row['order__status']: row['count'] for row in status_counts},
            'payments': {row['payment_method']: row['count'] for row in payment_counts},
            'sellers': {str(row['order__seller_id']) if row['order__seller_id'] else 'shadow_shop': row['count'] for row in seller_counts},
        })

    @action(detail=False, methods=['get'])
    def summary(self, request):
        today = timezone.now().date()
        month_start = today.replace(day=1)

        daily = Revenue.objects.filter(received_at__date=today).aggregate(
            total=Sum('amount')
        )['total'] or 0

        monthly = Revenue.objects.filter(received_at__date__gte=month_start).aggregate(
            total=Sum('amount')
        )['total'] or 0

        expenses_today = Expense.objects.filter(date=today).aggregate(
            total=Sum('amount')
        )['total'] or 0

        expenses_month = Expense.objects.filter(date__gte=month_start).aggregate(
            total=Sum('amount')
        )['total'] or 0

        return Response({
            'daily_revenue': float(daily),
            'monthly_revenue': float(monthly),
            'daily_expenses': float(expenses_today),
            'monthly_expenses': float(expenses_month),
            'daily_profit': float(daily - expenses_today),
            'monthly_profit': float(monthly - expenses_month),
        })

    @action(detail=False, methods=['get'])
    def monthly_chart(self, request):
        today = timezone.now().date()
        data = []
        for i in range(12):
            month = today.replace(day=1) - datetime.timedelta(days=30 * i)
            revenue = Revenue.objects.filter(
                received_at__year=month.year,
                received_at__month=month.month
            ).aggregate(total=Sum('amount'))['total'] or 0
            expenses = Expense.objects.filter(
                date__year=month.year,
                date__month=month.month
            ).aggregate(total=Sum('amount'))['total'] or 0
            data.append({
                'month': month.strftime('%b %Y'),
                'revenue': float(revenue),
                'expenses': float(expenses),
                'profit': float(revenue - expenses),
            })
        data.reverse()
        return Response(data)


class DailySummaryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = DailySummary.objects.all().order_by('-date')
    serializer_class = DailySummarySerializer
    permission_classes = [IsAuthenticated, IsAdminOrSuperAdmin]
