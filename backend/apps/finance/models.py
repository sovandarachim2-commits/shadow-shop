from django.db import models
from django.conf import settings


class ExpenseCategory(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    parent = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='children',
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'expense_categories'
        verbose_name_plural = 'expense categories'

    def __str__(self):
        return self.name


class Expense(models.Model):
    category = models.ForeignKey(ExpenseCategory, on_delete=models.SET_NULL, null=True, related_name='expenses')
    description = models.TextField()
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    date = models.DateField()
    receipt_image = models.ImageField(upload_to='expense_receipts/', null=True, blank=True)
    reference = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL, null=True,
        related_name='expenses'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'expenses'
        ordering = ['-date']

    def __str__(self):
        return f"{self.category.name} - ${self.amount} ({self.date})"


class ExpenseAudit(models.Model):
    ACTION_CHOICES = [
        ('created', 'Created'),
        ('updated', 'Updated'),
    ]

    expense = models.ForeignKey(Expense, on_delete=models.CASCADE, related_name='audits')
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='expense_audits',
    )
    changes = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'expense_audits'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.action} expense {self.expense_id}"


class Revenue(models.Model):
    PAYMENT_METHOD_CHOICES = [
        ('bakong', 'Bakong KHQR'),
        ('aba', 'ABA Bank'),
        ('acleda', 'ACLEDA Bank'),
        ('wing', 'Wing'),
        ('cod', 'Cash on Delivery'),
        ('cash', 'Cash'),
        ('contact_sales', 'Contact Sales'),
        ('other', 'Other'),
    ]

    order = models.OneToOneField('orders.Order', on_delete=models.SET_NULL, null=True, blank=True, related_name='revenue')
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES)
    reference = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    received_at = models.DateTimeField()
    received_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL, null=True,
        related_name='received_revenues'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'revenues'
        ordering = ['-received_at']

    def __str__(self):
        return f"Revenue ${self.amount} - {self.payment_method}"


class DailySummary(models.Model):
    date = models.DateField(unique=True)
    total_orders = models.PositiveIntegerField(default=0)
    total_revenue = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_cost = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_expenses = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    gross_profit = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    net_profit = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'daily_summaries'
        ordering = ['-date']

    def __str__(self):
        return f"Summary {self.date} - Revenue: ${self.total_revenue}"
