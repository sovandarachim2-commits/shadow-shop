from django.test import SimpleTestCase

from utils.payment_methods import is_payment_method_allowed


class PaymentMethodZoneTests(SimpleTestCase):
    def test_missing_config_allows_all(self):
        self.assertTrue(is_payment_method_allowed('cod', 'phnom_penh', {}))

    def test_disabled_method_blocked(self):
        self.assertFalse(is_payment_method_allowed('cod', 'phnom_penh', {'cod': False}))

    def test_empty_zones_means_all_zones(self):
        config = {'cod': True, 'allowed_zones': {'cod': []}}
        self.assertTrue(is_payment_method_allowed('cod', 'kandal', config))

    def test_restricted_zones(self):
        config = {'cod': True, 'allowed_zones': {'cod': ['phnom_penh']}}
        self.assertTrue(is_payment_method_allowed('cod', 'phnom_penh', config))
        self.assertFalse(is_payment_method_allowed('cod', 'kandal', config))
