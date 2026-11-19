from decimal import Decimal
from io import BytesIO
from types import SimpleNamespace

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.utils import timezone
from PIL import Image
from rest_framework.test import APIClient
from rest_framework.exceptions import ValidationError

from apps.inventory.models import Stock, Warehouse, WarehouseStock
from apps.orders.models import Order
from apps.payments.checkout_flow import fulfill_pending_checkout, preview_checkout_amount
from apps.payments.models import PendingCheckout
from apps.products.models import Category, Product, ProductImage
from apps.stores.models import Store, StoreMembership


PRODUCTS = '/api/products/items/'
CART = '/api/orders/cart/'
CHECKOUT = '/api/orders/list/checkout/'
MOVEMENTS = '/api/inventory/movements/'
TRANSFERS = '/api/inventory/transfers/'


class ClothingVariantTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.admin = User.objects.create_user(username='admin', role='admin')
        self.seller = User.objects.create_user(username='seller', role='seller')
        self.buyer = User.objects.create_user(username='buyer', role='customer')
        self.store = Store.objects.create(name='Clothes Store', status='active')
        self.other_store = Store.objects.create(name='Other Store', status='active')
        StoreMembership.objects.create(store=self.store, user=self.seller, role='sales_staff')
        self.category = Category.objects.get(slug='clothes')
        self.client = APIClient()
        self.client.force_authenticate(self.admin)

    def product_payload(self):
        return {
            'name': 'Cotton Shirt', 'category': self.category.pk, 'store': self.store.pk,
            'retail_price': '12.00', 'cost_price': '4.00', 'clothing_gender': 'unisex',
            'clothing_type': 'shirt', 'clothing_material': 'cotton', 'clothing_fit': 'regular',
            'variants_enabled': True,
            'variant_rows': [
                {'color': 'Black', 'size': 'S', 'initial_stock': 3},
                {'color': 'Black', 'size': 'M', 'sku': 'SHIRT-BLK-M', 'retail_price': '15.00', 'cost_price': '5.00'},
            ],
        }

    def create_product(self):
        response = self.client.post(PRODUCTS, self.product_payload(), format='json')
        self.assertEqual(response.status_code, 201, response.data)
        return Product.objects.get(pk=response.data['id'])

    def checkout_payload(self, product):
        return {
            'name': 'Buyer', 'phone': '010000000', 'address': 'Phnom Penh',
            'province': 'phnom_penh', 'payment_method': 'cod', 'delivery_fee': '2.00',
            'items': [{'product': product.pk, 'quantity': 2, 'unit_price': '1.00'}],
        }

    def test_create_edit_archive_and_preserve_prices_and_stock(self):
        self.assertEqual(self.category.product_type, 'clothing')
        product = self.create_product()
        small = product.variants.get(variant_size='S')
        medium = product.variants.get(variant_size='M')
        self.assertTrue(product.code)
        self.assertNotEqual(small.code, product.code)
        self.assertEqual(small.retail_price, Decimal('12'))
        self.assertEqual(medium.retail_price, Decimal('15'))
        self.assertEqual(medium.cost_price, Decimal('5'))

        response = self.client.patch(f'{PRODUCTS}{product.pk}/', {'retail_price': '13.00'}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        small.refresh_from_db()
        medium.refresh_from_db()
        self.assertEqual(small.retail_price, Decimal('13'))
        self.assertEqual(medium.retail_price, Decimal('15'))

        duplicate_payload = {'variant_rows': [{'size': 'S', 'color': 'Black'}, {'size': 's', 'color': 'black'}]}
        response = self.client.patch(f'{PRODUCTS}{product.pk}/', duplicate_payload, format='json')
        self.assertEqual(response.status_code, 400)
        duplicate_payload['variant_rows'] = [{'size': 'L', 'color': 'Red', 'sku': medium.code}]
        response = self.client.patch(f'{PRODUCTS}{product.pk}/', duplicate_payload, format='json')
        self.assertEqual(response.status_code, 400)

        response = self.client.patch(f'{PRODUCTS}{product.pk}/', {
            'variant_rows': [{'size': 'M', 'color': 'Black', 'retail_price': '15.00', 'cost_price': '5.00'}],
        }, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual([row['id'] for row in response.data['variants']], [medium.pk])
        small.refresh_from_db()
        self.assertTrue(small.variant_archived)
        self.assertEqual(small.current_stock, 3)

        response = self.client.patch(f'{PRODUCTS}{product.pk}/', {'store': self.other_store.pk}, format='json')
        self.assertEqual(response.status_code, 400)

    def test_seller_publication_and_variant_image(self):
        self.client.force_authenticate(self.seller)
        product = self.create_product()
        variant = product.variants.get(variant_size='S')
        self.assertEqual(product.approval_status, 'pending')
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(f'{PRODUCTS}{product.pk}/').status_code, 404)
        self.assertEqual(self.client.get(f'{PRODUCTS}{variant.pk}/').status_code, 404)
        self.client.force_authenticate(self.admin)
        response = self.client.post(f'{PRODUCTS}{product.pk}/approve/')
        self.assertEqual(response.status_code, 200, response.data)

        with self.settings(STORAGES={
            'default': {'BACKEND': 'django.core.files.storage.InMemoryStorage'},
            'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'},
        }):
            image_data = BytesIO()
            Image.new('RGB', (32, 32), 'red').save(image_data, format='PNG')
            image = SimpleUploadedFile('variant.png', image_data.getvalue(), content_type='image/png')
            response = self.client.post(f'{PRODUCTS}{variant.pk}/upload_images/', {'images': [image], 'is_primary': 'true'}, format='multipart')
            self.assertEqual(response.status_code, 201, response.data)
            self.assertTrue(ProductImage.objects.filter(product=variant, is_primary=True).exists())
            self.client.force_authenticate(None)
            response = self.client.get(f'{PRODUCTS}{product.pk}/')
            self.assertEqual(response.status_code, 200)
            row = next(row for row in response.data['variants'] if row['id'] == variant.pk)
            self.assertTrue(row['image_url'])
            self.assertNotIn('cost_price_override', row)
            self.assertTrue(row['is_available_for_sale'])

        response = self.client.get(PRODUCTS, {'category': self.category.pk})
        self.assertEqual([row['id'] for row in response.data['results']], [product.pk])

    def test_warehouse_cart_checkout_and_returns_use_the_selected_variant(self):
        product = self.create_product()
        small = product.variants.get(variant_size='S')
        medium = product.variants.get(variant_size='M')
        source = Warehouse.objects.get(store=self.store, is_default=True)
        second = Warehouse.objects.create(store=self.store, code='ST-SECOND', name='Second Warehouse')
        foreign = Warehouse.objects.create(store=self.other_store, code='ST-FOREIGN', name='Another Store Warehouse')

        response = self.client.post(MOVEMENTS, {'product': medium.pk, 'quantity': 2, 'type': 'stock_in', 'warehouse': foreign.pk}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Stock.objects.get(product=medium).quantity, 0)
        response = self.client.post(MOVEMENTS, {'product': medium.pk, 'quantity': 2, 'type': 'stock_in', 'warehouse': second.pk}, format='json')
        self.assertEqual(response.status_code, 201, response.data)

        transfer = {'from_warehouse': source.pk, 'to_warehouse': second.pk, 'items_input': [{'product': small.pk, 'requested_qty': 2}]}
        response = self.client.post(TRANSFERS, transfer, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        response = self.client.post(f"{TRANSFERS}{response.data['id']}/complete/")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(WarehouseStock.objects.get(product=small, warehouse=source).quantity, 1)
        self.assertEqual(WarehouseStock.objects.get(product=small, warehouse=second).quantity, 2)

        self.client.force_authenticate(self.buyer)
        for item, qty, status in [(product, 1, 400), (medium, 3, 400), (medium, 2, 200), (small, 2, 200)]:
            response = self.client.post(f'{CART}set_quantity/', {'product_id': item.pk, 'quantity': qty}, format='json')
            self.assertEqual(response.status_code, status, response.data)
        response = self.client.get(CART)
        self.assertEqual({row['variant_id']: row['variant_sku'] for row in response.data['results']}, {small.pk: small.code, medium.pk: medium.code})
        self.assertEqual(self.client.post(CHECKOUT, self.checkout_payload(product), format='json').status_code, 400)

        payload = self.checkout_payload(small)
        payload['items'][0].update(variant_id=small.pk, variant_sku=small.code)
        response = self.client.post(CHECKOUT, payload, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        order = Order.objects.get()
        item = order.items.get()
        self.assertEqual((item.product_id, item.product_code), (small.pk, small.code))
        self.assertEqual(item.unit_price, Decimal('12'))
        self.assertEqual(item.cost_price, Decimal('4'))

        self.client.force_authenticate(self.admin)
        status_url = f'/api/orders/list/{order.pk}/update_status/'
        response = self.client.post(status_url, {'status': 'printed'}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(Stock.objects.get(product=small).quantity, 1)
        self.assertEqual(Stock.objects.get(product=medium).quantity, 2)
        self.assertEqual(WarehouseStock.objects.get(product=small, warehouse=source).quantity, 0)
        self.assertEqual(WarehouseStock.objects.get(product=small, warehouse=second).quantity, 1)
        for _ in range(2):
            response = self.client.post(status_url, {'status': 'returned'}, format='json')
            self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(Stock.objects.get(product=small).quantity, 3)
        self.assertEqual(WarehouseStock.objects.get(product=small, warehouse=source).quantity, 1)
        self.assertEqual(WarehouseStock.objects.get(product=small, warehouse=second).quantity, 2)
        self.assertFalse(WarehouseStock.objects.filter(product__in=[small, medium], warehouse=foreign).exists())

    def test_paid_checkout_keeps_the_validated_variant_price_and_sku(self):
        product = self.create_product()
        variant = product.variants.get(variant_size='S')
        payload = self.checkout_payload(variant)
        payload['payment_method'] = 'aba'
        payload['items'][0].update(variant_id=variant.pk, variant_sku=variant.code)
        request = SimpleNamespace(user=self.buyer, build_absolute_uri=lambda path: path)
        with self.assertRaises(ValidationError):
            preview_checkout_amount(request, payload)

        payload['items'][0]['unit_price'] = '12.00'
        amount = preview_checkout_amount(request, payload)
        pending = PendingCheckout.objects.create(
            user=self.buyer, payment_method='aba', checkout_data=payload, amount=amount,
            expires_at=timezone.now() + timezone.timedelta(minutes=5),
        )
        Product.objects.filter(pk=variant.pk).update(retail_price='14.00', code='NEW-SKU')
        order = fulfill_pending_checkout(pending, request)
        self.assertEqual(order.grand_total, amount)
        self.assertEqual(order.items.get().product_code, variant.code)
        self.assertEqual(order.items.get().product_id, variant.pk)

    def test_general_product_still_uses_the_existing_fields(self):
        payload = {
            'name': 'Cream', 'retail_price': '9.00', 'ingredients': 'Water', 'benefits': 'Moisturizes',
            'how_to_use': 'Apply daily', 'compare_at_price': '10.00',
        }
        response = self.client.post(PRODUCTS, payload, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        product = Product.objects.get(pk=response.data['id'])
        self.assertEqual((product.ingredients, product.benefits, product.how_to_use), ('Water', 'Moisturizes', 'Apply daily'))
        self.assertFalse(product.variants_enabled)

    def test_variants_use_customer_availability_and_their_own_stock(self):
        product = self.create_product()
        small = product.variants.get(variant_size='S')
        medium = product.variants.get(variant_size='M')
        self.assertTrue(small.is_available_for_sale)
        self.assertFalse(medium.is_available_for_sale)

        for mode, available in [('available', True), ('out_of_stock', False)]:
            response = self.client.patch(f'{PRODUCTS}{product.pk}/', {'availability_status': mode}, format='json')
            self.assertEqual(response.status_code, 200, response.data)
            self.assertTrue(all(row['is_available_for_sale'] is available for row in response.data['variants']))
            self.assertEqual(next(row['current_stock'] for row in response.data['variants'] if row['id'] == medium.pk), 0)
