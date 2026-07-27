#!/usr/bin/env python
"""
Clean transactional / test data for Shadow Shop (safe for production use).

By default this is a DRY RUN — it only prints what would be deleted.
Catalog, settings, staff users, roles, and stock quantities are preserved.

Dry run (recommended first):
    python backend/scripts/clean_test_data.py

    # Production settings
    set DJANGO_SETTINGS_MODULE=config.settings.production
    python backend/scripts/clean_test_data.py

Execute (requires confirmation phrase):
    python backend/scripts/clean_test_data.py --execute

Scopes (combine as needed; default = orders):
    --scope orders       Orders, payments, deliveries, order revenues
    --scope customers    Customer profiles + addresses (keeps User accounts unless flagged)
    --scope carts        Cart + wishlist rows
    --scope rewards      Point txs, redemptions, promo usages (keeps reward catalog/settings)
    --scope activity     Activity logs, notification logs, auth verification leftovers
    --scope all-test     orders + customers + carts + rewards + activity

Optional:
    --full                     Stronger cleanup: customer login users + prepare/out records + daily summaries
    --include-manual-records   Also delete PrepareRecord / OutRecord
    --delete-customer-users    Delete users with role=customer (never staff/admin)
    --delete-daily-summaries   Delete finance daily summaries
    --yes                      Skip interactive prompt (still requires --execute)
                               Confirmation must be passed as: --confirm "CLEAN TEST DATA"

Examples:
    python backend/scripts/clean_test_data.py --scope all-test
    python backend/scripts/clean_test_data.py --scope all-test --execute
    python backend/scripts/clean_test_data.py --scope all-test --full --execute
    python backend/scripts/clean_test_data.py --scope all-test --full --execute --confirm "CLEAN TEST DATA" --yes
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')

import django  # noqa: E402

django.setup()

from django.contrib.auth import get_user_model  # noqa: E402
from django.db import transaction  # noqa: E402
from django.db.models import Count  # noqa: E402

from apps.accounts.models import (  # noqa: E402
    ActivityLog,
    Address,
    EmailVerification,
    PendingRegistration,
    TelegramVerification,
)
from apps.delivery.models import Delivery, DeliveryStatusHistory  # noqa: E402
from apps.finance.models import DailySummary, Revenue  # noqa: E402
from apps.notifications.models import NotificationLog  # noqa: E402
from apps.orders.models import (  # noqa: E402
    CartItem,
    Customer,
    Order,
    OrderItem,
    OrderStatusHistory,
    OutRecord,
    PointTransaction,
    PrepareRecord,
    PromoCodeUsage,
    RewardRedemption,
    Wishlist,
)
from apps.payments.models import AbaPayment, BakongPayment, PendingCheckout  # noqa: E402

User = get_user_model()
CONFIRM_PHRASE = 'CLEAN TEST DATA'
PROTECTED_ROLES = {'admin', 'super_admin', 'seller', 'staff'}

DEFAULT_SCOPES = {'orders'}
ALL_TEST_SCOPES = {'orders', 'customers', 'carts', 'rewards', 'activity'}


def parse_scopes(raw_scopes: list[str]) -> set[str]:
    scopes: set[str] = set()
    for item in raw_scopes or ['orders']:
        key = item.strip().lower()
        if key in {'all', 'all-test', 'all_test'}:
            scopes |= ALL_TEST_SCOPES
        elif key in ALL_TEST_SCOPES:
            scopes.add(key)
        else:
            raise SystemExit(f'Unknown scope: {item}. Use: orders, customers, carts, rewards, activity, all-test')
    return scopes or DEFAULT_SCOPES


def customer_users_qs():
    return User.objects.filter(role='customer').exclude(role__in=PROTECTED_ROLES)


def collect_counts(
    scopes: set[str],
    *,
    include_manual_records: bool,
    delete_customer_users: bool,
    delete_daily_summaries: bool,
) -> dict[str, int]:
    counts: dict[str, int] = {}

    if 'orders' in scopes:
        counts.update({
            'orders': Order.objects.count(),
            'order_items': OrderItem.objects.count(),
            'order_status_history': OrderStatusHistory.objects.count(),
            'deliveries': Delivery.objects.count(),
            'delivery_status_history': DeliveryStatusHistory.objects.count(),
            'aba_payments': AbaPayment.objects.count(),
            'bakong_payments': BakongPayment.objects.count(),
            'pending_checkouts': PendingCheckout.objects.count(),
            'order_revenues': Revenue.objects.filter(order__isnull=False).count(),
            'customers_totals_to_reset': Customer.objects.annotate(n=Count('orders')).filter(n__gt=0).count(),
        })
        if include_manual_records:
            counts['prepare_records'] = PrepareRecord.objects.count()
            counts['out_records'] = OutRecord.objects.count()
        if delete_daily_summaries:
            counts['daily_summaries'] = DailySummary.objects.count()

    if 'customers' in scopes:
        counts['customers'] = Customer.objects.count()
        counts['addresses'] = Address.objects.count()
        if delete_customer_users:
            counts['customer_users'] = customer_users_qs().count()

    if 'carts' in scopes:
        counts['cart_items'] = CartItem.objects.count()
        counts['wishlists'] = Wishlist.objects.count()

    if 'rewards' in scopes:
        counts['point_transactions'] = PointTransaction.objects.count()
        counts['reward_redemptions'] = RewardRedemption.objects.count()
        counts['promo_code_usages'] = PromoCodeUsage.objects.count()

    if 'activity' in scopes:
        counts['activity_logs'] = ActivityLog.objects.count()
        counts['notification_logs'] = NotificationLog.objects.count()
        counts['telegram_verifications'] = TelegramVerification.objects.count()
        counts['email_verifications'] = EmailVerification.objects.count()
        counts['pending_registrations'] = PendingRegistration.objects.count()

    return counts


def print_counts(title: str, counts: dict[str, int]) -> None:
    print(title)
    if not counts:
        print('  (nothing selected)')
        return
    width = max(len(k) for k in counts)
    for key, value in counts.items():
        print(f'  {key.ljust(width)}  {value}')


def print_preserved() -> None:
    print('\nPreserved (not deleted by this script):')
    for line in [
        'products / brands / categories / banners / product sets',
        'site settings, telegram configs, payment/delivery settings',
        'roles, permissions, admin/staff/seller users',
        'warehouses + current stock quantities',
        'reward items / reward settings / promo code definitions',
        'expense categories (and non-order expenses unless you clear finance separately)',
    ]:
        print(f'  - {line}')


def clean_data(
    scopes: set[str],
    *,
    include_manual_records: bool,
    delete_customer_users: bool,
    delete_daily_summaries: bool,
) -> None:
    with transaction.atomic():
        if 'orders' in scopes:
            if include_manual_records:
                OutRecord.objects.all().delete()
                PrepareRecord.objects.all().delete()

            # Payments / deliveries cascade or reference orders — delete explicitly first where needed
            PendingCheckout.objects.all().delete()
            AbaPayment.objects.all().delete()
            BakongPayment.objects.all().delete()
            DeliveryStatusHistory.objects.all().delete()
            Delivery.objects.all().delete()
            Revenue.objects.filter(order__isnull=False).delete()
            Order.objects.all().delete()

            if delete_daily_summaries:
                DailySummary.objects.all().delete()

            # Reset customer order counters if customers themselves are kept
            if 'customers' not in scopes:
                Customer.objects.update(total_orders=0, total_spent=0)

        if 'carts' in scopes:
            CartItem.objects.all().delete()
            Wishlist.objects.all().delete()

        if 'rewards' in scopes:
            PointTransaction.objects.all().delete()
            RewardRedemption.objects.all().delete()
            PromoCodeUsage.objects.all().delete()

        if 'activity' in scopes:
            ActivityLog.objects.all().delete()
            NotificationLog.objects.all().delete()
            TelegramVerification.objects.all().delete()
            EmailVerification.objects.all().delete()
            PendingRegistration.objects.all().delete()

        if 'customers' in scopes:
            Address.objects.all().delete()
            Customer.objects.all().delete()
            if delete_customer_users:
                # Never touch staff / admin / seller accounts
                customer_users_qs().delete()


def main() -> None:
    parser = argparse.ArgumentParser(
        description='Clean transactional/test data while preserving catalog and staff.',
    )
    parser.add_argument(
        '--scope',
        action='append',
        default=[],
        help='orders | customers | carts | rewards | activity | all-test (repeatable)',
    )
    parser.add_argument('--execute', action='store_true', help='Actually delete. Without this, dry-run only.')
    parser.add_argument(
        '--full',
        action='store_true',
        help='Also delete customer login users, prepare/out records, and daily summaries.',
    )
    parser.add_argument('--include-manual-records', action='store_true', help='Also delete PrepareRecord/OutRecord.')
    parser.add_argument('--delete-customer-users', action='store_true', help='Delete role=customer users (never staff).')
    parser.add_argument('--delete-daily-summaries', action='store_true', help='Delete finance daily summaries.')
    parser.add_argument('--yes', action='store_true', help='Non-interactive; requires --confirm.')
    parser.add_argument('--confirm', default='', help=f'Must equal "{CONFIRM_PHRASE}" when using --yes.')
    args = parser.parse_args()

    scopes = parse_scopes(args.scope)
    if args.full:
        # Full test wipe of transactional data (still keeps catalog + staff)
        if not args.scope:
            scopes = set(ALL_TEST_SCOPES)
        else:
            scopes |= ALL_TEST_SCOPES
        args.include_manual_records = True
        args.delete_customer_users = True
        args.delete_daily_summaries = True

    if 'customers' in scopes and 'orders' not in scopes and Order.objects.exists():
        print('Note: customers scope requires clearing orders first — adding --scope orders automatically.')
        scopes.add('orders')

    settings_module = os.environ.get('DJANGO_SETTINGS_MODULE', '')
    print(f'Settings: {settings_module}')
    print(f'Scopes:   {", ".join(sorted(scopes))}')
    if args.full or args.delete_customer_users:
        print('Flags:   delete customer login users = YES (admin/staff kept)')
    else:
        print('Flags:   delete customer login users = NO (pass --full or --delete-customer-users)')
    if args.include_manual_records:
        print('Flags:   prepare/out records = YES')
    if args.delete_daily_summaries:
        print('Flags:   daily summaries = YES')

    print('\nNOT deleted (by design): products, brands, categories, banners, sets,')
    print('site settings, telegram/payment config, admin/staff users, stock, reward catalog.')

    before = collect_counts(
        scopes,
        include_manual_records=args.include_manual_records,
        delete_customer_users=args.delete_customer_users,
        delete_daily_summaries=args.delete_daily_summaries,
    )
    print_counts('\nRows that will be affected:', before)
    print_preserved()

    total = sum(before.values())
    if total == 0:
        print('\nNothing to clean.')
        return

    if not args.execute:
        print('\nDry run only. Re-run with --execute to delete.')
        print('Example:')
        print('  python backend/scripts/clean_test_data.py --scope all-test --execute')
        return

    if args.yes:
        if args.confirm.strip() != CONFIRM_PHRASE:
            print(f'\nRefusing: --yes requires --confirm "{CONFIRM_PHRASE}"')
            raise SystemExit(2)
    else:
        typed = input(f'\nType {CONFIRM_PHRASE} to confirm deletion: ').strip()
        if typed != CONFIRM_PHRASE:
            print('Cancelled.')
            return

    clean_data(
        scopes,
        include_manual_records=args.include_manual_records,
        delete_customer_users=args.delete_customer_users,
        delete_daily_summaries=args.delete_daily_summaries,
    )

    after = collect_counts(
        scopes,
        include_manual_records=args.include_manual_records,
        delete_customer_users=args.delete_customer_users,
        delete_daily_summaries=args.delete_daily_summaries,
    )
    print_counts('\nRemaining rows:', after)
    print('\nDone.')


if __name__ == '__main__':
    main()
