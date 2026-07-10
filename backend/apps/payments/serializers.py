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
    last_error = serializers.SerializerMethodField()

    class Meta:
        model = BakongPayment
        fields = [
            'id', 'order', 'order_number', 'reference', 'amount', 'currency', 'qr_payload',
            'qr_image', 'md5', 'status', 'expires_at', 'paid_at', 'created_at', 'last_error',
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

    def get_last_error(self, obj):
        data = obj.response_data if isinstance(obj.response_data, dict) else {}
        error = data.get('error')
        if error:
            return str(error)
        if data.get('success') is False and data.get('message'):
            return str(data.get('message'))
        return ''
