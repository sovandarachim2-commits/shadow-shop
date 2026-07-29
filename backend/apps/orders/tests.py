from decimal import Decimal
from unittest.mock import Mock, patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.inventory.models import Stock
from apps.notifications.models import TelegramConfig
from apps.notifications.services import TelegramService
from apps.orders.models import Customer, Order, OrderItem, OrderStatusHistory
from apps.orders.serializers import CustomerCheckoutSerializer
from apps.payments.checkout_flow import fulfill_pending_checkout, prepare_online_checkout
from apps.payments.models import PendingCheckout
from apps.products.models import Category, Product
from apps.finance.models import Revenue


class CustomerOrderFlowTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(
            username='order-customer',
            password='pass12345',
            role='customer',
            phone='010000000',
        )
        self.category = Category.objects.create(name='Order Test Category')
        self.product = Product.objects.create(
            code='ORDER-TEST-1',
            name='Order Test Product',
            category=self.category,
            cost_price='4.00',
            retail_price='10.00',
        )
        Stock.objects.create(product=self.product, quantity=20)
        self.request = Mock(user=self.user)
        self.request.build_absolute_uri.side_effect = lambda location='': location

    def checkout_payload(self, payment_method='cod'):
        return {
            'name': 'Order Customer',
            'phone': '010000000',
            'email': 'customer@example.com',
            'address': 'Phnom Penh',
            'province': 'phnom_penh',
            'district': 'Chamkar Mon',
            'address_detail': 'Street 1',
            'notes': 'Home Delivery. Chamkar Mon, Phnom Penh',
            'payment_method': payment_method,
            'payment_status': 'unpaid',
            'delivery_fee': '2.00',
            'items': [
                {
                    'product': self.product.id,
                    'quantity': 2,
                    'unit_price': '10.00',
                    'cost_price': '4.00',
                },
            ],
        }

    def create_customer_order(self, payment_method='cod'):
        serializer = CustomerCheckoutSerializer(
            data=self.checkout_payload(payment_method),
            context={'request': self.request},
        )
        serializer.is_valid(raise_exception=True)
        return serializer.save()

    @patch('django.db.transaction.on_commit')
    @patch('apps.notifications.services.TelegramService.notify_new_order_async')
    def test_cod_checkout_creates_unpaid_order_and_queues_new_order_notification(self, notify_new_order_async, on_commit):
        order = self.create_customer_order('cod')

        self.assertEqual(order.payment_method, 'cod')
        self.assertEqual(order.payment_status, 'unpaid')
        self.assertEqual(order.items.count(), 1)
        self.assertEqual(order.status_history.count(), 1)
        on_commit.assert_called_once()
        notify_new_order_async.assert_not_called()

        on_commit.call_args.args[0]()

        notify_new_order_async.assert_called_once_with(order.id)

    @patch('django.db.transaction.on_commit')
    @patch('apps.notifications.services.TelegramService.notify_new_order_async')
    def test_cash_checkout_queues_new_order_notification(self, notify_new_order_async, on_commit):
        order = self.create_customer_order('cash')

        self.assertEqual(order.payment_method, 'cash')
        self.assertEqual(order.payment_status, 'unpaid')
        on_commit.call_args.args[0]()
        notify_new_order_async.assert_called_once_with(order.id)

    @patch('django.db.transaction.on_commit')
    @patch('apps.notifications.services.TelegramService.notify_new_order_async')
    def test_contact_sales_checkout_queues_new_order_notification(self, notify_new_order_async, on_commit):
        order = self.create_customer_order('contact_sales')

        self.assertEqual(order.payment_method, 'contact_sales')
        self.assertEqual(order.payment_status, 'unpaid')
        self.assertEqual(order.seller.role, 'customer')
        on_commit.call_args.args[0]()
        notify_new_order_async.assert_called_once_with(order.id)

    def test_seller_can_see_unassigned_new_contact_sales_order(self):
        seller = get_user_model().objects.create_user(
            username='seller-contact-view',
            password='pass12345',
            role='seller',
        )
        order = self.create_customer_order('contact_sales')
        client = APIClient()
        client.force_authenticate(seller)

        response = client.get('/api/orders/list/')

        self.assertEqual(response.status_code, 200)
        order_ids = [item['id'] for item in response.data['results']]
        self.assertIn(order.id, order_ids)

    @patch('django.db.transaction.on_commit')
    def test_seller_claims_unassigned_contact_sales_order_on_confirm(self, on_commit):
        seller = get_user_model().objects.create_user(
            username='seller-contact-claim',
            password='pass12345',
            role='seller',
        )
        other_seller = get_user_model().objects.create_user(
            username='seller-contact-other',
            password='pass12345',
            role='seller',
        )
        order = self.create_customer_order('contact_sales')
        on_commit.reset_mock()
        client = APIClient()
        client.force_authenticate(seller)

        response = client.post(
            f'/api/orders/list/{order.id}/admin_update/',
            {'status': Order.STATUS_CONFIRMED, 'notes': 'Seller claimed this contact sale'},
            format='json',
        )

        order.refresh_from_db()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(order.seller, seller)
        self.assertEqual(order.status, Order.STATUS_CONFIRMED)
        self.assertIn('contact_sales_receipt_message', response.data)

        client.force_authenticate(other_seller)
        hidden_response = client.get(f'/api/orders/list/{order.id}/')
        self.assertEqual(hidden_response.status_code, 404)

    def test_seller_cannot_update_order_status_beyond_confirmed(self):
        seller = get_user_model().objects.create_user(
            username='seller-status-limit',
            password='pass12345',
            role='seller',
        )
        order = self.create_customer_order('contact_sales')
        order.seller = seller
        order.save(update_fields=['seller'])
        client = APIClient()
        client.force_authenticate(seller)

        response = client.post(
            f'/api/orders/list/{order.id}/update_status/',
            {'status': Order.STATUS_PRINTED},
            format='json',
        )

        order.refresh_from_db()
        self.assertEqual(response.status_code, 403)
        self.assertEqual(order.status, Order.STATUS_NEW)

    def test_seller_admin_update_cannot_set_order_status_beyond_confirmed(self):
        seller = get_user_model().objects.create_user(
            username='seller-edit-status-limit',
            password='pass12345',
            role='seller',
        )
        order = self.create_customer_order('contact_sales')
        order.seller = seller
        order.save(update_fields=['seller'])
        client = APIClient()
        client.force_authenticate(seller)

        response = client.post(
            f'/api/orders/list/{order.id}/admin_update/',
            {'status': Order.STATUS_PRINTED},
            format='json',
        )

        order.refresh_from_db()
        self.assertEqual(response.status_code, 400)
        self.assertEqual(order.status, Order.STATUS_NEW)

    def test_seller_admin_update_can_change_payment_fields(self):
        seller = get_user_model().objects.create_user(
            username='seller-payment-edit-limit',
            password='pass12345',
            role='seller',
        )
        order = self.create_customer_order('contact_sales')
        order.seller = seller
        order.save(update_fields=['seller'])
        client = APIClient()
        client.force_authenticate(seller)

        response = client.post(
            f'/api/orders/list/{order.id}/admin_update/',
            {'payment_status': 'paid', 'payment_method': 'cash'},
            format='json',
        )

        order.refresh_from_db()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(order.payment_status, 'paid')
        self.assertEqual(order.payment_method, 'cash')

    def test_seller_cannot_admin_update_printed_order(self):
        seller = get_user_model().objects.create_user(
            username='seller-printed-edit-limit',
            password='pass12345',
            role='seller',
        )
        order = self.create_customer_order('contact_sales')
        order.seller = seller
        order.status = Order.STATUS_PRINTED
        order.printed_at = timezone.now()
        order.save(update_fields=['seller', 'status', 'printed_at'])
        client = APIClient()
        client.force_authenticate(seller)

        response = client.post(
            f'/api/orders/list/{order.id}/admin_update/',
            {'notes': 'seller should not change printed order'},
            format='json',
        )

        order.refresh_from_db()
        self.assertEqual(response.status_code, 400)
        self.assertNotEqual(order.notes, 'seller should not change printed order')

    def test_seller_cannot_update_printed_order_status(self):
        seller = get_user_model().objects.create_user(
            username='seller-printed-status-limit',
            password='pass12345',
            role='seller',
        )
        order = self.create_customer_order('contact_sales')
        order.seller = seller
        order.status = Order.STATUS_PRINTED
        order.printed_at = timezone.now()
        order.save(update_fields=['seller', 'status', 'printed_at'])
        client = APIClient()
        client.force_authenticate(seller)

        response = client.post(
            f'/api/orders/list/{order.id}/update_status/',
            {'status': Order.STATUS_CONFIRMED},
            format='json',
        )

        order.refresh_from_db()
        self.assertEqual(response.status_code, 403)
        self.assertEqual(order.status, Order.STATUS_PRINTED)

    def test_seller_cannot_mark_order_paid(self):
        seller = get_user_model().objects.create_user(
            username='seller-payment-limit',
            password='pass12345',
            role='seller',
        )
        order = self.create_customer_order('contact_sales')
        order.seller = seller
        order.save(update_fields=['seller'])
        client = APIClient()
        client.force_authenticate(seller)

        response = client.post(
            f'/api/orders/list/{order.id}/mark_paid/',
            {'payment_method': 'cash'},
            format='json',
        )

        order.refresh_from_db()
        self.assertEqual(response.status_code, 403)
        self.assertEqual(order.payment_status, 'unpaid')
        self.assertEqual(order.payment_method, 'contact_sales')

    @patch('apps.notifications.services.requests.post')
    def test_contact_sales_telegram_message_includes_order_products(self, requests_post):
        response = Mock(status_code=200, content=b'{}')
        response.json.return_value = {'result': {'message_id': 123}}
        requests_post.return_value = response
        TelegramConfig.objects.create(
            name='Sales',
            bot_token='test-token',
            chat_id='test-chat',
            notify_new_order=True,
        )

        order = self.create_customer_order('contact_sales')

        self.assertTrue(TelegramService().notify_new_order(order))
        payload = requests_post.call_args.kwargs['json']
        self.assertEqual(payload['chat_id'], 'test-chat')
        self.assertEqual(order.status, Order.STATUS_NEW)
        self.assertEqual(order.payment_status, 'unpaid')
        self.assertIn('<b>សំណើទាក់ទងផ្នែកលក់</b>', payload['text'])
        self.assertIn('ស្ថានភាព: កំពុងរង់ចាំផ្នែកលក់បញ្ជាក់', payload['text'])
        self.assertIn('Order Test Product x2 @ $10.00', payload['text'])
        self.assertEqual(
            payload['reply_markup']['inline_keyboard'][0][0]['callback_data'],
            f'contact_sales:contact:{order.id}',
        )
        self.assertEqual(
            payload['reply_markup']['inline_keyboard'][0][0]['text'],
            'Contact Customer',
        )
        self.assertEqual(len(payload['reply_markup']['inline_keyboard'][0]), 1)
        self.assertIn('អាសយដ្ឋាន: Phnom Penh, Street 1', payload['text'])
        self.assertIn('វិធីបង់ប្រាក់: ទាក់ទងផ្នែកលក់', payload['text'])

    @patch('apps.notifications.services.requests.post')
    def test_contact_sales_contact_button_does_not_confirm_order(self, requests_post):
        response = Mock(status_code=200, content=b'{}')
        response.json.return_value = {'ok': True}
        requests_post.return_value = response
        TelegramConfig.objects.create(
            name='Sales',
            bot_token='test-token',
            chat_id='test-chat',
            notify_new_order=True,
        )
        order = self.create_customer_order('contact_sales')

        handled = TelegramService().handle_contact_sales_callback({
            'id': 'callback-contact',
            'data': f'contact_sales:contact:{order.id}',
            'from': {'username': 'seller_one'},
            'message': {'message_id': 321, 'chat': {'id': 'test-chat'}},
        })

        order.refresh_from_db()
        self.assertTrue(handled)
        self.assertEqual(order.status, Order.STATUS_NEW)
        self.assertEqual(order.payment_status, 'unpaid')
        self.assertTrue(OrderStatusHistory.objects.filter(
            order=order,
            status=Order.STATUS_NEW,
            note='Contact sales customer contact opened by @seller_one; payment remains unpaid',
        ).exists())
        self.assertFalse(Revenue.objects.filter(order=order, payment_method='contact_sales').exists())

    @patch('apps.notifications.services.Thread')
    @patch('apps.notifications.services.requests.post')
    def test_contact_sales_confirm_button_records_confirmation(self, requests_post, thread_cls):
        thread_cls.side_effect = lambda target=None, daemon=None: type('T', (), {'start': staticmethod(lambda: target())})()
        response = Mock(status_code=200, content=b'{}')
        response.json.return_value = {'ok': True}
        requests_post.return_value = response
        TelegramConfig.objects.create(
            name='Sales',
            bot_token='test-token',
            chat_id='test-chat',
            notify_new_order=True,
            notify_payment=True,
        )
        self.user.telegram_id = '999888777'
        self.user.save(update_fields=['telegram_id'])
        order = self.create_customer_order('contact_sales')

        handled = TelegramService().handle_contact_sales_callback({
            'id': 'callback-1',
            'data': f'contact_sales:confirm:{order.id}',
            'from': {'username': 'seller_one'},
            'message': {'message_id': 321, 'chat': {'id': 'test-chat'}},
        })

        order.refresh_from_db()
        self.assertTrue(handled)
        self.assertEqual(order.status, Order.STATUS_CONFIRMED)
        self.assertEqual(order.payment_status, 'unpaid')
        self.assertTrue(OrderStatusHistory.objects.filter(
            order=order,
            status=Order.STATUS_CONFIRMED,
            note='Contact sales customer contact started by @seller_one; payment remains unpaid',
        ).exists())
        self.assertFalse(Revenue.objects.filter(order=order, payment_method='contact_sales').exists())
        methods = [call.args[0].rsplit('/', 1)[-1] for call in requests_post.call_args_list]
        self.assertEqual(methods[0], 'answerCallbackQuery')
        self.assertIn('editMessageText', methods)
        edit_payload = next(
            call.kwargs['json']
            for call in requests_post.call_args_list
            if call.args[0].rsplit('/', 1)[-1] == 'editMessageText'
        )
        self.assertIn('✅ <b>Contact Customer</b> by @seller_one', edit_payload['text'])
        self.assertIn('ការបង់ប្រាក់: មិនទាន់បង់ប្រាក់', edit_payload['text'])
        self.assertEqual(edit_payload['reply_markup'], {'inline_keyboard': []})

        send_payloads = [
            call.kwargs['json']
            for call in requests_post.call_args_list
            if call.args[0].rsplit('/', 1)[-1] == 'sendMessage'
        ]
        customer_dm = next(p for p in send_payloads if p.get('chat_id') == '999888777')
        self.assertIn('ការបញ្ជាទិញរបស់អ្នកត្រូវបានបញ្ជាក់', customer_dm['text'])
        self.assertIn(f'#{order.order_number}', customer_dm['text'])
        self.assertIn('Order Test Product', customer_dm['text'])
        self.assertTrue(customer_dm.get('disable_web_page_preview'))
        share = next(
            p for p in send_payloads
            if p.get('chat_id') == 'test-chat' and 'ការបញ្ជាទិញរបស់អ្នកត្រូវបានបញ្ជាក់' in p.get('text', '')
        )
        self.assertIn(f'#{order.order_number}', share['text'])
        self.assertNotIn('Copy &amp; send to customer', share['text'])
        self.assertNotIn('Sent to customer via bot', share['text'])
        self.assertNotIn('Customer has no linked Telegram', share['text'])

    @patch('django.db.transaction.on_commit')
    def test_admin_system_confirms_contact_sales_without_marking_paid(self, on_commit):
        admin = get_user_model().objects.create_user(
            username='order-admin',
            password='pass12345',
            role='admin',
        )
        order = self.create_customer_order('contact_sales')
        on_commit.reset_mock()
        client = APIClient()
        client.force_authenticate(admin)

        response = client.post(f'/api/orders/list/{order.id}/confirm_contact_sales/')

        order.refresh_from_db()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(order.status, Order.STATUS_CONFIRMED)
        self.assertIsNone(order.printed_at)
        self.assertIsNone(order.printed_by)
        self.assertEqual(order.payment_status, 'unpaid')
        self.assertFalse(Revenue.objects.filter(order=order, payment_method='contact_sales').exists())
        self.assertTrue(OrderStatusHistory.objects.filter(
            order=order,
            status=Order.STATUS_CONFIRMED,
            changed_by=admin,
            note='Contact sales order confirmed by order-admin; payment remains unpaid',
        ).exists())
        self.assertIn('contact_sales_receipt_message', response.data)
        self.assertIn(f'#{order.order_number}', response.data['contact_sales_receipt_message'])
        self.assertIn('Order Test Product', response.data['contact_sales_receipt_message'])
        self.assertTrue(response.data['contact_sales_customer_message_queued'])
        on_commit.assert_called_once()

    @patch('django.db.transaction.on_commit')
    def test_admin_edit_auto_confirms_new_contact_sales_order(self, on_commit):
        seller = get_user_model().objects.create_user(
            username='seller-editor',
            password='pass12345',
            role='seller',
        )
        order = self.create_customer_order('contact_sales')
        order.seller = seller
        order.save(update_fields=['seller'])
        on_commit.reset_mock()
        client = APIClient()
        client.force_authenticate(seller)

        response = client.post(
            f'/api/orders/list/{order.id}/admin_update/',
            {'notes': 'Seller discussed with customer'},
            format='json',
        )

        order.refresh_from_db()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(order.status, Order.STATUS_CONFIRMED)
        self.assertIsNone(order.printed_at)
        self.assertIsNone(order.printed_by)
        self.assertEqual(order.payment_status, 'unpaid')
        self.assertFalse(Revenue.objects.filter(order=order, payment_method='contact_sales').exists())
        self.assertTrue(OrderStatusHistory.objects.filter(
            order=order,
            status=Order.STATUS_CONFIRMED,
            changed_by=seller,
            note='Contact sales order confirmed by seller-editor; payment remains unpaid',
        ).exists())
        self.assertIn('contact_sales_receipt_message', response.data)
        self.assertIn(f'#{order.order_number}', response.data['contact_sales_receipt_message'])
        self.assertTrue(response.data['contact_sales_customer_message_queued'])
        self.assertEqual(on_commit.call_count, 2)

    @patch('django.db.transaction.on_commit')
    def test_admin_edit_manual_confirm_contact_sales_returns_receipt_message(self, on_commit):
        seller = get_user_model().objects.create_user(
            username='seller-status-editor',
            password='pass12345',
            role='seller',
        )
        order = self.create_customer_order('contact_sales')
        order.seller = seller
        order.save(update_fields=['seller'])
        on_commit.reset_mock()
        client = APIClient()
        client.force_authenticate(seller)

        response = client.post(
            f'/api/orders/list/{order.id}/admin_update/',
            {'status': Order.STATUS_CONFIRMED, 'notes': 'Seller confirmed after customer chat'},
            format='json',
        )

        order.refresh_from_db()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(order.status, Order.STATUS_CONFIRMED)
        self.assertEqual(order.payment_status, 'unpaid')
        self.assertIn('contact_sales_receipt_message', response.data)
        self.assertIn(f'#{order.order_number}', response.data['contact_sales_receipt_message'])
        self.assertTrue(response.data['contact_sales_customer_message_queued'])
        self.assertEqual(on_commit.call_count, 2)

    @patch('django.db.transaction.on_commit')
    def test_admin_edit_confirmed_contact_sales_returns_receipt_message_again(self, on_commit):
        seller = get_user_model().objects.create_user(
            username='seller-repeat-editor',
            password='pass12345',
            role='seller',
        )
        order = self.create_customer_order('contact_sales')
        order.seller = seller
        order.status = Order.STATUS_CONFIRMED
        order.save(update_fields=['seller', 'status'])
        on_commit.reset_mock()
        client = APIClient()
        client.force_authenticate(seller)

        response = client.post(
            f'/api/orders/list/{order.id}/admin_update/',
            {'notes': 'Seller copied receipt again'},
            format='json',
        )

        order.refresh_from_db()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(order.status, Order.STATUS_CONFIRMED)
        self.assertIn('contact_sales_receipt_message', response.data)
        self.assertIn(f'#{order.order_number}', response.data['contact_sales_receipt_message'])
        self.assertFalse(response.data['contact_sales_customer_message_queued'])
        self.assertEqual(on_commit.call_count, 1)

    @patch('apps.notifications.services.Thread')
    @patch('apps.notifications.services.requests.post')
    def test_contact_sales_cancel_button_cancels_order(self, requests_post, thread_cls):
        thread_cls.side_effect = lambda target=None, daemon=None: type('T', (), {'start': staticmethod(lambda: target())})()
        response = Mock(status_code=200, content=b'{}')
        response.json.return_value = {'ok': True}
        requests_post.return_value = response
        TelegramConfig.objects.create(
            name='Sales',
            bot_token='test-token',
            chat_id='test-chat',
            notify_new_order=True,
        )
        order = self.create_customer_order('contact_sales')

        handled = TelegramService().handle_contact_sales_callback({
            'id': 'callback-2',
            'data': f'contact_sales:cancel:{order.id}',
            'from': {'first_name': 'Sales', 'last_name': 'Team'},
            'message': {'message_id': 322, 'chat': {'id': 'test-chat'}},
        })

        order.refresh_from_db()
        self.assertTrue(handled)
        self.assertEqual(order.status, Order.STATUS_CANCELLED)
        self.assertTrue(OrderStatusHistory.objects.filter(
            order=order,
            status=Order.STATUS_CANCELLED,
            note='Contact sales order cancelled by Sales Team',
        ).exists())
        methods = [call.args[0].rsplit('/', 1)[-1] for call in requests_post.call_args_list]
        self.assertEqual(methods[0], 'answerCallbackQuery')
        self.assertIn('editMessageText', methods)
        edit_payload = next(
            call.kwargs['json']
            for call in requests_post.call_args_list
            if call.args[0].rsplit('/', 1)[-1] == 'editMessageText'
        )
        self.assertIn('❌ <b>Cancelled</b> by Sales Team', edit_payload['text'])
        self.assertIn('ស្ថានភាព: បានលុបចោល', edit_payload['text'])
        self.assertEqual(edit_payload['reply_markup'], {'inline_keyboard': []})
        # No linked Telegram → group still gets clean customer message (no header).
        send_payloads = [
            call.kwargs['json']
            for call in requests_post.call_args_list
            if call.args[0].rsplit('/', 1)[-1] == 'sendMessage'
        ]
        share = next(p for p in send_payloads if 'ការបញ្ជាទិញត្រូវបានលុបចោល' in p.get('text', ''))
        self.assertIn(f'#{order.order_number}', share['text'])
        self.assertNotIn('Copy &amp; send to customer', share['text'])
        self.assertNotIn('Customer has no linked Telegram', share['text'])

    @patch('apps.notifications.services.requests.post')
    def test_contact_sales_copy_message_can_be_disabled_per_telegram_destination(self, requests_post):
        response = Mock(status_code=200, content=b'{}')
        response.json.return_value = {'ok': True}
        requests_post.return_value = response
        TelegramConfig.objects.create(
            name='Sales',
            bot_token='test-token',
            chat_id='test-chat',
            notify_new_order=True,
            notify_contact_sales_copy=False,
        )
        order = self.create_customer_order('contact_sales')

        sent = TelegramService().notify_contact_sales_customer(order, 'confirm', group_chat_id='test-chat')

        self.assertFalse(sent)
        self.assertEqual(requests_post.call_count, 0)

    @patch('apps.notifications.services.TelegramService.notify_payment_received')
    def test_admin_mark_paid_records_payment_history(self, notify_payment_received):
        User = get_user_model()
        admin = User.objects.create_user(
            username='payment-admin',
            password='pass12345',
            role='admin',
            is_staff=True,
        )
        order = self.create_customer_order('cod')
        client = APIClient()
        client.force_authenticate(user=admin)

        response = client.post(f'/api/orders/list/{order.id}/mark_paid/', {'payment_method': 'cash'}, format='json')

        self.assertEqual(response.status_code, 200, response.data)
        order.refresh_from_db()
        self.assertEqual(order.payment_status, 'paid')
        self.assertEqual(order.payment_method, 'cash')
        self.assertTrue(OrderStatusHistory.objects.filter(
            order=order,
            changed_by=admin,
            note='Payment recorded: status unpaid -> paid; method cod -> cash',
        ).exists())
        notify_payment_received.assert_called_once()

    def test_admin_order_list_can_filter_by_delivery_by(self):
        User = get_user_model()
        admin = User.objects.create_user(
            username='delivery-filter-admin',
            password='pass12345',
            role='admin',
            is_staff=True,
        )
        matched = self.create_customer_order('cod')
        matched.out_delivery_by = 'Wing Delivery'
        matched.save(update_fields=['out_delivery_by'])
        other = self.create_customer_order('cash')
        other.out_delivery_by = 'Other Delivery'
        other.save(update_fields=['out_delivery_by'])
        client = APIClient()
        client.force_authenticate(user=admin)

        response = client.get('/api/orders/list/', {'delivery_by': 'Wing Delivery'})

        self.assertEqual(response.status_code, 200, response.data)
        order_numbers = [row['order_number'] for row in response.data['results']]
        self.assertIn(matched.order_number, order_numbers)
        self.assertNotIn(other.order_number, order_numbers)

    def test_storefront_my_orders_scope_limits_staff_to_own_customer_orders(self):
        User = get_user_model()
        admin = User.objects.create_user(
            username='storefront-my-orders-admin',
            password='pass12345',
            role='admin',
            phone='010000001',
        )
        own_customer = Customer.objects.create(
            user=admin,
            name='Admin Shopper',
            phone='010000001',
            address='Phnom Penh',
        )
        own_order = Order.objects.create(
            customer=own_customer,
            seller=admin,
            payment_method='cod',
            payment_status='unpaid',
            subtotal=Decimal('10.00'),
        )
        other_order = self.create_customer_order('cod')
        client = APIClient()
        client.force_authenticate(user=admin)

        scoped_response = client.get('/api/orders/list/', {'my_orders': 1, 'page_size': 100})
        admin_response = client.get('/api/orders/list/', {'page_size': 100})
        hidden_detail_response = client.get(f'/api/orders/list/{other_order.id}/', {'my_orders': 1})

        self.assertEqual(scoped_response.status_code, 200, scoped_response.data)
        scoped_order_ids = [item['id'] for item in scoped_response.data['results']]
        self.assertIn(own_order.id, scoped_order_ids)
        self.assertNotIn(other_order.id, scoped_order_ids)
        self.assertEqual(admin_response.status_code, 200, admin_response.data)
        admin_order_ids = [item['id'] for item in admin_response.data['results']]
        self.assertIn(own_order.id, admin_order_ids)
        self.assertIn(other_order.id, admin_order_ids)
        self.assertEqual(hidden_detail_response.status_code, 404)

    @patch('apps.payments.checkout_flow.TelegramService')
    def test_pay_now_checkout_prepares_pending_checkout_without_creating_order(self, telegram_service):
        result = prepare_online_checkout(self.request, self.checkout_payload('aba'))

        self.assertIn('pending_checkout', result)
        self.assertIn('aba_payment', result)
        self.assertEqual(PendingCheckout.objects.count(), 1)
        self.assertEqual(Order.objects.count(), 0)
        telegram_service.notify_new_order_async.assert_not_called()

    @patch('django.db.transaction.on_commit')
    @patch('apps.notifications.services.TelegramService.notify_new_order_async')
    def test_acleda_checkout_creates_unpaid_order_without_pending_checkout(self, notify_new_order_async, on_commit):
        order = self.create_customer_order('acleda')

        self.assertEqual(order.payment_method, 'acleda')
        self.assertEqual(order.payment_status, 'unpaid')
        self.assertEqual(PendingCheckout.objects.count(), 0)
        on_commit.call_args.args[0]()
        notify_new_order_async.assert_called_once_with(order.id)

    @patch('django.db.transaction.on_commit')
    @patch('apps.notifications.services.TelegramService.notify_new_order_async')
    def test_pay_now_methods_do_not_notify_until_paid_order_is_fulfilled(self, notify_new_order_async, on_commit):
        order = self.create_customer_order('aba')

        self.assertEqual(order.payment_method, 'aba')
        self.assertEqual(order.payment_status, 'unpaid')
        on_commit.assert_not_called()
        notify_new_order_async.assert_not_called()

    @patch('apps.payments.checkout_flow.transaction.on_commit')
    @patch('apps.notifications.services.TelegramService.notify_new_order_async')
    def test_paid_pending_checkout_creates_paid_order_and_queues_new_order_once(
        self,
        notify_new_order_async,
        checkout_on_commit,
    ):
        pending = PendingCheckout.objects.create(
            user=self.user,
            payment_method='aba',
            checkout_data=self.checkout_payload('aba'),
            amount='22.00',
            expires_at=timezone.now() + timezone.timedelta(minutes=5),
        )

        order = fulfill_pending_checkout(pending, self.request)

        self.assertEqual(order.payment_method, 'aba')
        self.assertEqual(order.payment_status, 'paid')
        self.assertEqual(PendingCheckout.objects.get(pk=pending.pk).status, PendingCheckout.STATUS_PAID)
        checkout_on_commit.assert_called_once()
        notify_new_order_async.assert_not_called()

        checkout_on_commit.call_args.args[0]()

        notify_new_order_async.assert_called_once_with(order.id)

    def test_customer_totals_and_order_history_are_updated(self):
        order = self.create_customer_order('cod')
        customer = Customer.objects.get(user=self.user)

        self.assertEqual(customer.total_orders, 1)
        self.assertEqual(customer.total_spent, order.grand_total)
        self.assertEqual(OrderItem.objects.filter(order=order).count(), 1)
        self.assertTrue(OrderStatusHistory.objects.filter(order=order, note='Order placed online').exists())


class StaffStorefrontCheckoutTests(TestCase):
    """Staff accounts must be able to place test orders from the storefront."""

    def setUp(self):
        from rest_framework.test import APIClient

        User = get_user_model()
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username='checkout-admin',
            password='pass12345',
            role='admin',
            phone='010000001',
        )
        self.category = Category.objects.create(name='Staff Checkout Category')
        self.product = Product.objects.create(
            code='STAFF-CHECKOUT-1',
            name='Staff Checkout Product',
            category=self.category,
            cost_price='4.00',
            retail_price='10.00',
        )
        Stock.objects.create(product=self.product, quantity=20)
        self.client.force_authenticate(user=self.admin)

    def test_admin_can_post_storefront_checkout(self):
        response = self.client.post(
            '/api/orders/list/checkout/',
            {
                'name': 'Admin Shopper',
                'phone': '010000001',
                'email': 'admin@example.com',
                'address': 'Phnom Penh',
                'province': 'phnom_penh',
                'payment_method': 'cod',
                'payment_status': 'unpaid',
                'delivery_fee': '2.00',
                'items': [
                    {
                        'product': self.product.id,
                        'quantity': 1,
                        'unit_price': '10.00',
                        'cost_price': '4.00',
                    },
                ],
            },
            format='json',
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertTrue(Customer.objects.filter(user=self.admin).exists())
        self.assertEqual(Order.objects.filter(customer__user=self.admin).count(), 1)
