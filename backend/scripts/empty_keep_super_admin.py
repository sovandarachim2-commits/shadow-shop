#!/usr/bin/env python
"""
Empty almost all Shadow Shop data — keep only super_admin login(s).

DRY RUN by default. Real delete needs --execute + confirmation phrase.

Keeps:
  - users with role=super_admin
  - Permission / Role / RolePermission (so admin UI still works)
  - SiteSettings + TelegramConfig (so you do not reconfigure bots/site)

Deletes everything else: products, orders, customers, carts, inventory,
finance, deliveries, reward catalog, promo codes, other users, logs, etc.

Preview:
    python backend/scripts/empty_keep_super_admin.py

Production:
    set DJANGO_SETTINGS_MODULE=config.settings.production
    python backend/scripts/empty_keep_super_admin.py

Execute:
    python backend/scripts/empty_keep_super_admin.py --execute
    # type: EMPTY KEEP SUPER ADMIN

Non-interactive:
    python backend/scripts/empty_keep_super_admin.py --execute --yes --confirm "EMPTY KEEP SUPER ADMIN"
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

from apps.accounts.models import (  # noqa: E402
    ActivityLog,
    Address,
    EmailVerification,
    PendingRegistration,
    TelegramVerification,
)
from apps.delivery.models import (  # noqa: E402
    Delivery,
    DeliveryByConfig,
    DeliveryCompany,
    DeliveryStatusHistory,
    DeliveryZone,
)
from apps.finance.models import DailySummary, Expense, ExpenseCategory, Revenue  # noqa: E402
from apps.inventory.models import (  # noqa: E402
    Stock,
    StockMovement,
    StockTransfer,
    StockTransferItem,
    Warehouse,
)
from apps.notifications.models import NotificationLog  # noqa: E402
from apps.orders.models import (  # noqa: E402
    CartItem,
    Customer,
    Order,
    OutRecord,
    PointTransaction,
    PrepareRecord,
    PromoCode,
    PromoCodeUsage,
    RewardItem,
    RewardRedemption,
    RewardSettings,
    Wishlist,
)
from apps.payments.models import AbaPayment, BakongPayment, PendingCheckout  # noqa: E402
from apps.products.models import (  # noqa: E402
    Banner,
    Brand,
    Category,
    HomeSectionStyle,
    Product,
    ProductReview,
    ProductSet,
    Promotion,
)

User = get_user_model()
CONFIRM_PHRASE = 'EMPTY KEEP SUPER ADMIN'


def super_admin_qs():
    return User.objects.filter(role='super_admin')


def other_users_qs():
    return User.objects.exclude(role='super_admin')


def collect_counts() -> dict[str, int]:
    return {
        # commerce
        'orders': Order.objects.count(),
        'prepare_records': PrepareRecord.objects.count(),
        'out_records': OutRecord.objects.count(),
        'aba_payments': AbaPayment.objects.count(),
        'bakong_payments': BakongPayment.objects.count(),
        'pending_checkouts': PendingCheckout.objects.count(),
        'deliveries': Delivery.objects.count(),
        'delivery_status_history': DeliveryStatusHistory.objects.count(),
        'customers': Customer.objects.count(),
        'addresses': Address.objects.count(),
        'cart_items': CartItem.objects.count(),
        'wishlists': Wishlist.objects.count(),
        'point_transactions': PointTransaction.objects.count(),
        'reward_redemptions': RewardRedemption.objects.count(),
        'promo_code_usages': PromoCodeUsage.objects.count(),
        'promo_codes': PromoCode.objects.count(),
        'reward_items': RewardItem.objects.count(),
        'reward_settings': RewardSettings.objects.count(),
        # catalog
        'product_reviews': ProductReview.objects.count(),
        'product_sets': ProductSet.objects.count(),
        'products': Product.objects.count(),
        'brands': Brand.objects.count(),
        'categories': Category.objects.count(),
        'banners': Banner.objects.count(),
        'promotions': Promotion.objects.count(),
        'home_section_styles': HomeSectionStyle.objects.count(),
        # inventory
        'stock_transfer_items': StockTransferItem.objects.count(),
        'stock_transfers': StockTransfer.objects.count(),
        'stock_movements': StockMovement.objects.count(),
        'stocks': Stock.objects.count(),
        'warehouses': Warehouse.objects.count(),
        # finance
        'revenues': Revenue.objects.count(),
        'expenses': Expense.objects.count(),
        'expense_categories': ExpenseCategory.objects.count(),
        'daily_summaries': DailySummary.objects.count(),
        # delivery config
        'delivery_companies': DeliveryCompany.objects.count(),
        'delivery_zones': DeliveryZone.objects.count(),
        'delivery_by_configs': DeliveryByConfig.objects.count(),
        # logs / auth leftovers
        'activity_logs': ActivityLog.objects.count(),
        'notification_logs': NotificationLog.objects.count(),
        'telegram_verifications': TelegramVerification.objects.count(),
        'email_verifications': EmailVerification.objects.count(),
        'pending_registrations': PendingRegistration.objects.count(),
        # users (not super_admin)
        'non_super_admin_users': other_users_qs().count(),
        'super_admin_users_kept': super_admin_qs().count(),
    }


def print_counts(title: str, counts: dict[str, int]) -> None:
    print(title)
    width = max(len(k) for k in counts)
    for key, value in counts.items():
        marker = ' (KEEP)' if key == 'super_admin_users_kept' else ''
        print(f'  {key.ljust(width)}  {value}{marker}')


def empty_database() -> None:
    kept = list(super_admin_qs().values_list('id', 'username', 'email'))
    if not kept:
        raise SystemExit('Refusing: no super_admin user found. Create one first.')

    with transaction.atomic():
        # Orders / payments / deliveries first
        OutRecord.objects.all().delete()
        PrepareRecord.objects.all().delete()
        PendingCheckout.objects.all().delete()
        AbaPayment.objects.all().delete()
        BakongPayment.objects.all().delete()
        DeliveryStatusHistory.objects.all().delete()
        Delivery.objects.all().delete()
        Order.objects.all().delete()

        # Customers / carts / rewards usage
        CartItem.objects.all().delete()
        Wishlist.objects.all().delete()
        PointTransaction.objects.all().delete()
        RewardRedemption.objects.all().delete()
        PromoCodeUsage.objects.all().delete()
        Address.objects.all().delete()
        Customer.objects.all().delete()

        # Reward / promo catalog
        PromoCode.objects.all().delete()
        RewardItem.objects.all().delete()
        RewardSettings.objects.all().delete()

        # Inventory (before products)
        StockTransferItem.objects.all().delete()
        StockTransfer.objects.all().delete()
        StockMovement.objects.all().delete()
        Stock.objects.all().delete()
        Warehouse.objects.all().delete()

        # Catalog
        ProductReview.objects.all().delete()
        ProductSet.objects.all().delete()
        Product.objects.all().delete()
        Brand.objects.all().delete()
        Category.objects.all().delete()
        Banner.objects.all().delete()
        Promotion.objects.all().delete()
        HomeSectionStyle.objects.all().delete()

        # Finance
        Revenue.objects.all().delete()
        Expense.objects.all().delete()
        ExpenseCategory.objects.all().delete()
        DailySummary.objects.all().delete()

        # Delivery config
        DeliveryByConfig.objects.all().delete()
        DeliveryZone.objects.all().delete()
        DeliveryCompany.objects.all().delete()

        # Logs / verification leftovers
        ActivityLog.objects.all().delete()
        NotificationLog.objects.all().delete()
        TelegramVerification.objects.all().delete()
        EmailVerification.objects.all().delete()
        PendingRegistration.objects.all().delete()

        # All users except super_admin
        other_users_qs().delete()

    print('\nKept super_admin user(s):')
    for uid, username, email in kept:
        print(f'  id={uid}  username={username}  email={email}')


def main() -> None:
    parser = argparse.ArgumentParser(
        description='Empty all business data; keep only super_admin users (+ roles/settings).',
    )
    parser.add_argument('--execute', action='store_true', help='Actually delete. Without this, dry-run only.')
    parser.add_argument('--yes', action='store_true', help='Non-interactive; requires --confirm.')
    parser.add_argument('--confirm', default='', help=f'Must equal "{CONFIRM_PHRASE}" when using --yes.')
    args = parser.parse_args()

    settings_module = os.environ.get('DJANGO_SETTINGS_MODULE', '')
    print(f'Settings: {settings_module}')
    print('Mode:     EMPTY ALL DATA — keep super_admin only')
    print('\nAlso kept (system): Permission / Role / RolePermission / SiteSettings / TelegramConfig')

    before = collect_counts()
    print_counts('\nCurrent rows:', before)

    if before['super_admin_users_kept'] == 0:
        print('\nERROR: no super_admin user exists. Aborting.')
        raise SystemExit(1)

    deletable = {k: v for k, v in before.items() if k != 'super_admin_users_kept'}
    if sum(deletable.values()) == 0:
        print('\nAlready empty (only super_admin left).')
        return

    if not args.execute:
        print('\nDry run only. Re-run with --execute to delete.')
        print('Example:')
        print('  python backend/scripts/empty_keep_super_admin.py --execute')
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

    empty_database()
    after = collect_counts()
    print_counts('\nRemaining rows:', after)
    print('\nDone.')


if __name__ == '__main__':
    main()
