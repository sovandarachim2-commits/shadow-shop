from unittest.mock import patch

from django.core.cache import cache
from django.http import HttpResponse
from django.test import SimpleTestCase, TestCase, override_settings
from rest_framework.test import APIClient

from apps.notifications.models import TelegramConfig
from apps.notifications.services import TelegramService
from utils.performance import SlowRequestLoggingMiddleware
from utils.storefront_cache import bump_storefront_cache


class TelegramLoginConfigPerformanceTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        TelegramConfig.objects.create(
            bot_token='123456:ABCDEF',
            bot_username='shadow_shop_bot',
            chat_id='1001',
            is_active=True,
        )

    def test_config_endpoint_does_not_call_telegram_get_me(self):
        with patch('apps.notifications.services.requests.get') as mock_get:
            response = self.client.get('/api/auth/telegram/config/')
            self.assertEqual(response.status_code, 200)
            self.assertTrue(response.data['configured'])
            self.assertEqual(response.data['bot_username'], 'shadow_shop_bot')
            mock_get.assert_not_called()

    def test_get_bot_username_skips_remote_when_disabled(self):
        TelegramConfig.objects.all().update(bot_username='')
        service = TelegramService()
        with patch('apps.notifications.services.settings') as mock_settings, \
                patch('apps.notifications.services.requests.get') as mock_get:
            mock_settings.TELEGRAM_BOT_USERNAME = ''
            username = service.get_bot_username(allow_remote=False)
            self.assertEqual(username, '')
            mock_get.assert_not_called()

    def test_config_endpoint_uses_cache(self):
        first = self.client.get('/api/auth/telegram/config/')
        self.assertEqual(first.status_code, 200)
        with patch('apps.notifications.services.TelegramService') as mock_service:
            second = self.client.get('/api/auth/telegram/config/')
            self.assertEqual(second.status_code, 200)
            self.assertEqual(second.data['bot_username'], 'shadow_shop_bot')
            mock_service.assert_not_called()


class StorefrontCacheBumpTests(TestCase):
    def test_bump_clears_auth_cache_keys(self):
        cache.set('auth:telegram_login_config:v1', {'configured': True}, 60)
        cache.set('auth:site_favicon_url:v1', '/app-icon-512.png', 60)
        bump_storefront_cache()
        self.assertIsNone(cache.get('auth:telegram_login_config:v1'))
        self.assertIsNone(cache.get('auth:site_favicon_url:v1'))


class SlowRequestLoggingMiddlewareTests(SimpleTestCase):
    def test_adds_response_time_header(self):
        def get_response(request):
            return HttpResponse('ok')

        middleware = SlowRequestLoggingMiddleware(get_response)
        request = type('Req', (), {'method': 'GET', 'path': '/api/auth/login/'})()
        response = middleware(request)
        self.assertIn('X-Response-Time', response)

    @override_settings(PERF_INSTRUMENT_DB=True)
    def test_adds_db_headers_when_instrumented(self):
        def get_response(request):
            return HttpResponse('ok')

        middleware = SlowRequestLoggingMiddleware(get_response)
        request = type('Req', (), {'method': 'GET', 'path': '/api/auth/login/'})()
        response = middleware(request)
        self.assertIn('X-DB-Queries', response)
        self.assertIn('X-DB-Time', response)
