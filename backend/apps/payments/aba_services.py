import hashlib
import hmac
import base64
import json
from datetime import datetime

from django.conf import settings
from django.utils import timezone

from apps.finance.models import Revenue
from apps.notifications.services import TelegramService
from .models import AbaPayment


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
    """Build PayWay HMAC-SHA512 using PayWay's ordered field string."""
    payload = ''.join(str(fields.get(field, '')) for field in PAYWAY_HASH_FIELDS)
    key = settings.ABA_PAYWAY_API_KEY.encode('utf-8')
    digest = hmac.new(key, payload.encode('utf-8'), hashlib.sha512).digest()
    return base64.b64encode(digest).decode('utf-8')


def get_payway_endpoint():
    return PAYWAY_SANDBOX_URL if settings.ABA_PAYWAY_IS_SANDBOX else PAYWAY_PROD_URL


def build_aba_payment_params(order):
    merchant_id = settings.ABA_PAYWAY_MERCHANT_ID
    tran_id = order.order_number
    req_time = datetime.now().strftime('%Y%m%d%H%M%S')
    amount = f"{order.grand_total:.2f}"
    currency = 'USD'

    customer = order.customer
    firstname = (customer.user.first_name or customer.user.username)[:50]
    lastname = (customer.user.last_name or '')[:50]
    phone = (order.delivery_phone or customer.user.phone or '')[:20]
    email = (customer.user.email or '')[:100]

    frontend_url = settings.FRONTEND_URL.rstrip('/')
    continue_success_url = f"{frontend_url}/order-success?tran_id={tran_id}&order={order.order_number}"
    cancel_url = f"{frontend_url}/checkout"
    return_url = f"{settings.BACKEND_URL.rstrip('/')}/api/payments/aba/callback/"

    items = [
        {
            'name': item.product.name[:100],
            'quantity': item.quantity,
            'price': f"{item.unit_price:.2f}",
        }
        for item in order.items.select_related('product').all()
    ]
    encoded_items = base64.b64encode(json.dumps(items, separators=(',', ':')).encode('utf-8')).decode('utf-8')
    return_params = base64.b64encode(
        json.dumps({'order': order.order_number}, separators=(',', ':')).encode('utf-8')
    ).decode('utf-8')

    params = {
        'tran_id': tran_id,
        'amount': amount,
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

    AbaPayment.objects.update_or_create(
        order=order,
        defaults={
            'tran_id': tran_id,
            'amount': order.grand_total,
            'currency': currency,
            'status': 'pending',
            'apv': '',
            'response_data': {},
            'paid_at': None,
        },
    )

    return {
        'endpoint': get_payway_endpoint(),
        'params': params,
    }


def verify_callback_hash(payload: dict, received_hash: str) -> bool:
    """Verify PayWay callback signature from X-PayWay-HMAC-SHA512 header."""
    check_fields = {k: v for k, v in payload.items() if v not in (None, '')}
    expected = _aba_hash(check_fields)
    return hmac.compare_digest(expected, received_hash)


def handle_aba_callback(payload: dict, user=None):
    tran_id = payload.get('tran_id', '')
    status = payload.get('status', '')
    apv = payload.get('apv', '')

    try:
        payment = AbaPayment.objects.select_related('order').get(tran_id=tran_id)
    except AbaPayment.DoesNotExist:
        return None

    payment.response_data = payload
    payment.apv = apv

    if status == '0':
        payment.status = 'paid'
        payment.paid_at = timezone.now()
        payment.order.payment_status = 'paid'
        payment.order.payment_method = 'aba'
        payment.order.save(update_fields=['payment_status', 'payment_method', 'updated_at'])
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

    payment.save(update_fields=['status', 'apv', 'response_data', 'paid_at', 'updated_at'])
    return payment
