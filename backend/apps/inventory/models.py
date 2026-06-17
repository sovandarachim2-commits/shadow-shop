from django.db import models
from django.conf import settings


class Stock(models.Model):
    product = models.OneToOneField(
        'products.Product',
        on_delete=models.CASCADE,
        related_name='stock'
    )
    quantity = models.IntegerField(default=0)
    min_quantity = models.IntegerField(default=5)
    max_quantity = models.IntegerField(null=True, blank=True)
    location = models.CharField(max_length=100, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'stock'

    def __str__(self):
        return f"{self.product.name} - Qty: {self.quantity}"

    @property
    def is_low_stock(self):
        return 0 < self.quantity <= self.min_quantity

    @property
    def is_out_of_stock(self):
        return self.quantity <= 0


class StockMovement(models.Model):
    TYPE_STOCK_IN = 'stock_in'
    TYPE_STOCK_OUT = 'stock_out'
    TYPE_TRANSFER = 'transfer'
    TYPE_ADJUSTMENT = 'adjustment'
    TYPE_DAMAGED = 'damaged'
    TYPE_OFFLINE_TEAM = 'offline_team'
    TYPE_RETURN = 'return'

    TYPE_CHOICES = [
        (TYPE_STOCK_IN, 'Stock In'),
        (TYPE_STOCK_OUT, 'Stock Out'),
        (TYPE_TRANSFER, 'Transfer'),
        (TYPE_ADJUSTMENT, 'Adjustment'),
        (TYPE_DAMAGED, 'Damaged'),
        (TYPE_OFFLINE_TEAM, 'Offline Team Stock'),
        (TYPE_RETURN, 'Return'),
    ]

    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    product = models.ForeignKey('products.Product', on_delete=models.CASCADE, related_name='stock_movements')
    quantity = models.IntegerField()
    before_qty = models.IntegerField()
    after_qty = models.IntegerField()
    reference = models.CharField(max_length=100, blank=True)
    reference_type = models.CharField(max_length=50, blank=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL, null=True,
        related_name='stock_movements'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'stock_movements'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.type} - {self.product.name} ({self.quantity:+d})"


class Warehouse(models.Model):
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=20, unique=True)
    address = models.TextField(blank=True)
    manager = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL, null=True, blank=True
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'warehouses'

    def __str__(self):
        return self.name


class StockTransfer(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('in_transit', 'In Transit'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    transfer_number = models.CharField(max_length=20, unique=True)
    from_warehouse = models.ForeignKey(
        Warehouse, on_delete=models.SET_NULL, null=True,
        related_name='outgoing_transfers'
    )
    to_warehouse = models.ForeignKey(
        Warehouse, on_delete=models.SET_NULL, null=True,
        related_name='incoming_transfers'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL, null=True,
        related_name='created_transfers'
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL, null=True, blank=True,
        related_name='approved_transfers'
    )
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'stock_transfers'
        ordering = ['-created_at']

    def __str__(self):
        return f"Transfer #{self.transfer_number}"


class StockTransferItem(models.Model):
    transfer = models.ForeignKey(StockTransfer, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey('products.Product', on_delete=models.CASCADE)
    requested_qty = models.PositiveIntegerField()
    actual_qty = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'stock_transfer_items'
        unique_together = ['transfer', 'product']

    def __str__(self):
        return f"{self.transfer.transfer_number} - {self.product.name}"
