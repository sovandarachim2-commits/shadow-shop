from django.db import models
from django.conf import settings
import uuid


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
