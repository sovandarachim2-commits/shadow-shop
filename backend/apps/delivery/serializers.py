from rest_framework import serializers
from .models import DeliveryCompany, DeliveryZone, Delivery, DeliveryStatusHistory, DeliveryByConfig


class DeliveryZoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliveryZone
        fields = '__all__'


class DeliveryCompanySerializer(serializers.ModelSerializer):
    zones = DeliveryZoneSerializer(many=True, read_only=True)

    class Meta:
        model = DeliveryCompany
        fields = '__all__'


class DeliveryStatusHistorySerializer(serializers.ModelSerializer):
    changed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = DeliveryStatusHistory
        fields = '__all__'

    def get_changed_by_name(self, obj):
        return obj.changed_by.get_full_name() if obj.changed_by else 'System'


class DeliverySerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source='company.name', read_only=True)
    order_number = serializers.CharField(source='order.order_number', read_only=True)
    assigned_to_name = serializers.SerializerMethodField()
    status_history = DeliveryStatusHistorySerializer(many=True, read_only=True)
    tracking_url = serializers.SerializerMethodField()

    class Meta:
        model = Delivery
        fields = '__all__'

    def get_assigned_to_name(self, obj):
        return obj.assigned_to.get_full_name() if obj.assigned_to else None

    def get_tracking_url(self, obj):
        return obj.tracking_url


class DeliveryByConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliveryByConfig
        fields = '__all__'


class DeliveryCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Delivery
        fields = [
            'order', 'company', 'tracking_number', 'fee',
            'recipient_name', 'recipient_phone', 'delivery_address',
            'province', 'latitude', 'longitude', 'notes', 'assigned_to',
        ]
