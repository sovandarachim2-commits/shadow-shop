#!/usr/bin/env python
"""
Clear order data from the Shadow Shop database.

Dry run:
    python backend/scripts/clear_orders.py

Execute:
    python backend/scripts/clear_orders.py --execute

Optional:
    --include-manual-records   Also delete PrepareRecord and OutRecord rows.
    --delete-customers         Delete customers after orders are removed.
    --delete-daily-summaries   Delete daily finance summaries.
"""

import argparse
import os
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

os.environ['DEBUG'] = 'True'
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')

import django  # noqa: E402

django.setup()

from django.db import transaction  # noqa: E402
from django.db.models import Count  # noqa: E402

from apps.delivery.models import Delivery, DeliveryStatusHistory  # noqa: E402
from apps.finance.models import DailySummary, Revenue  # noqa: E402
from apps.orders.models import Customer, Order, OrderItem, OrderStatusHistory, OutRecord, PrepareRecord  # noqa: E402
from apps.payments.models import AbaPayment, BakongPayment  # noqa: E402


def count_rows(include_manual_records=False, delete_customers=False, delete_daily_summaries=False):
    counts = {
        'orders': Order.objects.count(),
        'order_items': OrderItem.objects.count(),
        'order_status_history': OrderStatusHistory.objects.count(),
        'deliveries': Delivery.objects.count(),
        'delivery_status_history': DeliveryStatusHistory.objects.count(),
        'aba_payments': AbaPayment.objects.count(),
        'bakong_payments': BakongPayment.objects.count(),
        'order_revenues': Revenue.objects.filter(order__isnull=False).count(),
        'customers_to_reset': Customer.objects.annotate(order_count=Count('orders')).filter(order_count__gt=0).count(),
    }

    if include_manual_records:
        counts.update({
            'prepare_records': PrepareRecord.objects.count(),
            'out_records': OutRecord.objects.count(),
        })

    if delete_customers:
        counts['customers'] = Customer.objects.count()

    if delete_daily_summaries:
        counts['daily_summaries'] = DailySummary.objects.count()

    return counts


def print_counts(title, counts):
    print(title)
    for key, value in counts.items():
        print(f"  {key}: {value}")


def clear_orders(include_manual_records=False, delete_customers=False, delete_daily_summaries=False):
    with transaction.atomic():
        if include_manual_records:
            OutRecord.objects.all().delete()
            PrepareRecord.objects.all().delete()

        Revenue.objects.filter(order__isnull=False).delete()
        Order.objects.all().delete()

        if delete_customers:
            Customer.objects.all().delete()
        else:
            Customer.objects.update(total_orders=0, total_spent=0)

        if delete_daily_summaries:
            DailySummary.objects.all().delete()


def main():
    parser = argparse.ArgumentParser(description='Clear order data from the database.')
    parser.add_argument('--execute', action='store_true', help='Actually delete data. Without this, only prints counts.')
    parser.add_argument('--include-manual-records', action='store_true', help='Also delete PrepareRecord and OutRecord rows.')
    parser.add_argument('--delete-customers', action='store_true', help='Delete customers too. Default only resets customer totals.')
    parser.add_argument('--delete-daily-summaries', action='store_true', help='Delete finance daily summaries too.')
    args = parser.parse_args()

    before = count_rows(
        include_manual_records=args.include_manual_records,
        delete_customers=args.delete_customers,
        delete_daily_summaries=args.delete_daily_summaries,
    )
    print_counts('Rows that will be affected:', before)

    if not args.execute:
        print('\nDry run only. Add --execute to clear these rows.')
        return

    confirm = input('\nType CLEAR ORDERS to confirm: ').strip()
    if confirm != 'CLEAR ORDERS':
        print('Cancelled.')
        return

    clear_orders(
        include_manual_records=args.include_manual_records,
        delete_customers=args.delete_customers,
        delete_daily_summaries=args.delete_daily_summaries,
    )

    after = count_rows(
        include_manual_records=args.include_manual_records,
        delete_customers=args.delete_customers,
        delete_daily_summaries=args.delete_daily_summaries,
    )
    print_counts('\nRemaining rows:', after)


if __name__ == '__main__':
    main()
