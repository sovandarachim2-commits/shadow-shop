from types import SimpleNamespace
from unittest.mock import Mock, patch

from django.test import TestCase

from apps.accounts.models import SiteSettings
from apps.accounts.views import SiteSettingsView


class SiteSettingsPaymentLogoTests(TestCase):
    @patch('utils.storefront_cache.bump_storefront_cache')
    def test_removing_payment_logo_preserves_other_settings(self, _bump_storefront_cache):
        site_settings = SiteSettings.objects.create(payment_methods={
            'aba': False,
            'logo_urls': {
                'aba': 'https://example.com/aba.png',
                'wing': 'https://example.com/wing.png',
            },
        })
        view = SiteSettingsView()
        view.request = SimpleNamespace(
            data={'remove_payment_logo_aba': 'true'},
            FILES={},
            build_absolute_uri=lambda url: url,
        )

        view.perform_update(Mock(save=Mock(return_value=site_settings)))

        site_settings.refresh_from_db()
        self.assertEqual(site_settings.payment_methods, {
            'aba': False,
            'logo_urls': {'wing': 'https://example.com/wing.png'},
        })
