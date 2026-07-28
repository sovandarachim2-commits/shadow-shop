from django.contrib.auth import get_user_model
from django.test import TestCase

from .serializers import CustomTokenObtainPairSerializer


class CustomTokenObtainPairSerializerTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username='customer001',
            email='customer@example.com',
            phone='012345678',
            password='secret-pass-123',
            role='customer',
        )

    def test_login_accepts_username(self):
        serializer = CustomTokenObtainPairSerializer(data={
            'username': 'customer001',
            'password': 'secret-pass-123',
        })

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data['user']['email'], 'customer@example.com')

    def test_login_accepts_email(self):
        serializer = CustomTokenObtainPairSerializer(data={
            'username': 'CUSTOMER@example.com',
            'password': 'secret-pass-123',
        })

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data['user']['username'], 'customer001')

    def test_login_accepts_phone(self):
        serializer = CustomTokenObtainPairSerializer(data={
            'username': '012345678',
            'password': 'secret-pass-123',
        })

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data['user']['username'], 'customer001')

    def test_login_accepts_international_phone(self):
        serializer = CustomTokenObtainPairSerializer(data={
            'username': '+855 12 345 678',
            'password': 'secret-pass-123',
        })

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data['user']['username'], 'customer001')
