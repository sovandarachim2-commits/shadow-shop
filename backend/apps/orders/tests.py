from unittest.mock import Mock, patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from apps.inventory.models import Stock
from apps.notifications.models import TelegramConfig
from apps.notifications.services import TelegramService
from apps.orders.models import Customer, Order, OrderItem, OrderStatusHistory
from apps.orders.serializers import CustomerCheckoutSerializer
from apps.payments.checkout_flow import fulfill_pending_checkout, prepare_online_checkout
from apps.payments.models import PendingCheckout
from apps.products.models import Category, Product


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
        on_commit.call_args.args[0]()
        notify_new_order_async.assert_called_once_with(order.id)

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
        self.assertIn('អាសយដ្ឋាន: Phnom Penh, Street 1', payload['text'])
        self.assertIn('វិធីបង់ប្រាក់: ទាក់ទងផ្នែកលក់', payload['text'])

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
