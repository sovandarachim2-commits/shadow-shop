from django.db import models
from django.conf import settings
from django.core.validators import RegexValidator
from django.utils import timezone
from django.utils.text import slugify

class PartnerInquiry(models.Model):
    STATUS_CHOICES = [
        ('new', 'New'),
        ('contacted', 'Contacted / Negotiating'),
        ('approved', 'Approved / Contracted'),
        ('rejected', 'Rejected'),
    ]
    business_name = models.CharField(max_length=200)
    contact_person = models.CharField(max_length=150)
    phone = models.CharField(max_length=50)
    telegram = models.CharField(max_length=100, blank=True)
    category = models.CharField(max_length=100)
    province = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Partner Inquiry'
        verbose_name_plural = 'Partner Inquiries'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.business_name} ({self.contact_person})"


class Store(models.Model):
    STORE_TYPE_CHOICES = [
        ('partner', 'Contracted Partner'),
        ('branch', 'Company Branch'),
        ('retail', 'Retail Outlet'),
        ('warehouse', 'Warehouse Hub'),
        ('online', 'Online-Only Shop'),
    ]
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('pending_contract', 'Pending Contract'),
        ('setup_in_progress', 'Setup In Progress'),
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('expiring_soon', 'Contract Expiring Soon'),
        ('expired', 'Contract Expired'),
        ('suspended', 'Suspended'),
        ('closed', 'Closed'),
    ]

    name = models.CharField(max_length=200)
    code = models.CharField(max_length=50, unique=True, blank=True)
    slug = models.SlugField(max_length=200, unique=True, blank=True)
    store_type = models.CharField(max_length=30, choices=STORE_TYPE_CHOICES, default='partner')
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='draft')
    
    logo = models.ImageField(upload_to='stores/logos/', null=True, blank=True)
    banner = models.ImageField(upload_to='stores/banners/', null=True, blank=True)
    
    phone = models.CharField(max_length=50, blank=True)
    telegram_username = models.CharField(
        max_length=33,
        blank=True,
        validators=[RegexValidator(
            r'\A@?[A-Za-z][A-Za-z0-9_]{1,31}\Z',
            'Enter a Telegram username such as @yourstore.',
        )],
    )
    email = models.EmailField(blank=True)
    province = models.CharField(max_length=100, blank=True)
    district = models.CharField(max_length=100, blank=True)
    address = models.TextField(blank=True)
    
    description = models.TextField(blank=True)
    bio = models.CharField(max_length=255, blank=True)
    is_verified = models.BooleanField(default=False)
    category = models.CharField(max_length=100, blank=True)
    is_published = models.BooleanField(default=False)
    is_public_approved = models.BooleanField(default=False)
    show_on_homepage = models.BooleanField(default=False)
    is_featured = models.BooleanField(default=False)
    homepage_display_order = models.PositiveIntegerField(default=0)

    # Store Name Change Request (Store Owner proposes, Website Admin reviews)
    pending_name = models.CharField(max_length=200, blank=True, default='')
    name_change_status = models.CharField(
        max_length=20,
        choices=[
            ('none', 'None'),
            ('pending', 'Pending Approval'),
            ('approved', 'Approved'),
            ('rejected', 'Rejected'),
        ],
        default='none'
    )
    name_change_requested_at = models.DateTimeField(null=True, blank=True)
    name_change_note = models.TextField(blank=True, default='')

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_stores'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Store'
        verbose_name_plural = 'Stores'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.code})"

    def save(self, *args, **kwargs):
        import uuid
        if not self.code:
            self.code = f"STR-{uuid.uuid4().hex[:6].upper()}"
        if not self.slug:
            clean = slugify(self.name)
            self.slug = clean if clean else f"store-{uuid.uuid4().hex[:6]}"
        if self.status == 'active':
            self.is_published = True
            self.is_public_approved = True
        elif self.status in ('suspended', 'closed', 'rejected'):
            self.is_published = False
            self.is_public_approved = False
            self.show_on_homepage = False
        super().save(*args, **kwargs)

    @property
    def current_contract(self):
        return self.contracts.filter(is_active=True).order_by('-created_at').first()

    @property
    def is_contract_valid(self):
        contract = self.current_contract
        if not contract:
            return False
        if not contract.end_date:
            return True
        return contract.end_date >= timezone.now().date()


class StoreContract(models.Model):
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='contracts')
    contract_number = models.CharField(max_length=100, unique=True, blank=True)
    contract_file = models.FileField(upload_to='stores/contracts/', null=True, blank=True)
    
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    commission_rate = models.DecimalField(max_digits=5, decimal_places=2, default=5.00, help_text="Platform commission percentage (e.g. 5.00%)")
    monthly_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Monthly listing/platform fee if applicable")
    
    bank_name = models.CharField(max_length=100, default='ABA Bank')
    bank_account_name = models.CharField(max_length=150, blank=True)
    bank_account_number = models.CharField(max_length=100, blank=True)
    
    is_active = models.BooleanField(default=True)
    signed_by = models.CharField(max_length=150, blank=True)
    notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Store Contract'
        verbose_name_plural = 'Store Contracts'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.contract_number} - {self.store.name}"

    def save(self, *args, **kwargs):
        if not self.contract_number:
            import uuid
            year = timezone.now().year
            self.contract_number = f"CTR-{year}-{uuid.uuid4().hex[:6].upper()}"
        super().save(*args, **kwargs)

    @property
    def days_remaining(self):
        if not self.end_date:
            return None
        delta = self.end_date - timezone.now().date()
        return delta.days


class StoreMembership(models.Model):
    ROLE_CHOICES = [
        ('owner', 'Store Owner'),
        ('manager', 'Store Manager'),
        ('cashier', 'Cashier'),
        ('stock_staff', 'Stock Staff'),
        ('sales_staff', 'Sales Staff'),
    ]

    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='memberships')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='store_memberships')
    role = models.CharField(max_length=30, choices=ROLE_CHOICES, default='manager')
    is_active = models.BooleanField(default=True)
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Store Membership'
        verbose_name_plural = 'Store Memberships'
        unique_together = ('store', 'user')

    def __str__(self):
        return f"{self.user.username} ({self.role}) at {self.store.name}"


class StorePayout(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending Approval'),
        ('processing', 'Processing Payment'),
        ('completed', 'Completed / Paid'),
        ('rejected', 'Rejected'),
    ]

    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='payouts')
    period_start = models.DateField()
    period_end = models.DateField()
    
    total_sales = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    commission_rate = models.DecimalField(max_digits=5, decimal_places=2, default=5.00)
    commission_deducted = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    net_payout_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='pending')
    proof_of_transfer = models.FileField(upload_to='stores/payouts/', null=True, blank=True)
    settled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='settled_payouts'
    )
    settled_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Store Payout'
        verbose_name_plural = 'Store Payouts'
        ordering = ['-created_at']

    def __str__(self):
        return f"Payout #{self.id} - {self.store.name} (${self.net_payout_amount})"


def get_user_store_ids(user):
    if not user or not user.is_authenticated:
        return []
    return list(user.store_memberships.filter(is_active=True).values_list('store_id', flat=True))


