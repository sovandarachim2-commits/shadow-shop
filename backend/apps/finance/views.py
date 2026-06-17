from rest_framework import viewsets, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django_filters import rest_framework as filters
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db.models import Sum, Count
from django.utils import timezone
import datetime
from .models import ExpenseCategory, Expense, Revenue, DailySummary
from .serializers import (
    ExpenseCategorySerializer, ExpenseSerializer,
    RevenueSerializer, DailySummarySerializer,
)
from utils.permissions import IsAdminOrSuperAdmin, IsStaff


class ExpenseCategoryViewSet(viewsets.ModelViewSet):
    queryset = ExpenseCategory.objects.all()
    serializer_class = ExpenseCategorySerializer
    permission_classes = [IsAuthenticated, IsAdminOrSuperAdmin]


class ExpenseFilter(filters.FilterSet):
    date_from = filters.DateFilter(field_name='date', lookup_expr='gte')
    date_to = filters.DateFilter(field_name='date', lookup_expr='lte')

    class Meta:
        model = Expense
        fields = ['category', 'date']


class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.all().select_related('category', 'created_by').order_by('-date')
    serializer_class = ExpenseSerializer
    permission_classes = [IsAuthenticated, IsAdminOrSuperAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = ExpenseFilter
    search_fields = ['description', 'reference']

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class RevenueFilter(filters.FilterSet):
    date_from = filters.DateTimeFilter(field_name='received_at', lookup_expr='gte')
    date_to = filters.DateTimeFilter(field_name='received_at', lookup_expr='lte')

    class Meta:
        model = Revenue
        fields = ['payment_method']


class RevenueViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Revenue.objects.all().select_related('order__customer', 'received_by').order_by('-received_at')
    serializer_class = RevenueSerializer
    permission_classes = [IsAuthenticated, IsAdminOrSuperAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = RevenueFilter

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
