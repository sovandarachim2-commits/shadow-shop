from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime
from hashlib import md5
from io import BytesIO
import base64
import time

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.utils import timezone
from django.db import transaction
import qrcode
import requests
from PIL import Image, ImageDraw

from apps.finance.models import Revenue
from apps.notifications.services import TelegramService
from apps.orders.rewards import award_points_for_paid_order
from .models import BakongPayment, PendingCheckout


BAKONG_PROD_URL = 'https://api-bakong.nbc.gov.kh/v1/check_transaction_by_md5'
BAKONG_TEST_URL = 'https://sit-api-bakong.nbc.gov.kh/v1/check_transaction_by_md5'
_LOGO_CACHE = None
_LOGO_CACHE_KEY = None


def _tlv(tag, value):
    value = '' if value is None else str(value)
    return f'{tag}{len(value.encode("utf-8")):02d}{value}'


def _crc16(data):
    crc = 0xFFFF
    for byte in data.encode('utf-8'):
        crc ^= byte << 8
        for _ in range(8):
            if crc & 0x8000:
                crc = (crc << 1) ^ 0x1021
            else:
                crc <<= 1
            crc &= 0xFFFF
    return f'{crc:04X}'


def _format_amount(amount, currency):
    decimal_amount = Decimal(str(amount))
    if currency == 'KHR':
        return str(int(decimal_amount.quantize(Decimal('1'), rounding=ROUND_HALF_UP)))
    return str(decimal_amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))


def _currency_code(currency):
    return '116' if currency == 'KHR' else '840'


def _get_logo_image():
    global _LOGO_CACHE, _LOGO_CACHE_KEY
    try:
        from apps.accounts.models import SiteSettings
        site_settings = SiteSettings.get_solo()
        if not site_settings.logo:
            return None
        logo_key = getattr(site_settings.logo, 'name', '')
        if _LOGO_CACHE is not None and _LOGO_CACHE_KEY == logo_key:
            return _LOGO_CACHE.copy()
        site_settings.logo.open('rb')
        try:
            logo = Image.open(site_settings.logo).convert('RGBA')
            _LOGO_CACHE = logo.copy()
            _LOGO_CACHE_KEY = logo_key
            return logo
        finally:
            site_settings.logo.close()
    except Exception:
        return None


def _add_center_logo(image):
    logo = _get_logo_image()
    if logo is None:
        return image

    image = image.convert('RGBA')
    qr_width, qr_height = image.size
    logo_size = int(min(qr_width, qr_height) * 0.18)
    padding = max(8, int(logo_size * 0.18))
    badge_size = logo_size + (padding * 2)

    logo.thumbnail((logo_size, logo_size), Image.LANCZOS)
    badge = Image.new('RGBA', (badge_size, badge_size), (255, 255, 255, 0))
    draw = ImageDraw.Draw(badge)
    draw.rounded_rectangle((0, 0, badge_size, badge_size), radius=int(badge_size * 0.25), fill=(255, 255, 255, 255))

    logo_x = (badge_size - logo.width) // 2
    logo_y = (badge_size - logo.height) // 2
    badge.alpha_composite(logo, (logo_x, logo_y))

    x = (qr_width - badge_size) // 2
    y = (qr_height - badge_size) // 2
    image.alpha_composite(badge, (x, y))
    return image.convert('RGB')


def _qr_data_url(payload):
    qr = qrcode.QRCode(border=2, box_size=8)
    qr.add_data(payload)
    qr.make(fit=True)
    image = qr.make_image(fill_color='black', back_color='white')
    image = _add_center_logo(image)
    buffer = BytesIO()
    image.save(buffer, format='PNG')
    encoded = base64.b64encode(buffer.getvalue()).decode('ascii')
    return f'data:image/png;base64,{encoded}'


def generate_khqr_payload_for_payment(reference, amount, expires_ms=None):
    account_id = settings.BAKONG_ACCOUNT_ID.strip()
    if not account_id:
        raise ImproperlyConfigured('BAKONG_ACCOUNT_ID is not configured.')

    currency = settings.BAKONG_CURRENCY if settings.BAKONG_CURRENCY in ('USD', 'KHR') else 'USD'
    now_ms = int(time.time() * 1000)
    if expires_ms is None:
        expires_ms = now_ms + (max(settings.BAKONG_EXPIRATION_MINUTES, 1) * 60 * 1000)

    merchant_account = _tlv('00', account_id)
    additional_data = _tlv('01', reference) + _tlv('08', 'Shadow Shop Order')
    timestamp = _tlv('00', now_ms) + _tlv('01', expires_ms)

    payload = ''.join([
        _tlv('00', '01'),
        _tlv('01', '12'),
        _tlv('29', merchant_account),
        _tlv('52', '5999'),
        _tlv('53', _currency_code(currency)),
        _tlv('54', _format_amount(amount, currency)),
        _tlv('58', 'KH'),
        _tlv('59', settings.BAKONG_MERCHANT_NAME[:25]),
        _tlv('60', settings.BAKONG_MERCHANT_CITY[:15]),
        _tlv('62', additional_data),
        _tlv('99', timestamp),
    ])
    payload_with_crc_tag = payload + '6304'
    return payload_with_crc_tag + _crc16(payload_with_crc_tag), expires_ms


def generate_khqr_payload(order):
    now_ms = int(time.time() * 1000)
    expires_ms = now_ms + (max(settings.BAKONG_EXPIRATION_MINUTES, 1) * 60 * 1000)
    return generate_khqr_payload_for_payment(order.order_number, order.grand_total, expires_ms)


@transaction.atomic
def create_bakong_payment_for_pending(pending_checkout):
    existing_payment = BakongPayment.objects.filter(pending_checkout=pending_checkout).first()
    if existing_payment and existing_payment.status == 'paid':
        return existing_payment

    expires_ms = int(pending_checkout.expires_at.timestamp() * 1000)
    qr_payload, _ = generate_khqr_payload_for_payment(
        pending_checkout.reference,
        pending_checkout.amount,
        expires_ms,
    )
    defaults = {
        'amount': pending_checkout.amount,
        'currency': settings.BAKONG_CURRENCY if settings.BAKONG_CURRENCY in ('USD', 'KHR') else 'USD',
        'qr_payload': qr_payload,
        'qr_image': _qr_data_url(qr_payload),
        'md5': md5(qr_payload.encode('utf-8')).hexdigest(),
        'status': 'pending',
        'expires_at': pending_checkout.expires_at,
        'paid_at': None,
        'response_data': {},
        'order': None,
    }
    if existing_payment:
        for key, value in defaults.items():
            setattr(existing_payment, key, value)
        existing_payment.save()
        return existing_payment

    return BakongPayment.objects.create(
        pending_checkout=pending_checkout,
        **defaults,
    )


@transaction.atomic
def create_or_refresh_bakong_payment(order):
    existing_payment = BakongPayment.objects.filter(order=order).first()
    if existing_payment and existing_payment.status == 'paid':
        if order.payment_status != 'paid' or order.payment_method != 'bakong':
            order.payment_method = 'bakong'
            order.payment_status = 'paid'
            order.save(update_fields=['payment_method', 'payment_status', 'updated_at'])
        award_points_for_paid_order(order)
        return existing_payment

    qr_payload, expires_ms = generate_khqr_payload(order)
    expires_at = datetime.fromtimestamp(expires_ms / 1000, tz=timezone.get_current_timezone())
    payment, _ = BakongPayment.objects.update_or_create(
        order=order,
        defaults={
            'amount': order.grand_total,
            'currency': settings.BAKONG_CURRENCY if settings.BAKONG_CURRENCY in ('USD', 'KHR') else 'USD',
            'qr_payload': qr_payload,
            'qr_image': _qr_data_url(qr_payload),
            'md5': md5(qr_payload.encode('utf-8')).hexdigest(),
            'status': 'pending',
            'expires_at': expires_at,
            'paid_at': None,
            'response_data': {},
            'pending_checkout': None,
        },
    )
    order.payment_method = 'bakong'
    order.payment_status = 'unpaid'
    order.save(update_fields=['payment_method', 'payment_status', 'updated_at'])
    return payment


def _bakong_response_is_paid(response_data):
    if not isinstance(response_data, dict):
        return False

    status_value = str(response_data.get('status') or '').strip().upper()
    if status_value in {'PAID', 'SUCCESS', 'COMPLETED'}:
        return True

    response_code = response_data.get('responseCode')
    if str(response_code) not in {'0', '00'}:
        return False

    data = response_data.get('data')
    if data is True:
        return True
    if isinstance(data, list):
        return any(_bakong_response_is_paid({'responseCode': response_code, 'data': item}) for item in data)
    if not isinstance(data, dict):
        return False

    data_status = str(
        data.get('status')
        or data.get('transactionStatus')
        or data.get('paymentStatus')
        or data.get('transaction_status')
        or ''
    ).strip().upper()
    transaction_markers = {
        'acknowledgedDateMs',
        'createdDateMs',
        'completedDateMs',
        'hash',
        'transactionHash',
        'transactionId',
        'transaction_id',
        'externalRef',
        'fromAccountId',
        'toAccountId',
    }
    return bool(
        any(data.get(key) for key in transaction_markers)
        or data_status in {'PAID', 'SUCCESS', 'COMPLETED'}
    )


def _mark_bakong_paid(payment, response_data, user=None, request=None):
    from .checkout_flow import fulfill_pending_checkout

    paid_at = timezone.now()
    acknowledged_ms = response_data.get('data', {}).get('acknowledgedDateMs') if isinstance(response_data.get('data'), dict) else None
    if acknowledged_ms:
        try:
            paid_at = datetime.fromtimestamp(int(acknowledged_ms) / 1000, tz=timezone.get_current_timezone())
        except (TypeError, ValueError, OSError):
            paid_at = timezone.now()

    payment.status = 'paid'
    payment.paid_at = paid_at

    if payment.pending_checkout_id and not payment.order_id:
        fulfill_request = request or _request_from_user(user, payment.pending_checkout.user)
        order = fulfill_pending_checkout(payment.pending_checkout, request=fulfill_request)
        payment.order = order
    elif payment.order_id:
        payment.order.payment_status = 'paid'
        payment.order.payment_method = 'bakong'
        payment.order.save(update_fields=['payment_status', 'payment_method', 'updated_at'])

    if not payment.order_id:
        return

    award_points_for_paid_order(payment.order)
    Revenue.objects.get_or_create(
        order=payment.order,
        defaults={
            'amount': payment.order.grand_total,
            'payment_method': 'bakong',
            'reference': payment.md5,
            'received_at': payment.paid_at,
            'received_by': user,
        },
    )
    order_id = payment.order_id
    user_id = getattr(user, 'id', None)
    order = payment.order
    transaction.on_commit(
        lambda: TelegramService.confirm_order_after_payment_async(order_id, user_id)
    )
    transaction.on_commit(lambda: TelegramService().notify_payment_received(order))


def _request_from_user(user, fallback_user):
    class _Request:
        def __init__(self, checkout_user):
            self.user = checkout_user

        def build_absolute_uri(self, location=''):
            return location

    return _Request(user or fallback_user)


def _bakong_check_timeout():
    return max(float(getattr(settings, 'BAKONG_CHECK_TIMEOUT_SECONDS', 5) or 5), 1)


def check_bakong_status(payment, user=None, request=None):
    payment = BakongPayment.objects.select_related(
        'order',
        'pending_checkout',
        'pending_checkout__user',
    ).get(pk=payment.pk)

    if payment.status == 'paid':
        if payment.order_id:
            if payment.order.payment_status != 'paid' or payment.order.payment_method != 'bakong':
                payment.order.payment_status = 'paid'
                payment.order.payment_method = 'bakong'
                payment.order.save(update_fields=['payment_status', 'payment_method', 'updated_at'])
            award_points_for_paid_order(payment.order)
        return payment

    response_data = {}
    paid = False
    timeout = _bakong_check_timeout()
    try:
        if settings.BAKONG_CHECK_API_URL:
            response = requests.get(settings.BAKONG_CHECK_API_URL, params={'md5': payment.md5}, timeout=timeout)
            response.raise_for_status()
            response_data = response.json()
        else:
            if not settings.BAKONG_TOKEN:
                raise ImproperlyConfigured('BAKONG_TOKEN is not configured.')
            endpoint = BAKONG_TEST_URL if settings.BAKONG_IS_TEST else BAKONG_PROD_URL
            response = requests.post(
                endpoint,
                json={'md5': payment.md5},
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {settings.BAKONG_TOKEN}',
                    'User-Agent': 'ShadowShop/1.0 (+https://shadow-shop.online)',
                },
                timeout=timeout,
            )
            response.raise_for_status()
            response_data = response.json()
        paid = _bakong_response_is_paid(response_data)
    except Exception as exc:
        payment.response_data = {'success': False, 'error': str(exc)}
        payment.save(update_fields=['response_data', 'updated_at'])
        return payment

    if not paid:
        payment.response_data = response_data
        if timezone.now() > payment.expires_at:
            payment.status = 'expired'
            if payment.pending_checkout_id and payment.pending_checkout.status == PendingCheckout.STATUS_PENDING:
                payment.pending_checkout.status = PendingCheckout.STATUS_EXPIRED
                payment.pending_checkout.save(update_fields=['status', 'updated_at'])
        payment.save(update_fields=['status', 'response_data', 'updated_at'])
        return payment

    with transaction.atomic():
        payment = BakongPayment.objects.select_for_update().select_related(
            'order',
            'pending_checkout',
            'pending_checkout__user',
        ).get(pk=payment.pk)
        if payment.status == 'paid':
            return payment

        payment.response_data = response_data
        _mark_bakong_paid(payment, response_data, user, request=request)
        payment.save(update_fields=['status', 'paid_at', 'order', 'response_data', 'updated_at'])

    return payment
