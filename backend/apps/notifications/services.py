import requests
import logging
from threading import Thread
from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist
from django.db import transaction
from django.utils.html import escape
from django.utils import timezone
from .models import TelegramConfig, NotificationLog

logger = logging.getLogger(__name__)

ONLINE_PAY_NOW_METHODS = frozenset({'bakong', 'aba'})


class TelegramService:
    def __init__(self):
        self.config = TelegramConfig.objects.filter(is_active=True).first()
        self.last_error_message = ''

    def get_configs_for(self, flag: str):
        return TelegramConfig.objects.filter(is_active=True, **{flag: True})

    @staticmethod
    def config_allows_payment_method(config, payment_method: str) -> bool:
        methods = getattr(config, 'new_order_payment_methods', None) or []
        if not isinstance(methods, (list, tuple)):
            return True
        clean = [str(method).strip() for method in methods if str(method).strip()]
        if not clean:
            return True
        return str(payment_method or '').strip() in clean

    def get_new_order_configs(self, payment_method: str = ''):
        configs = list(self.get_configs_for('notify_new_order'))
        return [config for config in configs if self.config_allows_payment_method(config, payment_method)]

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
        reply_markup: dict = None,
        disable_web_page_preview: bool = False,
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
            # Forum topics only apply to the configured group chat, never private DMs.
            if message_thread_id is not None:
                thread_id = message_thread_id
            elif str(recipient) == str(self.config.chat_id or ''):
                thread_id = self.config.topic_id
            else:
                thread_id = None
            if thread_id:
                payload['message_thread_id'] = thread_id
            if reply_to_message_id:
                payload['reply_to_message_id'] = reply_to_message_id
            if reply_markup:
                payload['reply_markup'] = reply_markup
            if disable_web_page_preview:
                payload['disable_web_page_preview'] = True

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
        reply_markup: dict = None,
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
                reply_markup=reply_markup,
            ) or sent
        self.config = current_config
        return sent

    @staticmethod
    def should_notify_new_order_on_placement(payment_method: str) -> bool:
        return payment_method not in ONLINE_PAY_NOW_METHODS

    @staticmethod
    def _format_order_items(order) -> str:
        items = list(order.items.all())
        item_lines = [
            f"- {escape(item.product_name)} x{item.quantity} @ ${item.unit_price}"
            for item in items[:10]
        ]
        if len(items) > 10:
            item_lines.append(f"- and {len(items) - 10} more item(s)")
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
        configs = self.get_new_order_configs(order.payment_method)
        if not configs:
            return False
        from apps.orders.serializers import display_seller_name

        source = 'Customer Checkout' if getattr(order.seller, 'role', '') == 'customer' else 'Admin/Staff Order'
        items_text = self._format_order_items(order)
        payment_method = order.get_payment_method_display() if order.payment_method else 'N/A'
        seller_name = escape(display_seller_name(order))
        customer_name = escape(order.customer.name or 'N/A')
        customer_phone = escape(order.customer.phone or 'N/A')

        if order.payment_method == 'contact_sales':
            reply_markup = {
                'inline_keyboard': [[
                    {
                        'text': 'Confirm Order',
                        'callback_data': f'contact_sales:confirm:{order.id}',
                    },
                    {
                        'text': 'Cancel Order',
                        'callback_data': f'contact_sales:cancel:{order.id}',
                    },
                ]]
            }
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
            return self.send_to_configs(
                configs,
                message,
                'contact_sales_order',
                reference=order.order_number,
                reply_markup=reply_markup,
            )
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
        configs = self.get_new_order_configs(order.payment_method)
        if not configs:
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

    def _telegram_api_post(self, method: str, payload: dict, timeout: int = 10):
        token = self.get_bot_token()
        if self.is_placeholder(token):
            self.last_error_message = 'Telegram bot token is not configured.'
            return None
        try:
            response = requests.post(
                f"https://api.telegram.org/bot{token}/{method}",
                json=payload,
                timeout=timeout,
            )
            if response.status_code != 200:
                self.last_error_message = response.text
            return response
        except Exception as e:
            self.last_error_message = str(e)
            logger.error(f"Telegram API call failed: {e}")
            return None

    def _answer_callback_query(self, callback_query_id: str, text: str, alert: bool = False):
        if not callback_query_id:
            return None
        return self._telegram_api_post(
            'answerCallbackQuery',
            {
                'callback_query_id': callback_query_id,
                'text': text,
                'show_alert': alert,
            },
            timeout=5,
        )

    def _get_customer_telegram_id(self, order) -> str:
        customer = order.customer
        user = getattr(customer, 'user', None)
        if user and getattr(user, 'telegram_id', None):
            return str(user.telegram_id).strip()
        seller = getattr(order, 'seller', None)
        if seller and getattr(seller, 'role', '') == 'customer' and getattr(seller, 'telegram_id', None):
            return str(seller.telegram_id).strip()
        return ''

    def _contact_sales_customer_message(self, order, action: str) -> str:
        customer_name = escape(order.customer.name or 'អតិថិជន')
        items_text = self._format_order_items(order)
        address = self._format_customer_address(order)
        frontend = str(getattr(settings, 'FRONTEND_URL', '') or '').rstrip('/')
        track_url = f'{frontend}/my-orders/{order.id}' if frontend else ''

        if action == 'confirm':
            lines = [
                f'✅ <b>ការបញ្ជាទិញរបស់អ្នកត្រូវបានបញ្ជាក់!</b>',
                '',
                f'សួស្តី {customer_name}!',
                f'ការបញ្ជាទិញ <code>#{order.order_number}</code> ត្រូវបានទទួល និងបញ្ជាក់ដោយផ្នែកលក់ហើយ។',
                '',
                '📦 <b>ផលិតផល</b>:',
                items_text,
                '',
                f'សរុបរង: ${order.subtotal}',
                f'ថ្លៃដឹកជញ្ជូន: ${order.delivery_fee}',
                f'បញ្ចុះតម្លៃ: ${order.discount}',
                f'💰 <b>សរុប: ${order.grand_total}</b>',
                f'📍 អាសយដ្ឋាន: {address}',
                '',
                'យើងនឹងរៀបចំដឹកជញ្ជូនឱ្យអ្នកឆាប់ៗនេះ។',
                'សូមអរគុណដែលជ្រើសរើស Shadow Shop!',
            ]
            if track_url:
                lines.extend(['', f'🔗 តាមដានការបញ្ជាទិញ: {track_url}'])
            return '\n'.join(lines)

        lines = [
            f'❌ <b>ការបញ្ជាទិញត្រូវបានលុបចោល</b>',
            '',
            f'សួស្តី {customer_name}!',
            f'ការបញ្ជាទិញ <code>#{order.order_number}</code> ត្រូវបានលុបចោល។',
            '',
            '📦 <b>ផលិតផល</b>:',
            items_text,
            '',
            f'💰 សរុប: ${order.grand_total}',
            '',
            'ប្រសិនបើអ្នកនៅតែចង់ទិញ សូមបញ្ជាទិញថ្មី ឬទាក់ទងផ្នែកលក់។',
            'សូមអរគុណ!',
        ]
        if track_url:
            lines.extend(['', f'🔗 មើលការបញ្ជាទិញ: {track_url}'])
        return '\n'.join(lines)

    def notify_contact_sales_customer(self, order, action: str, group_chat_id=None) -> bool:
        """Send confirm/cancel notice as a private bot DM to the customer only."""
        if action not in {'confirm', 'cancel'}:
            return False
        if not self.config:
            self.config = TelegramConfig.objects.filter(is_active=True).first()
        if not self.config:
            return False

        telegram_id = self._get_customer_telegram_id(order)
        if not telegram_id:
            return False

        return self.send_message(
            self._contact_sales_customer_message(order, action),
            event_type=f'contact_sales_customer_{action}',
            chat_id=telegram_id,
            reference=order.order_number,
            disable_web_page_preview=True,
        )

    def _clear_callback_buttons(self, callback_query: dict):
        message = callback_query.get('message') or {}
        chat = message.get('chat') or {}
        chat_id = chat.get('id')
        message_id = message.get('message_id')
        if not chat_id or not message_id:
            return None
        return self._telegram_api_post(
            'editMessageReplyMarkup',
            {
                'chat_id': chat_id,
                'message_id': message_id,
                'reply_markup': {'inline_keyboard': []},
            },
        )

    def _contact_sales_status_message(self, order, action: str, actor: str) -> str:
        from apps.orders.serializers import display_seller_name

        source = 'Customer Checkout' if getattr(order.seller, 'role', '') == 'customer' else 'Admin/Staff Order'
        if action == 'confirm':
            status_line = f"✅ <b>Confirmed</b> by {escape(actor)}"
            payment_line = 'ការបង់ប្រាក់: បានបង់ប្រាក់'
            status_km = 'ស្ថានភាព: បានបញ្ជាក់'
        else:
            status_line = f"❌ <b>Cancelled</b> by {escape(actor)}"
            payment_line = 'ការបង់ប្រាក់: មិនទាន់បង់ប្រាក់'
            status_km = 'ស្ថានភាព: បានលុបចោល'

        return (
            f"<b>សំណើទាក់ទងផ្នែកលក់</b>\n"
            f"ការបញ្ជាទិញ: <code>#{order.order_number}</code>\n"
            f"{status_km}\n"
            f"អតិថិជន: {escape(order.customer.name or 'N/A')}\n"
            f"ទូរស័ព្ទ: {escape(order.customer.phone or 'N/A')}\n"
            f"អាសយដ្ឋាន: {self._format_customer_address(order)}\n"
            f"ផលិតផល:\n{self._format_order_items(order)}\n"
            f"សរុបរង: ${order.subtotal}\n"
            f"ថ្លៃដឹកជញ្ជូន: ${order.delivery_fee}\n"
            f"បញ្ចុះតម្លៃ: ${order.discount}\n"
            f"សរុប: ${order.grand_total}\n"
            f"វិធីបង់ប្រាក់: ទាក់ទងផ្នែកលក់\n"
            f"{payment_line}\n"
            f"ប្រភព: {'អតិថិជនបញ្ជាទិញ' if source == 'Customer Checkout' else 'បុគ្គលិកបញ្ជាទិញ'}\n"
            f"អ្នកលក់: {escape(display_seller_name(order))}\n\n"
            f"{status_line}"
        )

    def _finalize_contact_sales_message(self, callback_query: dict, order, action: str, actor: str):
        message = callback_query.get('message') or {}
        chat = message.get('chat') or {}
        chat_id = chat.get('id')
        message_id = message.get('message_id')
        if not chat_id or not message_id:
            return None

        return self._telegram_api_post(
            'editMessageText',
            {
                'chat_id': chat_id,
                'message_id': message_id,
                'text': self._contact_sales_status_message(order, action, actor),
                'parse_mode': 'HTML',
                'reply_markup': {'inline_keyboard': []},
            },
        )

    @staticmethod
    def _callback_actor(callback_query: dict) -> str:
        user = callback_query.get('from') or {}
        username = user.get('username')
        if username:
            return f"@{username}"
        full_name = " ".join(
            str(user.get(key) or '').strip()
            for key in ('first_name', 'last_name')
            if str(user.get(key) or '').strip()
        )
        return full_name or str(user.get('id') or 'Telegram user')

    @classmethod
    def _run_async(cls, fn) -> None:
        def runner():
            from django.db import close_old_connections
            import threading

            # Avoid closing the shared DB connection when tests run this sync on the main thread.
            is_background = threading.current_thread() is not threading.main_thread()
            if is_background:
                close_old_connections()
            try:
                fn()
            except Exception as e:
                logger.error(f'Async Telegram follow-up failed: {e}')
            finally:
                if is_background:
                    close_old_connections()

        Thread(target=runner, daemon=True).start()

    def handle_contact_sales_callback(self, callback_query: dict) -> bool:
        data = callback_query.get('data') or ''
        parts = data.split(':')
        callback_query_id = callback_query.get('id') or ''
        if len(parts) != 3 or parts[0] != 'contact_sales' or parts[1] not in {'confirm', 'cancel'}:
            return False

        action = parts[1]
        try:
            order_id = int(parts[2])
        except (TypeError, ValueError):
            self._answer_callback_query(callback_query_id, 'Invalid order action.', alert=True)
            return True

        from apps.orders.models import Order, OrderStatusHistory

        try:
            order = Order.objects.select_related('customer', 'customer__user', 'seller').prefetch_related('items').get(
                pk=order_id,
                payment_method='contact_sales',
            )
        except Order.DoesNotExist:
            self._answer_callback_query(callback_query_id, 'Order not found.', alert=True)
            return True

        actor = self._callback_actor(callback_query)
        group_chat_id = ((callback_query.get('message') or {}).get('chat') or {}).get('id')

        if action == 'cancel':
            if order.status == Order.STATUS_CANCELLED:
                self._answer_callback_query(callback_query_id, 'Order is already cancelled.')
                self._finalize_contact_sales_message(callback_query, order, 'cancel', actor)
                return True

            order.status = Order.STATUS_CANCELLED
            order.save(update_fields=['status', 'updated_at'])
            OrderStatusHistory.objects.create(
                order=order,
                status=Order.STATUS_CANCELLED,
                note=f'Contact sales order cancelled by {actor}',
            )
            # Stop Telegram loading spinner before slower follow-up API calls.
            self._answer_callback_query(callback_query_id, f'Order #{order.order_number} cancelled.')

            def _after_cancel():
                service = TelegramService()
                service._finalize_contact_sales_message(callback_query, order, 'cancel', actor)
                service.notify_contact_sales_customer(order, 'cancel', group_chat_id=group_chat_id)

            self._run_async(_after_cancel)
            return True

        if order.status == Order.STATUS_CANCELLED:
            self._answer_callback_query(callback_query_id, 'Cannot confirm a cancelled order.', alert=True)
            self._finalize_contact_sales_message(callback_query, order, 'cancel', actor)
            return True

        from apps.finance.models import Revenue
        from apps.orders.rewards import award_points_for_paid_order

        with transaction.atomic():
            order = Order.objects.select_for_update().select_related(
                'customer', 'customer__user', 'seller',
            ).prefetch_related('items').get(pk=order.pk)
            if order.status == Order.STATUS_NEW:
                order.status = Order.STATUS_PRINTED
            order.payment_status = 'paid'
            order.save(update_fields=['status', 'payment_status', 'updated_at'])

            Revenue.objects.get_or_create(
                order=order,
                defaults={
                    'amount': order.grand_total,
                    'payment_method': 'contact_sales',
                    'reference': f'CONTACT-SALES-{order.order_number}',
                    'received_at': timezone.now(),
                    'received_by': None,
                    'notes': f'Confirmed by {actor} from Telegram sales button.',
                },
            )
            award_points_for_paid_order(order)

            already_confirmed = OrderStatusHistory.objects.filter(
                order=order,
                note__startswith='Contact sales order confirmed',
            ).exists()
            if not already_confirmed:
                OrderStatusHistory.objects.create(
                    order=order,
                    status=order.status,
                    note=f'Contact sales order confirmed and marked paid by {actor}',
                )

        # Answer immediately so the Confirm button stops spinning.
        self._answer_callback_query(callback_query_id, f'Order #{order.order_number} confirmed.')

        def _after_confirm():
            service = TelegramService()
            service._finalize_contact_sales_message(callback_query, order, 'confirm', actor)
            service.notify_payment_received(order)
            service.notify_contact_sales_customer(order, 'confirm', group_chat_id=group_chat_id)

        self._run_async(_after_confirm)
        return True

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
