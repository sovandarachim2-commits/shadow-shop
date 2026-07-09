from datetime import datetime
from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.notifications.services import ONLINE_PAY_NOW_METHODS, TelegramService
from apps.orders.rewards import get_coupon_discount
from apps.orders.serializers import CustomerCheckoutSerializer
from .models import PendingCheckout


def preview_checkout_amount(request, checkout_data):
    serializer = CustomerCheckoutSerializer(data=checkout_data, context={'request': request})
    serializer.is_valid(raise_exception=True)
    validated = serializer.validated_data

    subtotal = Decimal('0')
    for item in validated['items']:
        subtotal += Decimal(str(item['unit_price'])) * int(item['quantity'])

    delivery_fee = Decimal(str(validated.get('delivery_fee') or 0))
    discount = Decimal('0')
    coupon_code = (validated.get('coupon_code') or '').strip()
    if coupon_code:
        _, discount = get_coupon_discount(
            request.user,
            coupon_code,
            subtotal,
            delivery_fee,
            lock=False,
        )

    return subtotal + delivery_fee - discount


@transaction.atomic
def create_customer_order(request, checkout_data, payment_status='unpaid'):
    payload = dict(checkout_data)
    payload['payment_status'] = payment_status
    serializer = CustomerCheckoutSerializer(data=payload, context={'request': request})
    serializer.is_valid(raise_exception=True)
    return serializer.save()


@transaction.atomic
def fulfill_pending_checkout(pending_checkout, request=None):
    pending_checkout = PendingCheckout.objects.select_for_update().get(pk=pending_checkout.pk)

    if pending_checkout.order_id:
        return pending_checkout.order

    if pending_checkout.status != PendingCheckout.STATUS_PENDING:
        raise ValidationError({'detail': 'This checkout session is no longer active.'})

    user = pending_checkout.user
    if request is None:
        class _Request:
            def __init__(self, checkout_user):
                self.user = checkout_user

            def build_absolute_uri(self, location=''):
                return location

        request = _Request(user)

    order = create_customer_order(
        request,
        pending_checkout.checkout_data,
        payment_status='paid',
    )
    pending_checkout.order = order
    pending_checkout.status = PendingCheckout.STATUS_PAID
    pending_checkout.save(update_fields=['order', 'status', 'updated_at'])

    transaction.on_commit(lambda: TelegramService.notify_new_order_async(order.id))
    return order


@transaction.atomic
def prepare_online_checkout(request, checkout_data):
    payment_method = checkout_data.get('payment_method')
    if payment_method not in ONLINE_PAY_NOW_METHODS:
        raise ValidationError({'payment_method': 'This payment method does not use deferred checkout.'})

    amount = preview_checkout_amount(request, checkout_data)
    expires_minutes = max(settings.BAKONG_EXPIRATION_MINUTES, 1)
    expires_at = timezone.now() + timezone.timedelta(minutes=expires_minutes)

    pending = PendingCheckout.objects.create(
        user=request.user,
        payment_method=payment_method,
        checkout_data=checkout_data,
        amount=amount,
        expires_at=expires_at,
    )

    result = {
        'pending_checkout': {
            'reference': pending.reference,
            'amount': str(pending.amount),
            'payment_method': pending.payment_method,
            'status': pending.status,
            'expires_at': pending.expires_at.isoformat(),
        },
    }

    if payment_method == 'bakong':
        from .services import create_bakong_payment_for_pending

        payment = create_bakong_payment_for_pending(pending)
        from .serializers import BakongPaymentSerializer

        result['bakong_payment'] = BakongPaymentSerializer(payment, context={'request': request}).data
    elif payment_method == 'aba':
        from .aba_services import build_aba_payment_params_for_pending

        result['aba_payment'] = build_aba_payment_params_for_pending(pending, request)

    return result


def get_pending_checkout_status(request, reference):
    pending = PendingCheckout.objects.select_related('order', 'order__customer').get(
        reference=reference,
        user=request.user,
    )
    data = {
        'reference': pending.reference,
        'status': pending.status,
        'payment_method': pending.payment_method,
        'amount': str(pending.amount),
        'expires_at': pending.expires_at.isoformat(),
        'order_id': pending.order_id,
        'order_number': pending.order.order_number if pending.order_id else None,
    }
    if pending.order_id:
        from apps.orders.serializers import OrderDetailSerializer

        data['order'] = OrderDetailSerializer(pending.order, context={'request': request}).data
    return data
