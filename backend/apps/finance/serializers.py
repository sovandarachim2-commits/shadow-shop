from rest_framework import serializers
from apps.orders.serializers import display_seller_name
from .models import ExpenseCategory, Expense, ExpenseAudit, Revenue, DailySummary


class ExpenseCategorySerializer(serializers.ModelSerializer):
    parent_name = serializers.SerializerMethodField()

    class Meta:
        model = ExpenseCategory
        fields = '__all__'

    def get_parent_name(self, obj):
        return obj.parent.name if obj.parent_id else ''

    def validate_parent(self, parent):
        if parent is None:
            return parent
        if self.instance and parent.pk == self.instance.pk:
            raise serializers.ValidationError('A category cannot be its own parent.')
        if parent.parent_id:
            raise serializers.ValidationError('Choose a main category. A subcategory cannot have its own subcategory.')
        if self.instance and self.instance.children.exists():
            raise serializers.ValidationError('This category already has subcategories.')
        return parent


class ExpenseSerializer(serializers.ModelSerializer):
    category_name = serializers.SerializerMethodField()
    subcategory_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Expense
        fields = '__all__'

    def validate(self, attrs):
        if self.instance and 'category' not in attrs:
            return attrs
        category = attrs.get('category')
        if category is None or not category.parent_id:
            raise serializers.ValidationError({'category': 'Main category and subcategory are required.'})
        return attrs

    def get_category_name(self, obj):
        if not obj.category_id:
            return ''
        if obj.category.parent_id:
            return obj.category.parent.name
        return obj.category.name

    def get_subcategory_name(self, obj):
        if obj.category_id and obj.category.parent_id:
            return obj.category.name
        return ''

    def get_created_by_name(self, obj):
        if not obj.created_by:
            return 'System'
        return obj.created_by.get_full_name() or obj.created_by.username


class ExpenseAuditSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = ExpenseAudit
        fields = ['id', 'action', 'user_name', 'changes', 'created_at']

    def get_user_name(self, obj):
        if not obj.user:
            return 'System'
        return obj.user.get_full_name() or obj.user.username


class RevenueSerializer(serializers.ModelSerializer):
    order_number = serializers.SerializerMethodField()
    order_date = serializers.SerializerMethodField()
    order_status = serializers.SerializerMethodField()
    customer_name = serializers.SerializerMethodField()
    customer_phone = serializers.SerializerMethodField()
    seller_name = serializers.SerializerMethodField()
    items = serializers.SerializerMethodField()
    received_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Revenue
        fields = '__all__'

    def _customer(self, obj):
        return getattr(getattr(obj, 'order', None), 'customer', None)

    def get_order_number(self, obj):
        return obj.order.order_number if obj.order_id else ''

    def get_order_date(self, obj):
        return obj.order.created_at if obj.order_id else None

    def get_order_status(self, obj):
        return obj.order.status if obj.order_id else ''

    def get_customer_name(self, obj):
        customer = self._customer(obj)
        return customer.name if customer else ''

    def get_customer_phone(self, obj):
        customer = self._customer(obj)
        return customer.phone if customer else ''

    def get_seller_name(self, obj):
        if not obj.order_id:
            return ''
        return display_seller_name(obj.order)

    def get_items(self, obj):
        if not obj.order_id:
            return []
        return [
            {'name': item.product_name, 'quantity': item.quantity}
            for item in obj.order.items.all()
        ]

    def get_received_by_name(self, obj):
        if not obj.received_by:
            return 'System'
        return obj.received_by.get_full_name() or obj.received_by.username


class DailySummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = DailySummary
        fields = '__all__'
