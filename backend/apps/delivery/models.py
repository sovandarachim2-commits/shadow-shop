from django.db import models
from django.conf import settings


class DeliveryCompany(models.Model):
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=20, unique=True)
    logo = models.ImageField(upload_to='delivery_companies/', null=True, blank=True)
    contact = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    website = models.URLField(blank=True)
    tracking_url_template = models.URLField(blank=True, help_text="Use {tracking_number} placeholder")
    base_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'delivery_companies'
        verbose_name_plural = 'delivery companies'

    def __str__(self):
        return self.name


class DeliveryZone(models.Model):
    name = models.CharField(max_length=200)
    province = models.CharField(max_length=100)
    fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    company = models.ForeignKey(DeliveryCompany, on_delete=models.CASCADE, related_name='zones')
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'delivery_zones'

    def __str__(self):
        return f"{self.company.name} - {self.name}"


class Delivery(models.Model):
    STATUS_READY = 'ready'
    STATUS_SHIPPED = 'shipped'
    STATUS_DELIVERED = 'delivered'
    STATUS_RETURNED = 'returned'
    STATUS_FAILED = 'failed'

    STATUS_CHOICES = [
        (STATUS_READY, 'Ready to Ship'),
        (STATUS_SHIPPED, 'Shipped'),
        (STATUS_DELIVERED, 'Delivered'),
        (STATUS_RETURNED, 'Returned'),
        (STATUS_FAILED, 'Failed'),
    ]

    order = models.OneToOneField('orders.Order', on_delete=models.CASCADE, related_name='delivery')
    company = models.ForeignKey(
        DeliveryCompany,
        on_delete=models.SET_NULL, null=True, blank=True,
        related_name='deliveries'
    )
    tracking_number = models.CharField(max_length=100, blank=True)
    fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_READY)
    notes = models.TextField(blank=True)
    recipient_name = models.CharField(max_length=200)
    recipient_phone = models.CharField(max_length=20)
    delivery_address = models.TextField()
    province = models.CharField(max_length=100)
    latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL, null=True, blank=True,
        related_name='assigned_deliveries'
    )
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL, null=True, blank=True,
        related_name='delivery_assignments'
    )
    shipped_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'deliveries'
        verbose_name_plural = 'deliveries'
        ordering = ['-created_at']

    def __str__(self):
        return f"Delivery for Order #{self.order.order_number}"

    @property
    def tracking_url(self):
        if self.company and self.company.tracking_url_template and self.tracking_number:
            return self.company.tracking_url_template.replace('{tracking_number}', self.tracking_number)
        return None


class DeliveryByConfig(models.Model):
    name = models.CharField(max_length=200)
    description = models.CharField(max_length=500, blank=True)
    telegram_enabled = models.BooleanField(default=False)
    telegram_group = models.CharField(max_length=100, blank=True, help_text='Telegram chat ID')
    telegram_topic = models.IntegerField(null=True, blank=True, help_text='Telegram topic/thread ID')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'delivery_by_config'
        ordering = ['name']

    def __str__(self):
        return self.name


class DeliveryStatusHistory(models.Model):
    delivery = models.ForeignKey(Delivery, on_delete=models.CASCADE, related_name='status_history')
    status = models.CharField(max_length=20, choices=Delivery.STATUS_CHOICES)
    note = models.TextField(blank=True)
    location = models.CharField(max_length=200, blank=True)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL, null=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'delivery_status_history'
        ordering = ['created_at']

    def __str__(self):
        return f"{self.delivery.order.order_number} -> {self.status}"
