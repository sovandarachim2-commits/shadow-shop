from django.core.management.base import BaseCommand
from django.db import connection, transaction
from apps.orders.models import Order, PrepareRecord, OutRecord, PromoCodeUsage
from apps.payments.models import AbaPayment, BakongPayment, PendingCheckout
from apps.delivery.models import Delivery, DeliveryStatusHistory
from apps.finance.models import Revenue


class Command(BaseCommand):
    help = 'Safely reset all orders, order items, delivery records, and payment logs in the database.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Execute without asking for interactive confirmation.',
        )
        parser.add_argument(
            '--clear-carts',
            action='store_true',
            help='Also clear all customer cart items.',
        )

    def handle(self, *args, **options):
        force = options.get('force', False)
        clear_carts = options.get('clear_carts', False)

        order_count = Order.objects.count()

        if not force:
            self.stdout.write(self.style.WARNING(
                f"\n⚠️ WARNING: This will delete ALL {order_count} orders from the database, "
                "along with associated order items, delivery records, and payment logs.\n"
                "Products, inventory, customers, and user accounts will NOT be deleted.\n"
            ))
            confirm = input("Type 'yes' to proceed: ").strip().lower()
            if confirm != 'yes':
                self.stdout.write(self.style.NOTICE("Operation cancelled."))
                return

        self.stdout.write("Resetting orders...")

        with transaction.atomic():
            # 1. Delivery & status history
            DeliveryStatusHistory.objects.all().delete()
            Delivery.objects.all().delete()

            # 2. Payment records
            AbaPayment.objects.all().delete()
            BakongPayment.objects.all().delete()
            PendingCheckout.objects.all().delete()

            # 3. Warehouse packaging records
            PrepareRecord.objects.all().delete()
            OutRecord.objects.all().delete()

            # 4. Finance revenue linked to orders
            Revenue.objects.filter(order__isnull=False).delete()

            # 5. Promo code usages
            PromoCodeUsage.objects.all().delete()

            # 6. Orders and items (cascades order_items and order_status_history)
            Order.objects.all().delete()

            if clear_carts:
                from apps.orders.models import CartItem
                CartItem.objects.all().delete()
                self.stdout.write("Cart items cleared.")

        # Reset auto-increment in MySQL if possible
        try:
            with connection.cursor() as cursor:
                cursor.execute("ALTER TABLE orders AUTO_INCREMENT = 1;")
                cursor.execute("ALTER TABLE order_items AUTO_INCREMENT = 1;")
        except Exception:
            pass

        self.stdout.write(self.style.SUCCESS(
            f"Successfully deleted {order_count} orders and reset order ID counter to 1."
        ))
