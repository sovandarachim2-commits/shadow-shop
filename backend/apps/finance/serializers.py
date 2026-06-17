from rest_framework import serializers
from .models import ExpenseCategory, Expense, Revenue, DailySummary


class ExpenseCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ExpenseCategory
        fields = '__all__'


class ExpenseSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Expense
        fields = '__all__'

    def get_created_by_name(self, obj):
        return obj.created_by.get_full_name() if obj.created_by else 'System'


class RevenueSerializer(serializers.ModelSerializer):
    order_number = serializers.CharField(source='order.order_number', read_only=True)
    received_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Revenue
        fields = '__all__'

    def get_received_by_name(self, obj):
        return obj.received_by.get_full_name() if obj.received_by else 'System'


class DailySummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = DailySummary
        fields = '__all__'
