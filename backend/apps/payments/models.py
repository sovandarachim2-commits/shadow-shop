from django.db import models


class AbaPayment(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]

    order = models.OneToOneField(
        'orders.Order',
        on_delete=models.CASCADE,
        related_name='aba_payment',
    )
    tran_id = models.CharField(max_length=100, unique=True)
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    currency = models.CharField(max_length=3, default='USD')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    apv = models.CharField(max_length=100, blank=True)
    response_data = models.JSONField(default=dict, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'aba_payments'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.order.order_number} - {self.status}"


class BakongPayment(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('expired', 'Expired'),
        ('failed', 'Failed'),
    ]

    order = models.OneToOneField(
        'orders.Order',
        on_delete=models.CASCADE,
        related_name='bakong_payment',
    )
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    currency = models.CharField(max_length=3, default='USD')
    qr_payload = models.TextField()
    qr_image = models.TextField(blank=True)
    md5 = models.CharField(max_length=32, unique=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    response_data = models.JSONField(default=dict, blank=True)
    expires_at = models.DateTimeField()
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'bakong_payments'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.order.order_number} - {self.status}"

