from rest_framework import serializers
from .models import AbaPayment, BakongPayment


class AbaPaymentSerializer(serializers.ModelSerializer):
    order_number = serializers.SerializerMethodField()
    reference = serializers.SerializerMethodField()

    class Meta:
        model = AbaPayment
        fields = [
            'id', 'order', 'order_number', 'reference', 'tran_id', 'amount', 'currency',
            'status', 'apv', 'paid_at', 'created_at',
        ]
        read_only_fields = fields

    def get_order_number(self, obj):
        if obj.order_id:
            return obj.order.order_number
        if obj.pending_checkout_id:
            return obj.pending_checkout.reference
        return obj.tran_id

    def get_reference(self, obj):
        return obj.pending_checkout.reference if obj.pending_checkout_id else None


class BakongPaymentSerializer(serializers.ModelSerializer):
    order_number = serializers.SerializerMethodField()
    reference = serializers.SerializerMethodField()

    class Meta:
        model = BakongPayment
        fields = [
            'id', 'order', 'order_number', 'reference', 'amount', 'currency', 'qr_payload',
            'qr_image', 'md5', 'status', 'expires_at', 'paid_at', 'created_at',
        ]
        read_only_fields = fields

    def get_order_number(self, obj):
        if obj.order_id:
            return obj.order.order_number
        if obj.pending_checkout_id:
            return obj.pending_checkout.reference
        return None

    def get_reference(self, obj):
        return obj.pending_checkout.reference if obj.pending_checkout_id else None
