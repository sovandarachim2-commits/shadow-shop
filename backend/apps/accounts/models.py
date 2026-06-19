from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class User(AbstractUser):
    ROLE_CHOICES = [
        ('super_admin', 'Super Admin'),
        ('admin', 'Admin'),
        ('seller', 'Seller'),
        ('cashier', 'Cashier'),
        ('warehouse', 'Warehouse Staff'),
        ('scanner', 'Scanner Staff'),
        ('delivery', 'Delivery Staff'),
        ('customer', 'Customer'),
    ]

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='customer')
    phone = models.CharField(max_length=20, blank=True)
    telegram_id = models.CharField(max_length=50, unique=True, null=True, blank=True)
    telegram_username = models.CharField(max_length=150, blank=True)
    telegram_photo_url = models.URLField(blank=True)
    telegram_auth_date = models.DateTimeField(null=True, blank=True)
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'users'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.role})"

    @property
    def is_admin_user(self):
        return self.role in ['super_admin', 'admin']

    @property
    def is_staff_user(self):
        return self.role not in ['customer']


class Permission(models.Model):
    MODULE_CHOICES = [
        ('dashboard', 'Dashboard'),
        ('orders', 'Orders'),
        ('products', 'Products'),
        ('inventory', 'Inventory'),
        ('delivery', 'Delivery'),
        ('finance', 'Finance'),
        ('reports', 'Reports'),
        ('users', 'Users'),
        ('settings', 'Settings'),
        ('print', 'Print'),
        ('scanner', 'Scanner'),
        ('storefront', 'Customer Storefront'),
        ('rewards', 'Rewards'),
    ]

    ACTION_CHOICES = [
        ('view', 'View'),
        ('create', 'Create'),
        ('edit', 'Edit'),
        ('delete', 'Delete'),
        ('export', 'Export'),
        ('print', 'Print'),
        ('approve', 'Approve'),
        ('adjust_points', 'Adjust Points'),
    ]

    module = models.CharField(max_length=50, choices=MODULE_CHOICES)
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    description = models.CharField(max_length=200, blank=True)

    class Meta:
        db_table = 'permissions'
        unique_together = ['module', 'action']

    def __str__(self):
        return f"{self.module}.{self.action}"


class Role(models.Model):
    name = models.CharField(max_length=30, unique=True)
    display_name = models.CharField(max_length=100)
    is_system = models.BooleanField(default=False)

    class Meta:
        db_table = 'roles'
        ordering = ['name']

    def __str__(self):
        return self.display_name


class RolePermission(models.Model):
    role = models.CharField(max_length=30)
    permission = models.ForeignKey(Permission, on_delete=models.CASCADE, related_name='role_permissions')
    granted = models.BooleanField(default=True)

    class Meta:
        db_table = 'role_permissions'
        unique_together = ['role', 'permission']

    def __str__(self):
        return f"{self.role} - {self.permission}"


class ActivityLog(models.Model):
    ACTION_CHOICES = [
        ('create', 'Created'),
        ('update', 'Updated'),
        ('delete', 'Deleted'),
        ('view', 'Viewed'),
        ('login', 'Logged In'),
        ('logout', 'Logged Out'),
        ('print', 'Printed'),
        ('export', 'Exported'),
    ]

    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='activity_logs')
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    module = models.CharField(max_length=50)
    description = models.TextField()
    object_id = models.CharField(max_length=50, blank=True)
    object_type = models.CharField(max_length=100, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    extra_data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'activity_logs'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user} - {self.action} - {self.module}"


class Address(models.Model):
    LABEL_CHOICES = [
        ('home', 'Home'),
        ('work', 'Work'),
        ('other', 'Other'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='addresses')
    label = models.CharField(max_length=10, choices=LABEL_CHOICES, default='home')
    full_name = models.CharField(max_length=150)
    phone = models.CharField(max_length=20)
    address_line1 = models.CharField(max_length=255)
    address_line2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)
    country = models.CharField(max_length=100, default='Cambodia')
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'addresses'
        ordering = ['-is_default', '-created_at']

    def save(self, *args, **kwargs):
        if self.is_default:
            Address.objects.filter(user=self.user, is_default=True).exclude(pk=self.pk).update(is_default=False)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.full_name} - {self.city} ({self.label})"


class TelegramVerification(models.Model):
    phone = models.CharField(max_length=30)
    token = models.CharField(max_length=80, unique=True)
    telegram_chat_id = models.CharField(max_length=80, blank=True)
    telegram_user_id = models.CharField(max_length=80, blank=True)
    telegram_username = models.CharField(max_length=150, blank=True)
    otp_code = models.CharField(max_length=10, blank=True)
    is_verified = models.BooleanField(default=False)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    verified_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'telegram_verifications'
        ordering = ['-created_at']

    @property
    def is_expired(self):
        return timezone.now() > self.expires_at


class SiteSettings(models.Model):
    store_name = models.CharField(max_length=200, default='Shadow Shop')
    store_phone = models.CharField(max_length=50, blank=True)
    store_address = models.TextField(blank=True)
    logo = models.ImageField(upload_to='site/', null=True, blank=True)
    favicon = models.ImageField(upload_to='site/', null=True, blank=True)
    print_logo = models.ImageField(upload_to='site/print/', null=True, blank=True)
    print_logo_size = models.PositiveIntegerField(default=64)
    print_qr_size = models.PositiveIntegerField(default=68)
    currency = models.CharField(max_length=10, default='USD')
    timezone = models.CharField(max_length=50, default='Asia/Phnom_Penh')
    delivery_fees = models.JSONField(default=dict, blank=True)
    payment_methods = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'site_settings'

    def __str__(self):
        return self.store_name

    @classmethod
    def get_solo(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj
