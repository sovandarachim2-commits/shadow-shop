from rest_framework import serializers
from .models import AbaPayment, BakongPayment


class AbaPaymentSerializer(serializers.ModelSerializer):
    order_number = serializers.CharField(source='order.order_number', read_only=True)

    class Meta:
        model = AbaPayment
        fields = ['id', 'order', 'order_number', 'tran_id', 'amount', 'currency', 'status', 'apv', 'paid_at', 'created_at']
        read_only_fields = fields


class BakongPaymentSerializer(serializers.ModelSerializer):
    order_number = serializers.CharField(source='order.order_number', read_only=True)

    class Meta:
        model = BakongPayment
        fields = [
            'id', 'order', 'order_number', 'amount', 'currency', 'qr_payload',
            'qr_image', 'md5', 'status', 'expires_at', 'paid_at', 'created_at',
        ]
        read_only_fields = fields

