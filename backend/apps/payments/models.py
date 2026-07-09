import datetime

from django.conf import settings
from django.db import models


def generate_pending_checkout_reference():
    today = datetime.date.today()
    prefix = f"PC{today.strftime('%y%m%d')}"
    last_reference = (
        PendingCheckout.objects.filter(reference__startswith=prefix)
        .order_by('-reference')
        .values_list('reference', flat=True)
        .first()
    )
    if not last_reference:
        return f"{prefix}0001"
    try:
        next_number = int(last_reference[len(prefix):]) + 1
    except (TypeError, ValueError):
        next_number = PendingCheckout.objects.filter(reference__startswith=prefix).count() + 1
    return f"{prefix}{next_number:04d}"


class PendingCheckout(models.Model):
    STATUS_PENDING = 'pending'
    STATUS_PAID = 'paid'
    STATUS_EXPIRED = 'expired'
    STATUS_CANCELLED = 'cancelled'

    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_PAID, 'Paid'),
        (STATUS_EXPIRED, 'Expired'),
        (STATUS_CANCELLED, 'Cancelled'),
    ]

    reference = models.CharField(max_length=20, unique=True, default=generate_pending_checkout_reference)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='pending_checkouts',
    )
    payment_method = models.CharField(max_length=20)
    checkout_data = models.JSONField()
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    order = models.OneToOneField(
        'orders.Order',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='pending_checkout',
    )
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'pending_checkouts'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.reference} - {self.status}"


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
        null=True,
        blank=True,
    )
    pending_checkout = models.ForeignKey(
        PendingCheckout,
        on_delete=models.CASCADE,
        related_name='aba_payments',
        null=True,
        blank=True,
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
        label = self.order.order_number if self.order_id else (self.pending_checkout.reference if self.pending_checkout_id else self.tran_id)
        return f"{label} - {self.status}"


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
        null=True,
        blank=True,
    )
    pending_checkout = models.ForeignKey(
        PendingCheckout,
        on_delete=models.CASCADE,
        related_name='bakong_payments',
        null=True,
        blank=True,
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
        label = self.order.order_number if self.order_id else (self.pending_checkout.reference if self.pending_checkout_id else self.md5)
        return f"{label} - {self.status}"
