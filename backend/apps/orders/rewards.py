from decimal import Decimal, ROUND_DOWN

from django.db import transaction
from django.utils import timezone

from .models import Order, PointTransaction, RewardItem, RewardRedemption, RewardSettings


POINTS_PER_USD = Decimal('10')


def get_coupon_discount(user, coupon_code, subtotal, delivery_fee=0, lock=False):
    code = (coupon_code or '').strip().upper()
    if not code:
        raise ValueError('Enter a promo code.')

    queryset = RewardRedemption.objects.select_related('reward_item')
    if lock:
        queryset = queryset.select_for_update()
    try:
        redemption = queryset.get(user=user, coupon_code__iexact=code)
    except RewardRedemption.DoesNotExist as exc:
        raise ValueError('Promo code was not found.') from exc

    reward = redemption.reward_item
    now = timezone.now()
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

    try:
        subtotal = Decimal(str(subtotal or 0))
        delivery_fee = Decimal(str(delivery_fee or 0))
    except Exception as exc:
        raise ValueError('Invalid order amount.') from exc
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
    points_per_dollar = Decimal(settings_obj.points_per_dollar)
    points = int((amount * points_per_dollar).quantize(Decimal('1'), rounding=ROUND_DOWN))
    if settings_obj.maximum_points_per_order:
        points = min(points, settings_obj.maximum_points_per_order)
    return points


def award_points_for_paid_order(order):
    if order.payment_status != 'paid' or not order.customer_id or not order.customer.user_id:
        return None
    settings_obj = RewardSettings.get_solo()
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
    reward = RewardItem.objects.select_for_update().get(pk=reward_item_id, is_active=True)
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
    settings_obj = RewardSettings.get_solo()
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
            stock, _ = Stock.objects.select_for_update().get_or_create(
                product=product,
                defaults={'quantity': 0},
            )
            if stock.quantity < 1:
                raise ValueError(f'{product.name} is out of inventory.')
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
