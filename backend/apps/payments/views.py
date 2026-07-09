from django.db import models
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.orders.models import Order
from .models import AbaPayment, BakongPayment
from .serializers import AbaPaymentSerializer, BakongPaymentSerializer
from .services import create_or_refresh_bakong_payment, check_bakong_status
from .aba_services import build_aba_payment_params, handle_aba_callback, verify_callback_hash


class BakongPaymentViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = BakongPaymentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = BakongPayment.objects.select_related('order', 'order__customer', 'pending_checkout', 'pending_checkout__user')
        user = self.request.user
        if getattr(user, 'role', None) == 'customer':
            return qs.filter(
                models.Q(order__customer__user=user) | models.Q(pending_checkout__user=user)
            )
        if getattr(user, 'role', None) == 'seller':
            return qs.filter(order__seller=user)
        return qs

    def _get_allowed_order(self, order_id):
        qs = Order.objects.select_related('customer', 'seller')
        user = self.request.user
        if getattr(user, 'role', None) == 'customer':
            qs = qs.filter(customer__user=user)
        elif getattr(user, 'role', None) == 'seller':
            qs = qs.filter(seller=user)
        return qs.get(pk=order_id)

    @action(detail=False, methods=['post'])
    def generate(self, request):
        order_id = request.data.get('order')
        if not order_id:
            return Response({'detail': 'Order is required.'}, status=status.HTTP_400_BAD_REQUEST)
        order = self._get_allowed_order(order_id)
        payment = create_or_refresh_bakong_payment(order)
        return Response(BakongPaymentSerializer(payment).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post', 'get'])
    def check(self, request, pk=None):
        payment = self.get_object()
        payment = check_bakong_status(payment, request.user, request=request)
        data = BakongPaymentSerializer(payment).data
        if payment.order_id:
            from apps.orders.serializers import OrderDetailSerializer
            data['order'] = OrderDetailSerializer(payment.order, context={'request': request}).data
        return Response(data)


class AbaPaymentViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AbaPaymentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = AbaPayment.objects.select_related('order', 'order__customer', 'pending_checkout', 'pending_checkout__user')
        user = self.request.user
        if getattr(user, 'role', None) == 'customer':
            return qs.filter(
                models.Q(order__customer__user=user) | models.Q(pending_checkout__user=user)
            )
        return qs

    def _get_allowed_order(self, order_id):
        qs = Order.objects.select_related('customer')
        user = self.request.user
        if getattr(user, 'role', None) == 'customer':
            qs = qs.filter(customer__user=user)
        return qs.get(pk=order_id)

    @action(detail=False, methods=['post'])
    def generate(self, request):
        order_id = request.data.get('order')
        if not order_id:
            return Response({'detail': 'Order is required.'}, status=status.HTTP_400_BAD_REQUEST)
        order = self._get_allowed_order(order_id)
        data = build_aba_payment_params(order)
        return Response(data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def callback(self, request):
        received_hash = request.headers.get('X-Payway-Hmac-Sha512', '')
        payload = request.data if isinstance(request.data, dict) else {}
        if received_hash and not verify_callback_hash(payload, received_hash):
            return Response({'detail': 'Invalid signature.'}, status=status.HTTP_400_BAD_REQUEST)
        handle_aba_callback(payload)
        return Response({'status': 'ok'})
