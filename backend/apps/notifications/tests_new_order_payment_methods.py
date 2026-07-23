from unittest.mock import Mock, patch

from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.inventory.models import Stock
from apps.notifications.models import TelegramConfig
from apps.notifications.services import TelegramService
from apps.orders.models import Customer, Order, OrderItem
from apps.products.models import Category, Product


class NewOrderPaymentMethodFilterTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.seller = User.objects.create_user(
            username='notify-seller',
            email='seller@example.com',
            password='pass12345',
            role='admin',
        )
        self.customer = Customer.objects.create(
            name='Notify Customer',
            phone='010111222',
            address='Street 1',
            province='phnom_penh',
            created_by=self.seller,
        )
        self.category = Category.objects.create(name='Notify Cat')
        self.product = Product.objects.create(
            name='Notify Product',
            code='NP-1',
            category=self.category,
            cost_price='1.00',
            retail_price='5.00',
        )
        Stock.objects.create(product=self.product, quantity=20)

        self.sales_config = TelegramConfig.objects.create(
            name='Sales',
            bot_token='sales-token',
            chat_id='sales-chat',
            notify_new_order=True,
            new_order_payment_methods=['contact_sales'],
        )
        self.warehouse_config = TelegramConfig.objects.create(
            name='Warehouse',
            bot_token='warehouse-token',
            chat_id='warehouse-chat',
            notify_new_order=True,
            new_order_payment_methods=['cod', 'cash'],
        )
        self.all_methods_config = TelegramConfig.objects.create(
            name='All Methods',
            bot_token='all-token',
            chat_id='all-chat',
            notify_new_order=True,
            new_order_payment_methods=[],
        )

    def create_order(self, payment_method):
        order = Order.objects.create(
            customer=self.customer,
            seller=self.seller,
            status=Order.STATUS_NEW,
            payment_method=payment_method,
            payment_status='unpaid',
            subtotal=5,
            delivery_fee=0,
            discount=0,
            grand_total=5,
        )
        OrderItem.objects.create(
            order=order,
            product=self.product,
            product_name=self.product.name,
            quantity=1,
            unit_price=5,
            total_price=5,
        )
        return order

    def test_config_allows_payment_method_rules(self):
        self.assertTrue(
            TelegramService.config_allows_payment_method(self.sales_config, 'contact_sales')
        )
        self.assertFalse(
            TelegramService.config_allows_payment_method(self.sales_config, 'cod')
        )
        self.assertTrue(
            TelegramService.config_allows_payment_method(self.all_methods_config, 'cod')
        )

    @patch('apps.notifications.services.requests.post')
    def test_contact_sales_only_notifies_matching_configs(self, requests_post):
        response = Mock(status_code=200, content=b'{}')
        response.json.return_value = {'ok': True, 'result': {'message_id': 1}}
        requests_post.return_value = response

        order = self.create_order('contact_sales')
        sent = TelegramService().notify_new_order(order)

        self.assertTrue(sent)
        chat_ids = [
            call.kwargs['json']['chat_id']
            for call in requests_post.call_args_list
            if call.args[0].endswith('/sendMessage')
        ]
        self.assertIn('sales-chat', chat_ids)
        self.assertIn('all-chat', chat_ids)
        self.assertNotIn('warehouse-chat', chat_ids)

    @patch('apps.notifications.services.requests.post')
    def test_cod_only_notifies_matching_configs(self, requests_post):
        response = Mock(status_code=200, content=b'{}')
        response.json.return_value = {'ok': True, 'result': {'message_id': 2}}
        requests_post.return_value = response

        order = self.create_order('cod')
        sent = TelegramService().notify_new_order(order)

        self.assertTrue(sent)
        chat_ids = [
            call.kwargs['json']['chat_id']
            for call in requests_post.call_args_list
            if call.args[0].endswith('/sendMessage')
        ]
        self.assertIn('warehouse-chat', chat_ids)
        self.assertIn('all-chat', chat_ids)
        self.assertNotIn('sales-chat', chat_ids)

    @patch('apps.notifications.services.requests.post')
    def test_empty_methods_list_still_receives_all(self, requests_post):
        response = Mock(status_code=200, content=b'{}')
        response.json.return_value = {'ok': True, 'result': {'message_id': 3}}
        requests_post.return_value = response

        TelegramConfig.objects.exclude(id=self.all_methods_config.id).update(is_active=False)
        order = self.create_order('aba')
        sent = TelegramService().notify_new_order(order)

        self.assertTrue(sent)
        chat_ids = [
            call.kwargs['json']['chat_id']
            for call in requests_post.call_args_list
            if call.args[0].endswith('/sendMessage')
        ]
        self.assertEqual(chat_ids, ['all-chat'])
