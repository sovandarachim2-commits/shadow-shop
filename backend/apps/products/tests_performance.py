from decimal import Decimal
from unittest.mock import patch

from django.core.cache import cache
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.products.flash_sale_stats import attach_flash_sale_stats
from apps.products.models import Brand, Category, Product
from apps.orders.models import Customer, Order, OrderItem
from utils.storefront_cache import HOME_FEED_CACHE_KEY, bump_storefront_cache, safe_cache_get


class FlashSaleStatsBatchTests(TestCase):
    def setUp(self):
        self.category = Category.objects.create(name='Makeup', slug='makeup')
        self.brand = Brand.objects.create(name='Shadow', slug='shadow')
        now = timezone.now()
        self.active = Product.objects.create(
            code='P1',
            name='Sale Lipstick',
            slug='sale-lipstick',
            category=self.category,
            brand=self.brand,
            retail_price=Decimal('20.00'),
            wholesale_price=Decimal('10.00'),
            cost_price=Decimal('5.00'),
            flash_sale_price=Decimal('12.00'),
            flash_sale_starts_at=now - timezone.timedelta(days=1),
            flash_sale_ends_at=now + timezone.timedelta(days=1),
            is_featured=True,
            is_active=True,
        )
        self.inactive = Product.objects.create(
            code='P2',
            name='Normal Cream',
            slug='normal-cream',
            category=self.category,
            brand=self.brand,
            retail_price=Decimal('15.00'),
            wholesale_price=Decimal('8.00'),
            cost_price=Decimal('4.00'),
            is_active=True,
        )
        customer = Customer.objects.create(name='Buyer', phone='85510000000', address='')
        order = Order.objects.create(
            customer=customer,
            status='pending',
            payment_status='paid',
            is_draft=False,
            subtotal=Decimal('12.00'),
            grand_total=Decimal('12.00'),
        )
        OrderItem.objects.create(
            order=order,
            product=self.active,
            product_name=self.active.name,
            product_code=self.active.code,
            quantity=2,
            unit_price=self.active.flash_sale_price,
            cost_price=self.active.cost_price,
            total_price=Decimal('24.00'),
        )

    def test_attach_flash_sale_stats_batches_and_skips_inactive(self):
        products = [self.active, self.inactive]
        with self.assertNumQueries(1):
            attach_flash_sale_stats(products)
        self.assertEqual(self.active._flash_sale_order_count, 1)
        self.assertEqual(self.active._flash_sale_quantity_sold, 2)
        self.assertEqual(self.inactive._flash_sale_order_count, 0)


class HomeFeedPerformanceTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        category = Category.objects.create(name='Skincare', slug='skincare', is_active=True)
        brand = Brand.objects.create(name='Glow', slug='glow', is_active=True)
        for i in range(3):
            Product.objects.create(
                code=f'H{i}',
                name=f'Home Product {i}',
                slug=f'home-product-{i}',
                category=category,
                brand=brand,
                retail_price=Decimal('10.00'),
                wholesale_price=Decimal('5.00'),
                cost_price=Decimal('2.00'),
                is_active=True,
                is_best_seller=True,
                is_new_arrival=True,
            )

    def test_home_feed_uses_cache_on_second_request(self):
        first = self.client.get('/api/products/home/')
        self.assertEqual(first.status_code, 200)
        self.assertIsNotNone(safe_cache_get(HOME_FEED_CACHE_KEY))
        with patch('apps.products.views.ProductListSerializer') as mock_serializer:
            second = self.client.get('/api/products/home/')
            self.assertEqual(second.status_code, 200)
            mock_serializer.assert_not_called()

    def test_category_list_avoids_per_row_count_queries(self):
        # Annotated list stays O(1): count + page + children prefetch (not N+1 counts).
        for i in range(5):
            Category.objects.create(name=f'Cat {i}', slug=f'cat-{i}', is_active=True)
        with self.assertNumQueries(3):
            response = self.client.get('/api/products/categories/?is_active=true')
        self.assertEqual(response.status_code, 200)
        rows = response.data['results'] if isinstance(response.data, dict) and 'results' in response.data else response.data
        self.assertGreaterEqual(len(rows), 5)
        self.assertIn('products_count', rows[0])


class SafeCacheTests(TestCase):
    def test_bump_clears_home_and_auth_keys(self):
        cache.set(HOME_FEED_CACHE_KEY, {'ok': True}, 60)
        cache.set('auth:telegram_login_config:v1', {'configured': True}, 60)
        bump_storefront_cache()
        self.assertIsNone(cache.get(HOME_FEED_CACHE_KEY))
        self.assertIsNone(cache.get('auth:telegram_login_config:v1'))


@override_settings(PERF_INSTRUMENT_DB=False)
class ProductListCacheTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        category = Category.objects.create(name='Hair', slug='hair')
        brand = Brand.objects.create(name='Silk', slug='silk')
        Product.objects.create(
            code='L1',
            name='Listed Serum',
            slug='listed-serum',
            category=category,
            brand=brand,
            retail_price=Decimal('9.00'),
            wholesale_price=Decimal('4.00'),
            cost_price=Decimal('1.00'),
            is_active=True,
        )

    def test_anonymous_product_list_caches_payload(self):
        first = self.client.get('/api/products/items/?is_active=true&page_size=12')
        self.assertEqual(first.status_code, 200)
        with patch('apps.products.views.attach_flash_sale_stats') as mock_attach:
            second = self.client.get('/api/products/items/?is_active=true&page_size=12')
            self.assertEqual(second.status_code, 200)
            mock_attach.assert_not_called()
