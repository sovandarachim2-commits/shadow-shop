import requests
import logging
from threading import Thread
from django.conf import settings
from .models import TelegramConfig, NotificationLog

logger = logging.getLogger(__name__)


class TelegramService:
    def __init__(self):
        self.config = TelegramConfig.objects.filter(is_active=True).first()

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

    def get_bot_username(self) -> str:
        if self.config and not self.is_placeholder(self.config.bot_username):
            return self.config.bot_username.strip().lstrip('@')

        env_username = getattr(settings, 'TELEGRAM_BOT_USERNAME', '')
        if not self.is_placeholder(env_username):
            return env_username.strip().lstrip('@')

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

    def send_message(self, message: str, event_type: str = 'general', chat_id: str = None) -> bool:
        if not self.config:
            return False

        recipient = chat_id or self.config.chat_id

        log = NotificationLog.objects.create(
            event_type=event_type,
            message=message,
            recipient=recipient,
        )

        try:
            url = f"https://api.telegram.org/bot{self.config.bot_token}/sendMessage"
            payload = {
                'chat_id': recipient,
                'text': message,
                'parse_mode': 'HTML',
            }
            if self.config.topic_id and not chat_id:
                payload['message_thread_id'] = self.config.topic_id

            response = requests.post(url, json=payload, timeout=10)

            if response.status_code == 200:
                from django.utils import timezone
                log.status = 'sent'
                log.sent_at = timezone.now()
                log.save()
                return True
            else:
                log.status = 'failed'
                log.error_message = response.text
                log.save()
                return False
        except Exception as e:
            log.status = 'failed'
            log.error_message = str(e)
            log.save()
            logger.error(f"Telegram notification failed: {e}")
            return False

    def send_to_configs(self, configs, message: str, event_type: str) -> bool:
        sent = False
        current_config = self.config
        for config in configs:
            self.config = config
            sent = self.send_message(message, event_type) or sent
        self.config = current_config
        return sent

    def notify_new_order(self, order) -> bool:
        configs = self.get_configs_for('notify_new_order')
        if not configs.exists():
            return False
        source = 'Customer Checkout' if getattr(order.seller, 'role', '') == 'customer' else 'Admin/Staff Order'
        item_lines = [
            f"- {item.product_name} x{item.quantity} @ ${item.unit_price}"
            for item in order.items.all()[:10]
        ]
        items_text = "\n".join(item_lines) if item_lines else "-"
        message = (
            f"🛍️ <b>New Order!</b>\n"
            f"Order: <code>#{order.order_number}</code>\n"
            f"Source: {source}\n"
            f"Customer: {order.customer.name}\n"
            f"Phone: {order.customer.phone}\n"
            f"Items:\n{items_text}\n"
            f"Total: ${order.grand_total}\n"
            f"Payment: {order.get_payment_status_display()}\n"
            f"Seller: {order.seller.get_full_name() if order.seller else 'N/A'}"
        )
        return self.send_to_configs(configs, message, 'new_order')

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
        message = (
            f"💰 <b>Payment Received!</b>\n"
            f"Order: <code>#{order.order_number}</code>\n"
            f"Amount: ${order.grand_total}\n"
            f"Method: {order.get_payment_method_display()}\n"
            f"Customer: {order.customer.name}"
        )
        return self.send_to_configs(configs, message, 'payment')

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
