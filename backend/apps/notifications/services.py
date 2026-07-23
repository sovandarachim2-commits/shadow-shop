import requests
import logging
from threading import Thread
from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist
from django.utils.html import escape
from django.utils import timezone
from .models import TelegramConfig, NotificationLog

logger = logging.getLogger(__name__)

ONLINE_PAY_NOW_METHODS = frozenset({'bakong', 'aba', 'acleda', 'wing'})


class TelegramService:
    def __init__(self):
        self.config = TelegramConfig.objects.filter(is_active=True).first()
        self.last_error_message = ''

    def get_configs_for(self, flag: str):
        return TelegramConfig.objects.filter(is_active=True, **{flag: True})

    @staticmethod
    def is_placeholder(value: str) -> bool:
        clean = (value or '').strip()
        return not clean or clean in {
            'your_bot_username',
            'your-telegram-bot-token',
            'your-chat-id',
        }

    def get_bot_username(self, allow_remote: bool = True) -> str:
        if self.config and not self.is_placeholder(self.config.bot_username):
            return self.config.bot_username.strip().lstrip('@')

        env_username = getattr(settings, 'TELEGRAM_BOT_USERNAME', '')
        if not self.is_placeholder(env_username):
            return env_username.strip().lstrip('@')

        if not allow_remote:
            return ''

        token = self.config.bot_token if self.config else getattr(settings, 'TELEGRAM_BOT_TOKEN', '')
        if self.is_placeholder(token):
            return ''

        try:
            response = requests.get(f"https://api.telegram.org/bot{token}/getMe", timeout=8)
            data = response.json()
            username = (data.get('result') or {}).get('username', '')
            if username and self.config:
                self.config.bot_username = username
                self.config.save(update_fields=['bot_username'])
            return username
        except Exception as e:
            logger.error(f"Telegram bot username lookup failed: {e}")
            return ''

    def get_bot_token(self) -> str:
        token = self.config.bot_token if self.config else getattr(settings, 'TELEGRAM_BOT_TOKEN', '')
        return '' if self.is_placeholder(token) else token.strip()

    def send_message(
        self,
        message: str,
        event_type: str = 'general',
        chat_id: str = None,
        message_thread_id: int = None,
        reply_to_message_id: int = None,
        reference: str = '',
    ) -> bool:
        if not self.config:
            self.last_error_message = 'Telegram config is not set.'
            return False

        recipient = chat_id or self.config.chat_id
        token = self.get_bot_token()

        if self.is_placeholder(token):
            self.last_error_message = 'Telegram bot token is not configured.'
            return False

        if self.is_placeholder(recipient):
            self.last_error_message = 'Telegram chat ID is not configured.'
            return False

        log = NotificationLog.objects.create(
            event_type=event_type,
            message=message,
            recipient=recipient,
            reference=reference or '',
        )

        try:
            url = f"https://api.telegram.org/bot{token}/sendMessage"
            payload = {
                'chat_id': recipient,
                'text': message,
                'parse_mode': 'HTML',
            }
            thread_id = message_thread_id if message_thread_id is not None else self.config.topic_id
            if thread_id:
                payload['message_thread_id'] = thread_id
            if reply_to_message_id:
                payload['reply_to_message_id'] = reply_to_message_id

            response = requests.post(url, json=payload, timeout=10)
            response_data = response.json() if response.content else {}

            if response.status_code == 200:
                from django.utils import timezone
                self.last_error_message = ''
                log.status = 'sent'
                log.telegram_message_id = (response_data.get('result') or {}).get('message_id')
                log.sent_at = timezone.now()
                log.save()
                return True
            else:
                self.last_error_message = response.text
                log.status = 'failed'
                log.error_message = response.text
                log.save()
                return False
        except Exception as e:
            self.last_error_message = str(e)
            log.status = 'failed'
            log.error_message = str(e)
            log.save()
            logger.error(f"Telegram notification failed: {e}")
            return False

    def send_to_configs(
        self,
        configs,
        message: str,
        event_type: str,
        reference: str = '',
        reply_to_message_id: int = None,
    ) -> bool:
        sent = False
        current_config = self.config
        for config in configs:
            self.config = config
            sent = self.send_message(
                message,
                event_type,
                reference=reference,
                reply_to_message_id=reply_to_message_id,
            ) or sent
        self.config = current_config
        return sent

    @staticmethod
    def should_notify_new_order_on_placement(payment_method: str) -> bool:
        return payment_method not in ONLINE_PAY_NOW_METHODS

    @staticmethod
    def _format_order_items(order) -> str:
        item_lines = [
            f"- {escape(item.product_name)} x{item.quantity} @ ${item.unit_price}"
            for item in order.items.all()[:10]
        ]
        item_count = order.items.count()
        if item_count > 10:
            item_lines.append(f"- and {item_count - 10} more item(s)")
        return "\n".join(item_lines) if item_lines else "-"

    @staticmethod
    def _format_customer_address(order) -> str:
        customer = order.customer
        address_parts = [
            getattr(customer, 'address', ''),
            getattr(customer, 'notes', ''),
        ]
        clean_parts = [str(part).strip() for part in address_parts if str(part).strip()]
        return escape(", ".join(clean_parts) or "N/A")

    def notify_new_order(self, order) -> bool:
        configs = self.get_configs_for('notify_new_order')
        if not configs.exists():
            return False
        from apps.orders.serializers import display_seller_name

        source = 'Customer Checkout' if getattr(order.seller, 'role', '') == 'customer' else 'Admin/Staff Order'
        items_text = self._format_order_items(order)
        title = '🛍️ <b>New Order!</b>'
        payment_method = order.get_payment_method_display() if order.payment_method else 'N/A'
        seller_name = escape(display_seller_name(order))
        customer_name = escape(order.customer.name or 'N/A')
        customer_phone = escape(order.customer.phone or 'N/A')

        if order.payment_method == 'contact_sales':
            message = (
                f"<b>សំណើទាក់ទងផ្នែកលក់</b>\n"
                f"ការបញ្ជាទិញ: <code>#{order.order_number}</code>\n"
                f"ស្ថានភាព: កំពុងរង់ចាំផ្នែកលក់បញ្ជាក់\n"
                f"អតិថិជន: {customer_name}\n"
                f"ទូរស័ព្ទ: {customer_phone}\n"
                f"អាសយដ្ឋាន: {self._format_customer_address(order)}\n"
                f"ផលិតផល:\n{items_text}\n"
                f"សរុបរង: ${order.subtotal}\n"
                f"ថ្លៃដឹកជញ្ជូន: ${order.delivery_fee}\n"
                f"បញ្ចុះតម្លៃ: ${order.discount}\n"
                f"សរុប: ${order.grand_total}\n"
                f"វិធីបង់ប្រាក់: ទាក់ទងផ្នែកលក់\n"
                f"ការបង់ប្រាក់: មិនទាន់បង់ប្រាក់\n"
                f"ប្រភព: {'អតិថិជនបញ្ជាទិញ' if source == 'Customer Checkout' else 'បុគ្គលិកបញ្ជាទិញ'}\n"
                f"អ្នកលក់: {seller_name}"
            )
            return self.send_to_configs(configs, message, 'contact_sales_order', reference=order.order_number)
        message = (
            f"<b>New Order!</b>\n"
            f"Order: <code>#{order.order_number}</code>\n"
            f"Source: {source}\n"
            f"Customer: {customer_name}\n"
            f"Phone: {customer_phone}\n"
            f"Items:\n{items_text}\n"
            f"Total: ${order.grand_total}\n"
            f"Payment Method: {payment_method}\n"
            f"Payment: {order.get_payment_status_display()}\n"
            f"Seller: {seller_name}"
        )
        return self.send_to_configs(configs, message, 'new_order', reference=order.order_number)

    def notify_order_edited(self, order) -> bool:
        configs = self.get_configs_for('notify_new_order')
        if not configs.exists():
            return False

        original_log = NotificationLog.objects.filter(
            event_type='new_order',
            reference=order.order_number,
            status='sent',
            telegram_message_id__isnull=False,
        ).order_by('-created_at').first()

        item_lines = [
            f"- {item.product_name} x{item.quantity} @ ${item.unit_price}"
            for item in order.items.all()[:10]
        ]
        items_text = "\n".join(item_lines) if item_lines else "-"
        message = (
            f"<b>Order Updated</b>\n"
            f"Order: <code>#{order.order_number}</code>\n"
            f"Customer: {order.customer.name}\n"
            f"Phone: {order.customer.phone}\n"
            f"Items:\n{items_text}\n"
            f"Total: ${order.grand_total}\n"
            f"Payment: {order.get_payment_status_display()}\n"
            f"Status: {order.get_status_display()}"
        )
        return self.send_to_configs(
            configs,
            message,
            'order_edited',
            reference=order.order_number,
            reply_to_message_id=original_log.telegram_message_id if original_log else None,
        )

    @classmethod
    def notify_order_edited_async(cls, order_id) -> None:
        def send():
            try:
                from apps.orders.models import Order
                order = Order.objects.select_related('customer', 'seller').prefetch_related('items').get(pk=order_id)
                cls().notify_order_edited(order)
            except Exception as e:
                logger.error(f"Async Telegram order edit notification failed: {e}")

        Thread(target=send, daemon=True).start()

    @classmethod
    def notify_new_order_async(cls, order_id) -> None:
        def send():
            try:
                from apps.orders.models import Order
                order = Order.objects.select_related('customer', 'seller').prefetch_related('items').get(pk=order_id)
                cls().notify_new_order(order)
            except Exception as e:
                logger.error(f"Async Telegram new order notification failed: {e}")

        Thread(target=send, daemon=True).start()

    @classmethod
    def confirm_order_after_payment_async(cls, order_id, user_id=None) -> None:
        def send():
            try:
                from apps.orders.models import Order, OrderStatusHistory
                order = Order.objects.select_related('customer', 'seller').prefetch_related('items').get(pk=order_id)
                OrderStatusHistory.objects.create(
                    order=order,
                    status=order.status,
                    changed_by_id=user_id,
                    note='Payment confirmed - order confirmed',
                )
                already_sent = NotificationLog.objects.filter(
                    event_type='new_order',
                    reference=order.order_number,
                    status='sent',
                ).exists()
                if not already_sent:
                    cls().notify_new_order(order)
            except Exception as e:
                logger.error(f"Async order confirmation after payment failed: {e}")

        Thread(target=send, daemon=True).start()

    def notify_low_stock(self, product, qty: int) -> bool:
        configs = self.get_configs_for('notify_low_stock')
        if not configs.exists():
            return False
        message = (
            f"⚠️ <b>Low Stock Alert!</b>\n"
            f"Product: {product.name}\n"
            f"Code: {product.code}\n"
            f"Current Stock: {qty}"
        )
        return self.send_to_configs(configs, message, 'low_stock')

    def notify_payment_received(self, order) -> bool:
        configs = self.get_configs_for('notify_payment')
        if not configs.exists():
            return False

        if NotificationLog.objects.filter(
            event_type='payment',
            reference=order.order_number,
            status='sent',
        ).exists():
            return False

        transaction_id, paid_at = self._get_payment_details(order)
        paid_time = self._format_payment_time(paid_at)
        method = order.get_payment_method_display() if order.payment_method else 'N/A'
        amount = f"${order.grand_total:.2f}"

        message = (
            f"💰 <b>Payment Received!</b>\n"
            f"📦 Order: <code>#{order.order_number}</code>\n"
            f"💵 Amount: {amount}\n"
            f"💳 Method: {method}\n"
            f"👤 Customer: {order.customer.name}\n"
            f"🕓 Time: {paid_time}\n"
            f"✅ Status: Payment Successful\n"
            f"🔢 Transaction ID: <code>{transaction_id}</code>"
        )
        return self.send_to_configs(configs, message, 'payment', reference=order.order_number)

    @staticmethod
    def _format_payment_time(dt):
        if not dt:
            return '-'
        local = timezone.localtime(dt)
        return f"{local.day}-{local.strftime('%b-%Y')} | {local.strftime('%I:%M:%S %p')}"

    @staticmethod
    def _get_payment_details(order):
        transaction_id = ''
        paid_at = None

        try:
            payment = order.bakong_payment
            if payment.status == 'paid':
                response_data = payment.response_data if isinstance(payment.response_data, dict) else {}
                inner = response_data.get('data')
                if isinstance(inner, dict):
                    transaction_id = (
                        inner.get('hash')
                        or inner.get('transactionId')
                        or inner.get('transaction_id')
                        or payment.md5
                    )
                else:
                    transaction_id = payment.md5
                paid_at = payment.paid_at
        except ObjectDoesNotExist:
            pass

        if not transaction_id:
            try:
                payment = order.aba_payment
                if payment.status == 'paid':
                    transaction_id = payment.apv or payment.tran_id
                    paid_at = payment.paid_at
            except ObjectDoesNotExist:
                pass

        try:
            revenue = order.revenue
            transaction_id = transaction_id or revenue.reference
            paid_at = paid_at or revenue.received_at
        except ObjectDoesNotExist:
            pass

        if not transaction_id:
            transaction_id = order.order_number

        return transaction_id, paid_at or order.updated_at

    def notify_delivery_update(self, delivery) -> bool:
        configs = self.get_configs_for('notify_delivery')
        if not configs.exists():
            return False
        message = (
            f"🚚 <b>Delivery Update!</b>\n"
            f"Order: <code>#{delivery.order.order_number}</code>\n"
            f"Status: {delivery.get_status_display()}\n"
            f"Customer: {delivery.order.customer.name}\n"
            f"Tracking: {delivery.tracking_number or 'N/A'}"
        )
        return self.send_to_configs(configs, message, 'delivery')
