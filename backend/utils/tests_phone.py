from django.test import SimpleTestCase
from rest_framework.exceptions import ValidationError

from utils.phone import normalize_cambodia_phone, validate_cambodia_phone


class CambodiaPhoneTests(SimpleTestCase):
    def test_normalize_strips_and_converts_855(self):
        self.assertEqual(normalize_cambodia_phone('+855 97 884 3978'), '0978843978')
        self.assertEqual(normalize_cambodia_phone('855978843978'), '0978843978')
        self.assertEqual(normalize_cambodia_phone('097-884-3978'), '0978843978')

    def test_validate_accepts_local_format(self):
        self.assertEqual(validate_cambodia_phone('0978843978'), '0978843978')
        self.assertEqual(validate_cambodia_phone('+855978843978'), '0978843978')

    def test_validate_rejects_missing_leading_zero(self):
        with self.assertRaises(ValidationError):
            validate_cambodia_phone('978843978')

    def test_validate_allow_blank(self):
        self.assertEqual(validate_cambodia_phone('', allow_blank=True), '')
        with self.assertRaises(ValidationError):
            validate_cambodia_phone('')
