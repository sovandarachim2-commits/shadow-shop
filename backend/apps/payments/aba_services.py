import hashlib
import hmac
import base64
import json
from datetime import datetime

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.finance.models import Revenue
from apps.notifications.services import TelegramService
from apps.orders.rewards import award_points_for_paid_order
from .models import AbaPayment, PendingCheckout


PAYWAY_SANDBOX_URL = 'https://checkout-sandbox.payway.com.kh/api/payment-gateway/v1/payments/purchase'
PAYWAY_PROD_URL = 'https://checkout.payway.com.kh/api/payment-gateway/v1/payments/purchase'


PAYWAY_HASH_FIELDS = [
    'req_time',
    'merchant_id',
    'tran_id',
    'amount',
    'items',
    'shipping',
    'firstname',
    'lastname',
    'email',
    'phone',
    'type',
    'payment_option',
    'return_url',
    'cancel_url',
    'continue_success_url',
    'return_deeplink',
    'currency',
    'custom_fields',
    'return_params',
    'payout',
    'lifetime',
    'additional_params',
    'google_pay_token',
]


def _aba_hash(fields: dict) -> str:
    payload = ''.join(str(fields.get(field, '')) for field in PAYWAY_HASH_FIELDS)
    key = settings.ABA_PAYWAY_API_KEY.encode('utf-8')
    digest = hmac.new(key, payload.encode('utf-8'), hashlib.sha512).digest()
    return base64.b64encode(digest).decode('utf-8')


def get_payway_endpoint():
    return PAYWAY_SANDBOX_URL if settings.ABA_PAYWAY_IS_SANDBOX else PAYWAY_PROD_URL


def _checkout_items_for_aba(checkout_data):
    from apps.products.models import Product, ProductSet

    items = []
    for item in checkout_data.get('items', []):
        name = 'Shadow Shop Item'
        product_id = item.get('product')
        product_set_id = item.get('product_set')
        if product_id:
            try:
                name = Product.objects.get(pk=product_id).name
            except Product.DoesNotExist:
                pass
        elif product_set_id:
            try:
                name = ProductSet.objects.get(pk=product_set_id).name
            except ProductSet.DoesNotExist:
                pass
        items.append({
            'name': name[:100],
            'quantity': item['quantity'],
            'price': f"{float(item['unit_price']):.2f}",
        })
    return items


def _build_aba_params(tran_id, amount, checkout_data, request_user, order_number=None):
    merchant_id = settings.ABA_PAYWAY_MERCHANT_ID
    req_time = datetime.now().strftime('%Y%m%d%H%M%S')
    amount_text = f"{float(amount):.2f}"
    currency = 'USD'

    full_name = (checkout_data.get('name') or request_user.get_full_name() or request_user.username or '')[:50]
    name_parts = full_name.split(' ', 1)
    firstname = name_parts[0][:50]
    lastname = (name_parts[1] if len(name_parts) > 1 else '')[:50]
    phone = (checkout_data.get('phone') or getattr(request_user, 'phone', '') or '')[:20]
    email = (checkout_data.get('email') or request_user.email or '')[:100]

    frontend_url = settings.FRONTEND_URL.rstrip('/')
    continue_success_url = f"{frontend_url}/order-success?reference={tran_id}"
    cancel_url = f"{frontend_url}/checkout"
    return_url = f"{settings.BACKEND_URL.rstrip('/')}/api/payments/aba/callback/"

    encoded_items = base64.b64encode(
        json.dumps(_checkout_items_for_aba(checkout_data), separators=(',', ':')).encode('utf-8')
    ).decode('utf-8')
    return_params = base64.b64encode(
        json.dumps({'reference': tran_id, 'order': order_number or ''}, separators=(',', ':')).encode('utf-8')
    ).decode('utf-8')

    params = {
        'tran_id': tran_id,
        'amount': amount_text,
        'merchant_id': merchant_id,
        'req_time': req_time,
        'payment_option': 'abapay',
        'currency': currency,
        'items': encoded_items,
        'shipping': '0.00',
        'firstname': firstname,
        'lastname': lastname,
        'phone': phone,
        'email': email,
        'type': 'purchase',
        'return_url': return_url,
        'continue_success_url': continue_success_url,
        'cancel_url': cancel_url,
        'return_deeplink': continue_success_url,
        'custom_fields': '',
        'return_params': return_params,
        'payout': '',
        'lifetime': '',
        'additional_params': '',
        'google_pay_token': '',
    }
    params['hash'] = _aba_hash(params)
    return params


def build_aba_payment_params_for_pending(pending_checkout, request):
    params = _build_aba_params(
        pending_checkout.reference,
        pending_checkout.amount,
        pending_checkout.checkout_data,
        request.user,
    )
    AbaPayment.objects.update_or_create(
        pending_checkout=pending_checkout,
        defaults={
            'tran_id': pending_checkout.reference,
            'amount': pending_checkout.amount,
            'currency': 'USD',
            'status': 'pending',
            'apv': '',
            'response_data': {},
            'paid_at': None,
            'order': None,
        },
    )
    return {
        'endpoint': get_payway_endpoint(),
        'params': params,
    }


def build_aba_payment_params(order):
    checkout_data = {
        'name': order.customer.name,
        'phone': order.customer.phone,
        'email': order.customer.email,
        'items': [
            {
                'product_name': item.product_name,
                'quantity': item.quantity,
                'unit_price': item.unit_price,
            }
            for item in order.items.all()
        ],
    }
    for item, source in zip(checkout_data['items'], order.items.all()):
        if source.product_id:
            item['product'] = source.product_id
        elif source.product_set_id:
            item['product_set'] = source.product_set_id

    params = _build_aba_params(
        order.order_number,
        order.grand_total,
        checkout_data,
        order.customer.user,
        order_number=order.order_number,
    )

    AbaPayment.objects.update_or_create(
        order=order,
        defaults={
            'tran_id': order.order_number,
            'amount': order.grand_total,
            'currency': 'USD',
            'status': 'pending',
            'apv': '',
            'response_data': {},
            'paid_at': None,
            'pending_checkout': None,
        },
    )

    return {
        'endpoint': get_payway_endpoint(),
        'params': params,
    }


def verify_callback_hash(payload: dict, received_hash: str) -> bool:
    check_fields = {k: v for k, v in payload.items() if v not in (None, '')}
    expected = _aba_hash(check_fields)
    return hmac.compare_digest(expected, received_hash)


def handle_aba_callback(payload: dict, user=None):
    from .checkout_flow import fulfill_pending_checkout
    from .services import _request_from_user

    tran_id = payload.get('tran_id', '')
    status = payload.get('status', '')
    apv = payload.get('apv', '')

    with transaction.atomic():
        try:
            payment = AbaPayment.objects.select_for_update().select_related(
                'order',
                'pending_checkout',
                'pending_checkout__user',
            ).get(tran_id=tran_id)
        except AbaPayment.DoesNotExist:
            return None

        if payment.status == 'paid':
            return payment

        payment.response_data = payload
        payment.apv = apv

        if status == '0':
            payment.status = 'paid'
            payment.paid_at = timezone.now()
            if payment.pending_checkout_id and not payment.order_id:
                order = fulfill_pending_checkout(
                    payment.pending_checkout,
                    request=_request_from_user(user, payment.pending_checkout.user),
                )
                payment.order = order
            elif payment.order_id:
                payment.order.payment_status = 'paid'
                payment.order.payment_method = 'aba'
                payment.order.save(update_fields=['payment_status', 'payment_method', 'updated_at'])

            if payment.order_id:
                award_points_for_paid_order(payment.order)
                Revenue.objects.get_or_create(
                    order=payment.order,
                    defaults={
                        'amount': payment.amount,
                        'payment_method': 'aba',
                        'reference': apv or tran_id,
                        'received_at': payment.paid_at,
                        'received_by': user,
                    },
                )
                TelegramService().notify_payment_received(payment.order)
        elif status in ('2', '3'):
            payment.status = 'cancelled'
            if payment.pending_checkout_id and payment.pending_checkout.status == PendingCheckout.STATUS_PENDING:
                payment.pending_checkout.status = PendingCheckout.STATUS_CANCELLED
                payment.pending_checkout.save(update_fields=['status', 'updated_at'])

        payment.save(update_fields=['status', 'apv', 'response_data', 'paid_at', 'order', 'updated_at'])
        return payment
