from decimal import Decimal, ROUND_DOWN

from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from .models import Order, PointTransaction, RewardItem, RewardRedemption


POINTS_PER_USD = Decimal('10')


def get_points_balance(user):
    total = PointTransaction.objects.filter(user=user).aggregate(total=Sum('points'))['total']
    return int(total or 0)


def get_member_level(points):
    if points >= 5000:
        return 'Platinum'
    if points >= 3000:
        return 'Gold'
    return 'Silver'


def get_next_tier_points(points):
    if points < 3000:
        return 3000
    if points < 5000:
        return 5000
    return points


def calculate_order_points(order):
    amount = Decimal(order.grand_total or 0)
    return int((amount * POINTS_PER_USD).quantize(Decimal('1'), rounding=ROUND_DOWN))


def award_points_for_paid_order(order):
    if order.payment_status != 'paid' or not order.customer_id or not order.customer.user_id:
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
    if balance < reward.points_required:
        raise ValueError('Not enough points to exchange this reward.')

    coupon_types = {RewardItem.TYPE_DISCOUNT, RewardItem.TYPE_FREE_DELIVERY}
    physical_types = {RewardItem.TYPE_GIFT, RewardItem.TYPE_MANUAL}
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

    return redemption
