from django.db import models
from django.conf import settings
from django.utils import timezone
import uuid
import secrets
import string
from datetime import timedelta


def generate_order_number():
    import datetime
    today = datetime.date.today()
    prefix = f"SS{today.strftime('%y%m%d')}"
    from apps.orders.models import Order
    last_order_number = (
        Order.objects.filter(order_number__startswith=prefix)
        .order_by('-order_number')
        .values_list('order_number', flat=True)
        .first()
    )
    if not last_order_number:
        return f"{prefix}0001"

    try:
        next_number = int(last_order_number[len(prefix):]) + 1
    except (TypeError, ValueError):
        next_number = Order.objects.filter(order_number__startswith=prefix).count() + 1
    return f"{prefix}{next_number:04d}"


class Customer(models.Model):
    PROVINCE_CHOICES = [
        ('phnom_penh', 'Phnom Penh'),
        ('siem_reap', 'Siem Reap'),
        ('battambang', 'Battambang'),
        ('kampong_cham', 'Kampong Cham'),
        ('kandal', 'Kandal'),
        ('takeo', 'Takeo'),
        ('prey_veng', 'Prey Veng'),
        ('svay_rieng', 'Svay Rieng'),
        ('kampot', 'Kampot'),
        ('kep', 'Kep'),
        ('other', 'Other'),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='customer_profile'
    )
    name = models.CharField(max_length=200)
    phone = models.CharField(max_length=20)
    email = models.EmailField(blank=True)
    address = models.TextField()
    province = models.CharField(max_length=50, choices=PROVINCE_CHOICES, default='phnom_penh')
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_customers'
    )
    total_orders = models.PositiveIntegerField(default=0)
    total_spent = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'customers'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.phone})"


class Order(models.Model):
    STATUS_NEW = 'new'
    STATUS_PRINTED = 'printed'
    STATUS_PREPARING = 'preparing'
    STATUS_PACKED = 'packed'
    STATUS_SHIPPED = 'shipped'
    STATUS_COMPLETED = 'completed'
    STATUS_CANCELLED = 'cancelled'

    STATUS_CHOICES = [
        (STATUS_NEW, 'New'),
        (STATUS_PRINTED, 'Printed'),
        (STATUS_PREPARING, 'Preparing'),
        (STATUS_PACKED, 'Packed'),
        (STATUS_SHIPPED, 'Shipped'),
        (STATUS_COMPLETED, 'Completed'),
        (STATUS_CANCELLED, 'Cancelled'),
    ]

    PAYMENT_STATUS_CHOICES = [
        ('paid', 'Paid'),
        ('unpaid', 'Unpaid'),
        ('partial', 'Partial'),
        ('refunded', 'Refunded'),
    ]

    PAYMENT_METHOD_CHOICES = [
        ('bakong', 'Bakong KHQR'),
        ('aba', 'ABA Bank'),
        ('acleda', 'ACLEDA Bank'),
        ('wing', 'Wing'),
        ('cod', 'Cash on Delivery'),
        ('cash', 'Cash'),
        ('other', 'Other'),
    ]

    order_number = models.CharField(max_length=20, unique=True)
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name='orders')
    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL, null=True,
        related_name='seller_orders'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_NEW)
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='unpaid')
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, blank=True)
    subtotal = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    delivery_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    grand_total = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    notes = models.TextField(blank=True)
    is_draft = models.BooleanField(default=False)
    qr_code = models.ImageField(upload_to='qr_codes/', null=True, blank=True)
    prepare_invoice_photo = models.ImageField(upload_to='orders/prepare/invoices/', null=True, blank=True)
    prepare_package_photo = models.ImageField(upload_to='orders/prepare/packages/', null=True, blank=True)
    out_invoice_photo = models.ImageField(upload_to='orders/out/invoices/', null=True, blank=True)
    out_package_photo = models.ImageField(upload_to='orders/out/packages/', null=True, blank=True)
    out_delivery_by = models.CharField(max_length=200, blank=True)
    printed_at = models.DateTimeField(null=True, blank=True)
    printed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL, null=True, blank=True,
        related_name='printed_orders'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'orders'
        ordering = ['-created_at']

    def __str__(self):
        return f"#{self.order_number} - {self.customer.name}"

    def save(self, *args, **kwargs):
        if not self.order_number:
            self.order_number = generate_order_number()
        self.grand_total = self.subtotal + self.delivery_fee - self.discount
        super().save(*args, **kwargs)

    @property
    def profit(self):
        total_cost = sum(
            item.cost_price * item.quantity for item in self.items.all()
        )
        return self.grand_total - total_cost - self.delivery_fee


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(
        'products.Product',
        on_delete=models.SET_NULL, null=True,
        related_name='order_items'
    )
    product_set = models.ForeignKey(
        'products.ProductSet',
        on_delete=models.SET_NULL, null=True, blank=True,
        related_name='order_items'
    )
    product_name = models.CharField(max_length=300)
    product_code = models.CharField(max_length=50)
    product_image = models.URLField(blank=True)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    cost_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_price = models.DecimalField(max_digits=15, decimal_places=2)

    class Meta:
        db_table = 'order_items'

    def __str__(self):
        return f"{self.order.order_number} - {self.product_name} x{self.quantity}"

    def save(self, *args, **kwargs):
        self.total_price = (self.unit_price * self.quantity) - self.discount
        super().save(*args, **kwargs)


class OrderStatusHistory(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='status_history')
    status = models.CharField(max_length=20, choices=Order.STATUS_CHOICES)
    note = models.TextField(blank=True)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL, null=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'order_status_history'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.order.order_number} -> {self.status}"


class PrepareRecord(models.Model):
    code = models.CharField(max_length=100)
    phone = models.CharField(max_length=20, blank=True)
    payment_status = models.CharField(max_length=20, choices=Order.PAYMENT_STATUS_CHOICES, default='unpaid')
    amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    set_type = models.CharField(
        max_length=20,
        choices=[('not_set', 'Not Set'), ('set', 'Set')],
        default='not_set',
    )
    set_qr_values = models.JSONField(default=list, blank=True)
    invoice_photo = models.ImageField(upload_to='orders/prepare/manual/invoices/', null=True, blank=True)
    package_photo = models.ImageField(upload_to='orders/prepare/manual/packages/', null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='prepare_records',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'prepare_records'
        ordering = ['-created_at']

    def __str__(self):
        return self.code


class OutRecord(models.Model):
    prepare_record = models.OneToOneField(
        PrepareRecord,
        on_delete=models.PROTECT,
        related_name='out_record',
        null=True,
        blank=True,
    )
    code = models.CharField(max_length=100, unique=True)
    phone = models.CharField(max_length=20, blank=True)
    delivery_by = models.CharField(max_length=200, blank=True)
    invoice_photo = models.ImageField(upload_to='orders/out/manual/invoices/', null=True, blank=True)
    package_photo = models.ImageField(upload_to='orders/out/manual/packages/', null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='out_records',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'out_records'
        ordering = ['-created_at']

    def __str__(self):
        return self.code


class Wishlist(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='wishlists')
    product = models.ForeignKey('products.Product', on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'wishlists'
        unique_together = ['user', 'product']

    def __str__(self):
        return f"{self.user.username} - {self.product.name}"


class CartItem(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='cart_items')
    product = models.ForeignKey('products.Product', on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'cart_items'
        unique_together = ['user', 'product']

    def __str__(self):
        return f"{self.user.username} - {self.product.name} x{self.quantity}"


class RewardItem(models.Model):
    TYPE_VOUCHER = 'voucher'
    TYPE_DISCOUNT = 'discount'
    TYPE_FREE_DELIVERY = 'free_delivery'
    TYPE_GIFT = 'gift'
    TYPE_LUCKY_BOX = 'lucky_box'
    TYPE_MANUAL = 'manual'

    DISCOUNT_AMOUNT = 'amount'
    DISCOUNT_PERCENT = 'percent'

    TYPE_CHOICES = [
        (TYPE_VOUCHER, 'Voucher'),
        (TYPE_DISCOUNT, 'Discount Coupon'),
        (TYPE_FREE_DELIVERY, 'Free Delivery'),
        (TYPE_GIFT, 'Gift Product'),
        (TYPE_LUCKY_BOX, 'Lucky Box'),
        (TYPE_MANUAL, 'Manual Reward'),
    ]

    TIER_CHOICES = [
        ('all', 'All Members'),
        ('silver', 'Silver'),
        ('gold', 'Gold'),
        ('platinum', 'Platinum'),
    ]

    DISCOUNT_TYPE_CHOICES = [
        (DISCOUNT_AMOUNT, 'Amount'),
        (DISCOUNT_PERCENT, 'Percent'),
    ]

    name = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    reward_image = models.ImageField(upload_to='rewards/', null=True, blank=True)
    points_required = models.PositiveIntegerField()
    type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    coupon_discount_type = models.CharField(max_length=20, choices=DISCOUNT_TYPE_CHOICES, default=DISCOUNT_AMOUNT)
    coupon_value = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    minimum_order_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    gift_product = models.ForeignKey(
        'products.Product',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reward_items',
    )
    stock = models.PositiveIntegerField(null=True, blank=True)
    per_customer_limit = models.PositiveIntegerField(null=True, blank=True)
    member_tier_requirement = models.CharField(max_length=20, choices=TIER_CHOICES, default='all')
    is_active = models.BooleanField(default=True)
    starts_at = models.DateTimeField(null=True, blank=True)
    ends_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'reward_items'
        ordering = ['points_required', 'name']

    def __str__(self):
        return f'{self.name} ({self.points_required} pts)'


class RewardRedemption(models.Model):
    STATUS_ACTIVE = 'active'
    STATUS_PENDING = 'pending'
    STATUS_APPROVED = 'approved'
    STATUS_PACKED = 'packed'
    STATUS_SHIPPED = 'shipped'
    STATUS_PREPARED = 'prepared'
    STATUS_COMPLETED = 'completed'
    STATUS_USED = 'used'
    STATUS_REJECTED = 'rejected'
    STATUS_CANCELLED = 'cancelled'

    STATUS_CHOICES = [
        (STATUS_ACTIVE, 'Active'),
        (STATUS_PENDING, 'Pending'),
        (STATUS_APPROVED, 'Approved'),
        (STATUS_PACKED, 'Packed'),
        (STATUS_SHIPPED, 'Shipped'),
        (STATUS_PREPARED, 'Prepared'),
        (STATUS_COMPLETED, 'Completed'),
        (STATUS_USED, 'Used'),
        (STATUS_REJECTED, 'Rejected'),
        (STATUS_CANCELLED, 'Cancelled'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reward_redemptions')
    reward_item = models.ForeignKey(RewardItem, on_delete=models.PROTECT, related_name='redemptions')
    points_spent = models.PositiveIntegerField()
    coupon_code = models.CharField(max_length=30, unique=True, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'reward_redemptions'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user} - {self.reward_item.name}'

    @staticmethod
    def generate_coupon_code():
        alphabet = string.ascii_uppercase + string.digits
        while True:
            code = 'SS-' + ''.join(secrets.choice(alphabet) for _ in range(8))
            if not RewardRedemption.objects.filter(coupon_code=code).exists():
                return code


class RewardSettings(models.Model):
    points_per_dollar = models.PositiveIntegerField(default=1)
    signup_bonus = models.PositiveIntegerField(default=0)
    referral_bonus = models.PositiveIntegerField(default=0)
    birthday_bonus = models.PositiveIntegerField(default=0)
    review_bonus = models.PositiveIntegerField(default=0)
    daily_checkin_bonus = models.PositiveIntegerField(default=0)
    points_expiry_days = models.PositiveIntegerField(default=365)
    expiry_reminder_days = models.PositiveIntegerField(default=7)
    expiration_enabled = models.BooleanField(default=True)
    minimum_redeem_points = models.PositiveIntegerField(default=0)
    maximum_points_per_order = models.PositiveIntegerField(default=0)
    silver_min_points = models.PositiveIntegerField(default=0)
    gold_min_points = models.PositiveIntegerField(default=2000)
    platinum_min_points = models.PositiveIntegerField(default=5000)
    auto_approve_points = models.BooleanField(default=True)
    auto_apply_on_completed = models.BooleanField(default=False)
    low_stock_alert_enabled = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'reward_settings'
        verbose_name_plural = 'reward settings'

    @classmethod
    def get_solo(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class PointTransaction(models.Model):
    TYPE_EARN = 'earn'
    TYPE_REDEEM = 'redeem'
    TYPE_ADJUST = 'adjust'

    TYPE_CHOICES = [
        (TYPE_EARN, 'Earn'),
        (TYPE_REDEEM, 'Redeem'),
        (TYPE_ADJUST, 'Adjust'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='point_transactions')
    order = models.ForeignKey(Order, on_delete=models.SET_NULL, null=True, blank=True, related_name='point_transactions')
    reward_redemption = models.ForeignKey(
        RewardRedemption,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='point_transactions',
    )
    points = models.IntegerField()
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    note = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'point_transactions'
        ordering = ['-created_at']
        unique_together = ['user', 'order', 'type']

    def __str__(self):
        return f'{self.user} {self.type} {self.points} pts'

    def save(self, *args, **kwargs):
        if self.points > 0 and not self.expires_at:
            reward_settings = RewardSettings.get_solo()
            if reward_settings.expiration_enabled and reward_settings.points_expiry_days:
                self.expires_at = self.created_at + timedelta(days=reward_settings.points_expiry_days)
        super().save(*args, **kwargs)
