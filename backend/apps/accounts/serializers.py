from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from .models import Permission, Role, RolePermission, ActivityLog, Address, SiteSettings
import random
import re
import json

User = get_user_model()


def _clean_username_part(value):
    return re.sub(r'[^a-z0-9]', '', str(value or '').lower())


def generate_staff_username(first_name='', last_name=''):
    first = _clean_username_part(first_name)
    last = _clean_username_part(last_name)
    if first and last:
        base = f'{first[0]}{last}'
    else:
        base = first or last or 'user'

    base = base[:24]
    for _ in range(20):
        username = f'{base}{random.randint(1000, 9999)}'
        if not User.objects.filter(username=username).exists():
            return username

    suffix = User.objects.count() + random.randint(1000, 9999)
    return f'{base}{suffix}'[:150]


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.role
        token['username'] = user.username
        token['full_name'] = user.get_full_name()
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = UserSerializer(self.user).data
        return data


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    avatar_url = serializers.SerializerMethodField()
    has_usable_password = serializers.SerializerMethodField()
    role = serializers.CharField(required=False)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'full_name', 'role', 'phone', 'gender',
            'telegram_id', 'telegram_username', 'telegram_photo_url',
            'google_id', 'google_picture_url',
            'avatar', 'avatar_url',
            'has_usable_password', 'is_active', 'created_at',
        ]
        read_only_fields = ['id', 'telegram_id', 'telegram_username', 'telegram_photo_url', 'google_id', 'google_picture_url', 'created_at']

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username

    def get_avatar_url(self, obj):
        if obj.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.avatar.url)
        return None

    def get_has_usable_password(self, obj):
        return obj.has_usable_password()

    def validate_role(self, value):
        if not Role.objects.filter(name=value).exists():
            raise serializers.ValidationError('Select a valid role.')
        return value


class UserCreateSerializer(serializers.ModelSerializer):
    username = serializers.CharField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)
    role = serializers.CharField(required=False)

    class Meta:
        model = User
        fields = [
            'username', 'email', 'first_name', 'last_name',
            'password', 'confirm_password', 'role', 'phone',
        ]

    def validate(self, attrs):
        if attrs['password'] != attrs.pop('confirm_password'):
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})
        return attrs

    def validate_role(self, value):
        if not Role.objects.filter(name=value).exists():
            raise serializers.ValidationError('Select a valid role.')
        return value

    def create(self, validated_data):
        password = validated_data.pop('password')
        username = str(validated_data.get('username', '')).strip()
        if not username:
            validated_data['username'] = generate_staff_username(
                validated_data.get('first_name', ''),
                validated_data.get('last_name', ''),
            )
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class CustomerRegisterSerializer(serializers.ModelSerializer):
    username = serializers.CharField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            'username', 'email', 'first_name', 'last_name', 'phone',
            'password', 'confirm_password',
        ]

    def validate(self, attrs):
        if attrs['password'] != attrs.pop('confirm_password'):
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})
        email = str(attrs.get('email', '')).strip().lower()
        if not email:
            raise serializers.ValidationError({'email': 'Email is required.'})
        username = str(attrs.get('username') or email).strip()
        attrs['email'] = email
        attrs['username'] = username
        if email and User.objects.filter(email__iexact=email, is_active=True).exists():
            raise serializers.ValidationError({'email': 'An account with this email already exists.'})
        if username and User.objects.filter(username__iexact=username, is_active=True).exists():
            raise serializers.ValidationError({'username': 'An account with this username already exists.'})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data, role='customer')
        user.set_password(password)
        user.save()
        return user


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=8)

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Old password is incorrect.')
        return value


class SetInitialPasswordSerializer(serializers.Serializer):
    password = serializers.CharField(required=True, min_length=8)
    confirm_password = serializers.CharField(required=True)

    def validate(self, attrs):
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})
        return attrs


class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = '__all__'


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ['id', 'name', 'display_name', 'is_system']
        read_only_fields = ['is_system']

    def validate_name(self, value):
        value = str(value or '').strip().lower()
        if not value:
            raise serializers.ValidationError('Role key is required.')
        if len(value) > 20:
            raise serializers.ValidationError('Role key must be 20 characters or fewer.')
        if not value.replace('_', '').isalnum() or not value[0].isalpha():
            raise serializers.ValidationError('Use lowercase letters, numbers, and underscores; start with a letter.')
        return value

    def validate(self, attrs):
        if self.instance and 'name' in attrs and attrs['name'] != self.instance.name:
            raise serializers.ValidationError({'name': 'Role key cannot be changed after creation.'})
        return attrs


class RolePermissionSerializer(serializers.ModelSerializer):
    permission_detail = PermissionSerializer(source='permission', read_only=True)

    class Meta:
        model = RolePermission
        fields = ['id', 'role', 'permission', 'permission_detail', 'granted']


class ActivityLogSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = ActivityLog
        fields = '__all__'

    def get_user_name(self, obj):
        return obj.user.get_full_name() if obj.user else 'System'


class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = [
            'id', 'label', 'full_name', 'phone',
            'address_line1', 'address_line2',
            'city', 'state', 'postal_code', 'country',
            'is_default', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class SiteSettingsSerializer(serializers.ModelSerializer):
    logo_url = serializers.SerializerMethodField()
    favicon_url = serializers.SerializerMethodField()
    login_logo_url = serializers.SerializerMethodField()
    splash_logo_url = serializers.SerializerMethodField()
    print_logo_url = serializers.SerializerMethodField()

    class Meta:
        model = SiteSettings
        fields = ['id', 'store_name', 'store_phone', 'store_email', 'store_address',
                  'logo', 'favicon', 'login_logo', 'splash_logo', 'print_logo',
                  'logo_url', 'favicon_url', 'login_logo_url', 'splash_logo_url', 'print_logo_url',
                  'splash_enabled', 'splash_duration_ms', 'print_logo_size', 'print_qr_size', 'currency', 'timezone',
                  'delivery_fees', 'payment_methods', 'footer_menus']
        extra_kwargs = {'logo': {'write_only': True, 'required': False},
                        'favicon': {'write_only': True, 'required': False},
                        'login_logo': {'write_only': True, 'required': False},
                        'splash_logo': {'write_only': True, 'required': False},
                        'print_logo': {'write_only': True, 'required': False}}

    def get_logo_url(self, obj):
        if obj.logo:
            request = self.context.get('request')
            return request.build_absolute_uri(obj.logo.url) if request else obj.logo.url
        return None

    def get_favicon_url(self, obj):
        if obj.favicon:
            request = self.context.get('request')
            return request.build_absolute_uri(obj.favicon.url) if request else obj.favicon.url
        return None

    def get_login_logo_url(self, obj):
        if obj.login_logo:
            request = self.context.get('request')
            return request.build_absolute_uri(obj.login_logo.url) if request else obj.login_logo.url
        return None

    def get_splash_logo_url(self, obj):
        if obj.splash_logo:
            request = self.context.get('request')
            return request.build_absolute_uri(obj.splash_logo.url) if request else obj.splash_logo.url
        return None

    def get_print_logo_url(self, obj):
        if obj.print_logo:
            request = self.context.get('request')
            return request.build_absolute_uri(obj.print_logo.url) if request else obj.print_logo.url
        return None

    def validate_payment_methods(self, value):
        if isinstance(value, str):
            try:
                parsed = json.loads(value)
            except json.JSONDecodeError:
                raise serializers.ValidationError('Payment methods must be valid JSON.')
            if not isinstance(parsed, dict):
                raise serializers.ValidationError('Payment methods must be an object.')
            return parsed
        return value
