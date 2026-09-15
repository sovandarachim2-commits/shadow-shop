from django.test import SimpleTestCase

from .models import Address
from .serializers import AddressSerializer


class AddressValidationTests(SimpleTestCase):
    def payload(self, **overrides):
        return {
            'full_name': 'Customer', 'phone': '0978843975',
            'address_line1': '123123', 'country': 'Cambodia',
            'state': 'Phnom Penh', 'city': '', **overrides,
        }

    def test_province_only_address_is_valid(self):
        serializer = AddressSerializer(data=self.payload())
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_missing_location_is_invalid(self):
        serializer = AddressSerializer(data=self.payload(state=''))
        self.assertFalse(serializer.is_valid())
        self.assertIn('city', serializer.errors)

    def test_other_countries_still_require_city(self):
        serializer = AddressSerializer(data=self.payload(country='Thailand'))
        self.assertFalse(serializer.is_valid())
        self.assertIn('city', serializer.errors)

    def test_existing_city_address_is_valid(self):
        serializer = AddressSerializer(data=self.payload(city='Daun Penh'))
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_partial_update_preserves_existing_province(self):
        address = Address(**self.payload())
        serializer = AddressSerializer(address, data={'address_line1': 'Street 12'}, partial=True)
        self.assertTrue(serializer.is_valid(), serializer.errors)
