from decimal import Decimal, ROUND_DOWN

from django.db import transaction
from django.utils import timezone

from .models import Order, PointTransaction, PromoCode, PromoCodeUsage, RewardItem, RewardRedemption, RewardSettings


POINTS_PER_USD = Decimal('10')


def _line_product_id(line):
    product = getattr(line, 'product', None)
    if product:
        return product.id
    return getattr(line, 'product_id', None)


def _line_category_id(line):
    product = getattr(line, 'product', None)
    if product:
        return product.category_id
    return None


def _line_total(line):
    total = getattr(line, 'total_price', None)
    if total is not None:
        return Decimal(str(total or 0))
    product = getattr(line, 'product', None)
    price = getattr(product, 'retail_price', 0) if product else getattr(line, 'unit_price', 0)
    return Decimal(str(price or 0)) * Decimal(str(getattr(line, 'quantity', 0) or 0))


def _eligible_product_amount(promo, cart_lines):
    if not cart_lines:
        return None
    lines = list(cart_lines)
    if promo.apply_scope == PromoCode.SCOPE_PRODUCTS:
        product_ids = set(promo.target_products.values_list('id', flat=True))
        return sum((_line_total(line) for line in lines if _line_product_id(line) in product_ids), Decimal('0'))
    if promo.apply_scope == PromoCode.SCOPE_CATEGORIES:
        category_ids = set(promo.target_categories.values_list('id', flat=True))
        return sum((_line_total(line) for line in lines if _line_category_id(line) in category_ids), Decimal('0'))
    return sum((_line_total(line) for line in lines), Decimal('0'))


def get_coupon_discount(user, coupon_code, subtotal, delivery_fee=0, lock=False, cart_lines=None):
    code = (coupon_code or '').strip().upper()
    if not code:
        raise ValueError('Enter a promo code.')

    queryset = RewardRedemption.objects.select_related('reward_item')
    if lock:
        queryset = queryset.select_for_update()
    try:
        redemption = queryset.get(user=user, coupon_code__iexact=code)
    except RewardRedemption.DoesNotExist:
        redemption = None

    now = timezone.now()
    try:
        subtotal = Decimal(str(subtotal or 0))
        delivery_fee = Decimal(str(delivery_fee or 0))
    except Exception as exc:
        raise ValueError('Invalid order amount.') from exc

    if redemption:
        reward = redemption.reward_item
        if redemption.status != RewardRedemption.STATUS_ACTIVE:
            raise ValueError('This promo code has already been used or is no longer active.')
        if reward.type not in {
            RewardItem.TYPE_VOUCHER,
            RewardItem.TYPE_DISCOUNT,
            RewardItem.TYPE_FREE_DELIVERY,
        }:
            raise ValueError('This reward cannot be used as a promo code.')
        if not reward.is_active or (reward.starts_at and reward.starts_at > now) or (reward.ends_at and reward.ends_at < now):
            raise ValueError('This promo code is not currently available.')
        if subtotal < reward.minimum_order_amount:
            raise ValueError(f'Minimum order amount is ${reward.minimum_order_amount:.2f}.')

        if reward.type == RewardItem.TYPE_FREE_DELIVERY:
            discount = delivery_fee
        elif reward.coupon_discount_type == RewardItem.DISCOUNT_PERCENT:
            discount = subtotal * reward.coupon_value / Decimal('100')
        else:
            discount = reward.coupon_value

        discount = min(discount, subtotal + delivery_fee).quantize(Decimal('0.01'))
        return redemption, discount

    promo_qs = PromoCode.objects.all()
    if lock:
        promo_qs = promo_qs.select_for_update()
    try:
        promo = promo_qs.get(code__iexact=code)
    except PromoCode.DoesNotExist as exc:
        raise ValueError('Promo code was not found.') from exc

    if not promo.is_active or (promo.starts_at and promo.starts_at > now) or (promo.ends_at and promo.ends_at < now):
        raise ValueError('This promo code is not currently available.')
    if subtotal < promo.minimum_order_amount:
        raise ValueError(f'Minimum order amount is ${promo.minimum_order_amount:.2f}.')
    if promo.customer_scope == PromoCode.CUSTOMER_NEW and Order.objects.filter(customer__user=user).exists():
        raise ValueError('This promo code is for new customers only.')
    if promo.customer_scope == PromoCode.CUSTOMER_STAFF and not getattr(user, 'is_staff_user', False):
        raise ValueError('This promo code is for staff only.')
    if promo.usage_limit and PromoCodeUsage.objects.filter(promo_code=promo).count() >= promo.usage_limit:
        raise ValueError('This promo code has reached its usage limit.')
    if promo.per_customer_limit and PromoCodeUsage.objects.filter(promo_code=promo, user=user).count() >= promo.per_customer_limit:
        raise ValueError('You already reached the usage limit for this promo code.')

    if promo.discount_type == PromoCode.DISCOUNT_FREE_DELIVERY:
        discount = delivery_fee
    else:
        if promo.apply_scope == PromoCode.SCOPE_DELIVERY or promo.apply_to == PromoCode.APPLY_DELIVERY:
            base_amount = delivery_fee
        elif promo.apply_scope == PromoCode.SCOPE_ORDER or promo.apply_to == PromoCode.APPLY_ORDER:
            base_amount = subtotal + delivery_fee
        else:
            eligible_amount = _eligible_product_amount(promo, cart_lines)
            base_amount = subtotal if eligible_amount is None else eligible_amount
            if promo.apply_scope in {PromoCode.SCOPE_PRODUCTS, PromoCode.SCOPE_CATEGORIES} and base_amount <= 0:
                raise ValueError('This promo code does not apply to the products in your cart.')
        if promo.discount_type == PromoCode.DISCOUNT_PERCENT:
            discount = base_amount * promo.value / Decimal('100')
        else:
            discount = min(promo.value, base_amount)

    if promo.max_discount_amount:
        discount = min(discount, promo.max_discount_amount)

    discount = min(discount, subtotal + delivery_fee).quantize(Decimal('0.01'))
    return promo, discount


def coupon_response_payload(coupon_obj, discount):
    if isinstance(coupon_obj, RewardRedemption):
        reward = coupon_obj.reward_item
        return {
            'coupon_code': coupon_obj.coupon_code,
            'name': reward.name,
            'reward_type': reward.type,
            'discount_type': reward.coupon_discount_type,
            'coupon_value': reward.coupon_value,
            'minimum_order_amount': reward.minimum_order_amount,
            'discount': discount,
        }

    return {
        'coupon_code': coupon_obj.code,
        'name': coupon_obj.name,
        'reward_type': 'promo_code',
        'discount_type': coupon_obj.discount_type,
        'coupon_value': coupon_obj.value,
        'minimum_order_amount': coupon_obj.minimum_order_amount,
        'max_discount_amount': coupon_obj.max_discount_amount,
        'apply_to': coupon_obj.apply_to,
        'apply_scope': coupon_obj.apply_scope,
        'discount': discount,
    }


def mark_coupon_used(coupon_obj, order, user, discount):
    if isinstance(coupon_obj, RewardRedemption):
        coupon_obj.status = RewardRedemption.STATUS_USED
        coupon_obj.save(update_fields=['status'])
        return coupon_obj

    usage, _ = PromoCodeUsage.objects.get_or_create(
        promo_code=coupon_obj,
        order=order,
        defaults={
            'user': user,
            'discount_amount': discount,
        },
    )
    return usage


def get_points_balance(user):
    now = timezone.now()
    buckets = []
    transactions = PointTransaction.objects.filter(user=user).only(
        'points', 'created_at', 'expires_at'
    ).order_by('created_at', 'id')

    for item in transactions:
        # Expired earning buckets cannot fund a later redemption.
        buckets = [
            bucket for bucket in buckets
            if not bucket['expires_at'] or bucket['expires_at'] > item.created_at
        ]
        points = int(item.points or 0)
        if points > 0:
            buckets.append({'remaining': points, 'expires_at': item.expires_at})
            continue
        to_consume = abs(points)
        for bucket in buckets:
            if to_consume <= 0:
                break
            consumed = min(bucket['remaining'], to_consume)
            bucket['remaining'] -= consumed
            to_consume -= consumed

    return sum(
        bucket['remaining']
        for bucket in buckets
        if bucket['remaining'] > 0 and (
            not bucket['expires_at'] or bucket['expires_at'] > now
        )
    )


def get_member_level(points):
    settings_obj = RewardSettings.get_solo()
    if points >= settings_obj.platinum_min_points:
        return 'Platinum'
    if points >= settings_obj.gold_min_points:
        return 'Gold'
    return 'Silver'


def get_next_tier_points(points):
    settings_obj = RewardSettings.get_solo()
    if points < settings_obj.gold_min_points:
        return settings_obj.gold_min_points
    if points < settings_obj.platinum_min_points:
        return settings_obj.platinum_min_points
    return points


def calculate_order_points(order):
    amount = Decimal(order.grand_total or 0)
    settings_obj = RewardSettings.get_solo()
    if not settings_obj.is_active or not settings_obj.purchase_points_enabled:
        return 0
    points_per_dollar = Decimal(settings_obj.points_per_dollar)
    points = int((amount * points_per_dollar).quantize(Decimal('1'), rounding=ROUND_DOWN))
    if settings_obj.maximum_points_per_order:
        points = min(points, settings_obj.maximum_points_per_order)
    return points


def award_points_for_paid_order(order):
    if order.payment_status != 'paid' or not order.customer_id or not order.customer.user_id:
        return None
    settings_obj = RewardSettings.get_solo()
    if not settings_obj.is_active:
        return None
    if not settings_obj.auto_approve_points:
        return None
    if settings_obj.auto_apply_on_completed and order.status != Order.STATUS_COMPLETED:
        return None

    points = calculate_order_points(order)
    if points <= 0:
        return None

    transaction_obj, _ = PointTransaction.objects.get_or_create(
        user=order.customer.user,
        order=order,
        type=PointTransaction.TYPE_EARN,
        defaults={
            'points': points,
            'note': f'Earned from paid order #{order.order_number}',
        },
    )
    return transaction_obj


def sync_paid_order_points(user):
    if not RewardSettings.get_solo().is_active:
        return
    orders = Order.objects.filter(
        customer__user=user,
        payment_status='paid',
    ).exclude(
        point_transactions__user=user,
        point_transactions__type=PointTransaction.TYPE_EARN,
    ).select_related('customer', 'customer__user')
    for order in orders:
        award_points_for_paid_order(order)


@transaction.atomic
def exchange_reward(user, reward_item_id):
    settings_obj = RewardSettings.get_solo()
    if not settings_obj.is_active:
        raise ValueError('Rewards program is currently off.')
    reward = RewardItem.objects.select_related('gift_product').select_for_update().get(pk=reward_item_id, is_active=True)
    now = timezone.now()
    if reward.starts_at and reward.starts_at > now:
        raise ValueError('This reward is not available yet.')
    if reward.ends_at and reward.ends_at < now:
        raise ValueError('This reward has ended.')
    if reward.stock is not None and reward.stock <= 0:
        raise ValueError('This reward is out of stock.')
    if reward.per_customer_limit:
        used_count = RewardRedemption.objects.filter(user=user, reward_item=reward).exclude(
            status__in=[RewardRedemption.STATUS_REJECTED, RewardRedemption.STATUS_CANCELLED]
        ).count()
        if used_count >= reward.per_customer_limit:
            raise ValueError('You already reached the exchange limit for this reward.')

    balance = get_points_balance(user)
    if settings_obj.minimum_redeem_points and balance < settings_obj.minimum_redeem_points:
        raise ValueError(f'You need at least {settings_obj.minimum_redeem_points} points before exchanging rewards.')
    if balance < reward.points_required:
        raise ValueError('Not enough points to exchange this reward.')
    member_level = get_member_level(balance).lower()
    tier_order = {'silver': 1, 'gold': 2, 'platinum': 3}
    required_tier = reward.member_tier_requirement
    if required_tier != 'all' and tier_order.get(member_level, 0) < tier_order.get(required_tier, 0):
        raise ValueError(f'This reward requires {required_tier.title()} membership.')

    coupon_types = {RewardItem.TYPE_VOUCHER, RewardItem.TYPE_DISCOUNT, RewardItem.TYPE_FREE_DELIVERY}
    physical_types = {RewardItem.TYPE_GIFT, RewardItem.TYPE_LUCKY_BOX, RewardItem.TYPE_MANUAL}
    stock = None
    if reward.type in {RewardItem.TYPE_GIFT, RewardItem.TYPE_LUCKY_BOX} and reward.gift_product_id:
        from apps.inventory.models import Stock
        from apps.products.models import Product

        product = reward.gift_product
        if product.availability_status == Product.AVAILABILITY_OUT_OF_STOCK:
            raise ValueError(f'{product.name} is out of inventory.')
        if product.availability_status == Product.AVAILABILITY_AUTO:
            stock, _ = Stock.objects.select_for_update().get_or_create(
                product=product,
                defaults={'quantity': 0},
            )
            if stock.quantity < 1:
                raise ValueError(f'{product.name} is out of inventory.')

    redemption = RewardRedemption.objects.create(
        user=user,
        reward_item=reward,
        points_spent=reward.points_required,
        coupon_code=RewardRedemption.generate_coupon_code() if reward.type in coupon_types else None,
        status=RewardRedemption.STATUS_PENDING if reward.type in physical_types else RewardRedemption.STATUS_ACTIVE,
    )
    PointTransaction.objects.create(
        user=user,
        reward_redemption=redemption,
        points=-reward.points_required,
        type=PointTransaction.TYPE_REDEEM,
        note=f'Redeemed {reward.name}',
    )

    if reward.stock is not None:
        reward.stock -= 1
        reward.save(update_fields=['stock', 'updated_at'])

    if reward.type in {RewardItem.TYPE_GIFT, RewardItem.TYPE_LUCKY_BOX} and reward.gift_product_id:
        from apps.inventory.models import Stock, StockMovement
        from apps.products.models import Product

        product = reward.gift_product
        if product.availability_status != Product.AVAILABILITY_AVAILABLE:
            if stock is None:
                stock, _ = Stock.objects.select_for_update().get_or_create(
                    product=product,
                    defaults={'quantity': 0},
                )
            before_qty = stock.quantity
            stock.quantity -= 1
            stock.save(update_fields=['quantity', 'updated_at'])
            StockMovement.objects.create(
                type=StockMovement.TYPE_STOCK_OUT,
                product=product,
                quantity=-1,
                before_qty=before_qty,
                after_qty=stock.quantity,
                reference=f'REWARD-{redemption.id}',
                reference_type='reward_redemption',
                notes=f'Reward exchange by {user.get_full_name() or user.username}',
                created_by=user,
            )
            if settings_obj.low_stock_alert_enabled and stock.is_low_stock:
                from apps.notifications.services import TelegramService
                transaction.on_commit(lambda: TelegramService().notify_low_stock(product, stock.quantity))

    return redemption
