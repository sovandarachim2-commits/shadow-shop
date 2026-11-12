from django.db import models
from django.conf import settings
from django.db.models import Avg
from django.utils import timezone
from django.utils.text import slugify


def assign_unique_slug(instance, source, *, fallback='item', slug_field='slug'):
    """Set a unique ASCII slug when missing. Handles duplicate names and non-Latin text."""
    current = getattr(instance, slug_field, '') or ''
    if current:
        return

    field = instance._meta.get_field(slug_field)
    max_length = getattr(field, 'max_length', None) or 50
    base = slugify(source) or fallback
    base = base[:max_length]
    model = instance.__class__
    slug = base
    n = 2
    while model.objects.filter(**{slug_field: slug}).exclude(pk=instance.pk).exists():
        suffix = f'-{n}'
        slug = f'{base[: max_length - len(suffix)]}{suffix}'
        n += 1
    setattr(instance, slug_field, slug)


class Category(models.Model):
    name = models.CharField(max_length=200)
    slug = models.SlugField(unique=True, blank=True)
    image = models.ImageField(upload_to='categories/', null=True, blank=True)
    parent = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='children')
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'categories'
        verbose_name_plural = 'categories'
        ordering = ['order', 'name']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        assign_unique_slug(self, self.name, fallback='category')
        super().save(*args, **kwargs)


class HomeSectionStyle(models.Model):
    SECTION_CHOICES = [
        ('main_category', 'Main Category'),
        ('brand', 'Shop by Brand'),
        ('best_seller', 'Best Seller'),
        ('new_arrival', 'New Arrivals'),
    ]

    key = models.CharField(max_length=40, choices=SECTION_CHOICES, unique=True)
    title = models.CharField(max_length=120)
    background_color = models.CharField(max_length=20, default='#FCE7F3')
    text_color = models.CharField(max_length=20, default='#111827')
    is_active = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'home_section_styles'
        ordering = ['key']

    def __str__(self):
        return self.title


class Brand(models.Model):
    name = models.CharField(max_length=200, unique=True)
    slug = models.SlugField(unique=True, blank=True)
    description = models.TextField(blank=True)
    logo = models.ImageField(upload_to='brands/', null=True, blank=True)
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'brands'
        ordering = ['order', 'name']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        assign_unique_slug(self, self.name, fallback='brand')
        super().save(*args, **kwargs)


class Product(models.Model):
    AVAILABILITY_AUTO = 'auto'
    AVAILABILITY_AVAILABLE = 'available'
    AVAILABILITY_OUT_OF_STOCK = 'out_of_stock'
    AVAILABILITY_CHOICES = [
        (AVAILABILITY_AUTO, 'Auto by Stock'),
        (AVAILABILITY_AVAILABLE, 'Available'),
        (AVAILABILITY_OUT_OF_STOCK, 'Out of Stock'),
    ]

    UNIT_CHOICES = [
        ('piece', 'Piece'),
        ('box', 'Box'),
        ('set', 'Set'),
        ('bottle', 'Bottle'),
        ('tube', 'Tube'),
        ('jar', 'Jar'),
        ('sachet', 'Sachet'),
        ('pack', 'Pack'),
    ]

    code = models.CharField(max_length=50, unique=True)
    barcode = models.CharField(max_length=100, blank=True)
    name = models.CharField(max_length=300)
    slug = models.SlugField(unique=True, blank=True)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, related_name='products')
    brand = models.ForeignKey(Brand, on_delete=models.SET_NULL, null=True, blank=True, related_name='products')
    description = models.TextField(blank=True)
    benefits = models.TextField(blank=True)
    ingredients = models.TextField(blank=True)
    how_to_use = models.TextField(blank=True)
    unit = models.CharField(max_length=20, choices=UNIT_CHOICES, default='piece')
    weight = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    cost_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    wholesale_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    retail_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    compare_at_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    flash_sale_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    flash_sale_starts_at = models.DateTimeField(null=True, blank=True)
    flash_sale_ends_at = models.DateTimeField(null=True, blank=True)
    flash_sale_max_order_qty = models.PositiveIntegerField(null=True, blank=True)
    min_order_qty = models.PositiveIntegerField(default=1)
    availability_status = models.CharField(max_length=20, choices=AVAILABILITY_CHOICES, default=AVAILABILITY_AUTO)
    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    is_new_arrival = models.BooleanField(default=False)
    is_best_seller = models.BooleanField(default=False)
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    review_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'products'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['is_active', 'is_best_seller']),
            models.Index(fields=['is_active', 'is_new_arrival']),
            models.Index(fields=['is_active', 'is_featured']),
            models.Index(fields=['is_active', 'category']),
            models.Index(fields=['is_active', 'brand']),
        ]

    def __str__(self):
        return f"[{self.code}] {self.name}"

    def save(self, *args, **kwargs):
        assign_unique_slug(self, self.name, fallback='product')
        super().save(*args, **kwargs)

    @property
    def primary_image(self):
        img = self.images.filter(is_primary=True).first()
        return img.image.url if img else None

    @property
    def current_stock(self):
        stock = getattr(self, '_stock', None)
        if stock is None:
            from apps.inventory.models import Stock
            try:
                stock = self.stock.quantity
            except Exception:
                stock = 0
        return stock

    @property
    def is_available_for_sale(self):
        if self.availability_status == self.AVAILABILITY_AVAILABLE:
            return True
        if self.availability_status == self.AVAILABILITY_OUT_OF_STOCK:
            return False
        return self.current_stock > 0

    @property
    def is_flash_sale_active(self):
        if not self.is_featured or not self.flash_sale_price:
            return False
        now = timezone.now()
        if self.flash_sale_starts_at and self.flash_sale_starts_at > now:
            return False
        if self.flash_sale_ends_at and self.flash_sale_ends_at < now:
            return False
        return self.flash_sale_price < self.retail_price

    @property
    def active_price(self):
        return self.flash_sale_price if self.is_flash_sale_active else self.retail_price


class ProductImage(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='products/')
    alt_text = models.CharField(max_length=200, blank=True)
    is_primary = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'product_images'
        ordering = ['-is_primary', 'order', 'id']

    def __str__(self):
        return f"{self.product.name} - Image {self.order}"


class ProductReview(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='reviews')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='product_reviews')
    rating = models.PositiveSmallIntegerField(default=5)
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'product_reviews'
        ordering = ['-created_at']
        unique_together = ['product', 'user']

    def __str__(self):
        return f"{self.product.name} - {self.rating}/5"

    def save(self, *args, **kwargs):
        self.rating = max(1, min(5, int(self.rating or 5)))
        super().save(*args, **kwargs)
        self.update_product_rating()

    def delete(self, *args, **kwargs):
        product = self.product
        result = super().delete(*args, **kwargs)
        self.update_product_rating(product)
        return result

    def update_product_rating(self, product=None):
        product = product or self.product
        stats = product.reviews.aggregate(avg=Avg('rating'), count=models.Count('id'))
        product.rating = round(stats['avg'] or 0, 2)
        product.review_count = stats['count'] or 0
        product.save(update_fields=['rating', 'review_count'])


class ProductSet(models.Model):
    name = models.CharField(max_length=300)
    slug = models.SlugField(unique=True, blank=True)
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to='product_sets/', null=True, blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    flash_sale_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    flash_sale_starts_at = models.DateTimeField(null=True, blank=True)
    flash_sale_ends_at = models.DateTimeField(null=True, blank=True)
    flash_sale_max_order_qty = models.PositiveIntegerField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'product_sets'

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        assign_unique_slug(self, self.name, fallback='product-set')
        super().save(*args, **kwargs)

    @property
    def is_flash_sale_active(self):
        if not self.is_featured or not self.flash_sale_price:
            return False
        now = timezone.now()
        if self.flash_sale_starts_at and self.flash_sale_starts_at > now:
            return False
        if self.flash_sale_ends_at and self.flash_sale_ends_at < now:
            return False
        return self.flash_sale_price < self.price

    @property
    def active_price(self):
        if self.is_flash_sale_active:
            return self.flash_sale_price
        return self.discount_price or self.price


class ProductSetImage(models.Model):
    product_set = models.ForeignKey(ProductSet, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='product_sets/')
    alt_text = models.CharField(max_length=200, blank=True)
    is_primary = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'product_set_images'
        ordering = ['-is_primary', 'order', 'id']

    def __str__(self):
        return f"{self.product_set.name} - Image {self.order}"


class ProductSetItem(models.Model):
    product_set = models.ForeignKey(ProductSet, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)

    class Meta:
        db_table = 'product_set_items'
        unique_together = ['product_set', 'product']

    def __str__(self):
        return f"{self.product_set.name} - {self.product.name} x{self.quantity}"


class Promotion(models.Model):
    TYPE_CHOICES = [
        ('banner', 'Banner'),
        ('discount', 'Discount'),
        ('buy_x_get_y', 'Buy X Get Y'),
        ('bundle', 'Bundle'),
    ]

    name = models.CharField(max_length=200)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='banner')
    image = models.ImageField(upload_to='promotions/', null=True, blank=True)
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    products = models.ManyToManyField(Product, blank=True, related_name='promotions')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'promotions'

    def __str__(self):
        return self.name


class Banner(models.Model):
    title = models.CharField(max_length=200)
    subtitle = models.CharField(max_length=200, blank=True)
    description = models.TextField(blank=True)
    discount_text = models.CharField(max_length=100, blank=True)
    button_text = models.CharField(max_length=100, default='Shop Now')
    button_link = models.CharField(max_length=200, default='/shop')
    image = models.ImageField(upload_to='banners/', null=True, blank=True)
    bg_color = models.CharField(max_length=50, blank=True, default='from-pink-50 via-rose-50 to-pink-100')
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'banners'
        ordering = ['order', '-created_at']

    def __str__(self):
        return self.title


class Announcement(models.Model):
    STATUS_DRAFT = 'draft'
    STATUS_PUBLISHED = 'published'
    STATUS_CHOICES = [
        (STATUS_DRAFT, 'Draft'),
        (STATUS_PUBLISHED, 'Published'),
    ]

    FONT_WEIGHT_CHOICES = [
        ('normal', 'Normal'),
        ('medium', 'Medium'),
        ('bold', 'Bold'),
    ]

    ALIGNMENT_CHOICES = [
        ('left', 'Left'),
        ('center', 'Center'),
        ('right', 'Right'),
    ]

    ANIMATION_CHOICES = [
        ('static', 'Static'),
        ('slide', 'Sliding text'),
        ('marquee', 'Marquee / continuous scrolling'),
        ('rotate', 'Rotating announcements'),
        ('fade', 'Fade transition'),
    ]

    DIRECTION_CHOICES = [
        ('left', 'Left'),
        ('right', 'Right'),
    ]

    LANGUAGE_RULE_CHOICES = [
        ('all', 'All Languages'),
        ('en', 'English Only'),
        ('km', 'Khmer Only'),
    ]

    PAGE_MODE_CHOICES = [
        ('all', 'All Pages'),
        ('selected', 'Selected Pages'),
    ]

    # Content
    title = models.CharField(max_length=200, blank=True)
    message_en = models.TextField(blank=True)
    message_km = models.TextField(blank=True)
    mobile_message_en = models.TextField(blank=True)
    mobile_message_km = models.TextField(blank=True)
    icon = models.CharField(max_length=60, blank=True)
    link_url = models.CharField(max_length=500, blank=True)
    link_text = models.CharField(max_length=120, blank=True)
    link_text_km = models.CharField(max_length=120, blank=True)
    open_in_new_tab = models.BooleanField(default=False)

    # Appearance
    background_color = models.CharField(max_length=30, default='#111827')
    text_color = models.CharField(max_length=30, default='#FFFFFF')
    use_gradient = models.BooleanField(default=False)
    gradient_css = models.CharField(max_length=300, blank=True)
    font_size = models.PositiveSmallIntegerField(default=14)
    font_weight = models.CharField(max_length=20, choices=FONT_WEIGHT_CHOICES, default='medium')
    alignment = models.CharField(max_length=10, choices=ALIGNMENT_CHOICES, default='center')
    height = models.PositiveSmallIntegerField(default=40)
    padding_x = models.PositiveSmallIntegerField(default=16)
    border_radius = models.PositiveSmallIntegerField(default=0)
    icon_size = models.PositiveSmallIntegerField(default=16)
    icon_color = models.CharField(max_length=30, default='#FFFFFF')
    show_close_button = models.BooleanField(default=True)

    # Animation
    animation_type = models.CharField(max_length=20, choices=ANIMATION_CHOICES, default='static')
    animation_speed = models.PositiveSmallIntegerField(default=5)
    animation_direction = models.CharField(max_length=10, choices=DIRECTION_CHOICES, default='left')
    transition_duration = models.PositiveIntegerField(default=400)
    rotation_delay = models.PositiveIntegerField(default=4000)
    reduced_motion = models.BooleanField(default=False)

    # Responsive settings
    show_on_desktop = models.BooleanField(default=True)
    show_on_tablet = models.BooleanField(default=True)
    show_on_mobile = models.BooleanField(default=True)
    tablet_font_size = models.PositiveSmallIntegerField(null=True, blank=True)
    tablet_height = models.PositiveSmallIntegerField(null=True, blank=True)
    tablet_padding_x = models.PositiveSmallIntegerField(null=True, blank=True)
    tablet_alignment = models.CharField(max_length=10, blank=True)
    mobile_font_size = models.PositiveSmallIntegerField(null=True, blank=True)
    mobile_height = models.PositiveSmallIntegerField(null=True, blank=True)
    mobile_padding_x = models.PositiveSmallIntegerField(null=True, blank=True)
    mobile_alignment = models.CharField(max_length=10, blank=True)

    # Scheduling & Display rules
    start_at = models.DateTimeField(null=True, blank=True)
    end_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    priority = models.PositiveIntegerField(default=0)
    target_stores = models.JSONField(default=list, blank=True)
    target_delivery_areas = models.JSONField(default=list, blank=True)
    language_rule = models.CharField(max_length=10, choices=LANGUAGE_RULE_CHOICES, default='all')
    page_display_mode = models.CharField(max_length=20, choices=PAGE_MODE_CHOICES, default='all')
    target_pages = models.JSONField(default=list, blank=True)

    # Publishing & Audit
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_DRAFT)
    published_snapshot = models.JSONField(null=True, blank=True)
    has_unpublished_changes = models.BooleanField(default=False)
    published_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_announcements',
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='updated_announcements',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'announcements'
        ordering = ['priority', 'id']
        indexes = [
            models.Index(fields=['status', 'is_active', 'priority']),
            models.Index(fields=['start_at', 'end_at']),
        ]

    def __str__(self):
        return self.title or self.message_en[:50] or self.message_km[:50] or f'Announcement #{self.pk}'

    def build_snapshot(self):
        return {
            'id': self.pk,
            'title': self.title,
            'message_en': self.message_en,
            'message_km': self.message_km,
            'mobile_message_en': self.mobile_message_en,
            'mobile_message_km': self.mobile_message_km,
            'icon': self.icon,
            'link_url': self.link_url,
            'link_text': self.link_text,
            'link_text_km': self.link_text_km,
            'open_in_new_tab': self.open_in_new_tab,
            'background_color': self.background_color,
            'text_color': self.text_color,
            'use_gradient': self.use_gradient,
            'gradient_css': self.gradient_css,
            'font_size': self.font_size,
            'font_weight': self.font_weight,
            'alignment': self.alignment,
            'height': self.height,
            'padding_x': self.padding_x,
            'border_radius': self.border_radius,
            'icon_size': self.icon_size,
            'icon_color': self.icon_color,
            'show_close_button': self.show_close_button,
            'animation_type': self.animation_type,
            'animation_speed': self.animation_speed,
            'animation_direction': self.animation_direction,
            'transition_duration': self.transition_duration,
            'rotation_delay': self.rotation_delay,
            'reduced_motion': self.reduced_motion,
            'show_on_desktop': self.show_on_desktop,
            'show_on_tablet': self.show_on_tablet,
            'show_on_mobile': self.show_on_mobile,
            'tablet_font_size': self.tablet_font_size,
            'tablet_height': self.tablet_height,
            'tablet_padding_x': self.tablet_padding_x,
            'tablet_alignment': self.tablet_alignment,
            'mobile_font_size': self.mobile_font_size,
            'mobile_height': self.mobile_height,
            'mobile_padding_x': self.mobile_padding_x,
            'mobile_alignment': self.mobile_alignment,
            'start_at': self.start_at.isoformat() if self.start_at else None,
            'end_at': self.end_at.isoformat() if self.end_at else None,
            'is_active': self.is_active,
            'priority': self.priority,
            'target_stores': list(self.target_stores or []),
            'target_delivery_areas': list(self.target_delivery_areas or []),
            'language_rule': self.language_rule,
            'page_display_mode': self.page_display_mode,
            'target_pages': list(self.target_pages or []),
        }

    def publish(self, user=None):
        now = timezone.now()
        self.status = self.STATUS_PUBLISHED
        self.published_at = now
        self.has_unpublished_changes = False
        if user is not None:
            self.updated_by = user
        self.published_snapshot = self.build_snapshot()
        self.save()

    def unpublish(self, user=None):
        self.status = self.STATUS_DRAFT
        self.has_unpublished_changes = False
        if user is not None:
            self.updated_by = user
        self.save(update_fields=['status', 'has_unpublished_changes', 'updated_by', 'updated_at'])


class OfferPoster(models.Model):
    STATUS_DRAFT = 'draft'
    STATUS_PUBLISHED = 'published'
    STATUS_PAUSED = 'paused'
    STATUS_CHOICES = [
        (STATUS_DRAFT, 'Draft'),
        (STATUS_PUBLISHED, 'Published'),
        (STATUS_PAUSED, 'Paused'),
    ]

    APPROVAL_PENDING = 'pending'
    APPROVAL_APPROVED = 'approved'
    APPROVAL_REJECTED = 'rejected'
    APPROVAL_CHOICES = [
        (APPROVAL_PENDING, 'Pending'),
        (APPROVAL_APPROVED, 'Approved'),
        (APPROVAL_REJECTED, 'Rejected'),
    ]

    BUTTON_LABEL_CHOICES = [
        ('Shop Now', 'Shop Now'),
        ('View Flash Sale', 'View Flash Sale'),
        ('Redeem Points', 'Redeem Points'),
        ('View Details', 'View Details'),
    ]

    ACTION_STORE = 'store'
    ACTION_FLASH_SALE = 'flash_sale'
    ACTION_REWARDS = 'rewards'
    ACTION_INTERNAL = 'internal'
    ACTION_EXTERNAL = 'external'
    ACTION_TYPE_CHOICES = [
        (ACTION_STORE, 'Selected Store Page'),
        (ACTION_FLASH_SALE, 'Flash Sale Page'),
        (ACTION_REWARDS, 'Membership Rewards Page'),
        (ACTION_INTERNAL, 'Internal Page'),
        (ACTION_EXTERNAL, 'External URL'),
    ]

    AUDIENCE_EVERYONE = 'everyone'
    AUDIENCE_GUESTS = 'guests'
    AUDIENCE_LOGGED_IN = 'logged_in'
    AUDIENCE_MEMBERSHIP = 'membership'
    AUDIENCE_CHOICES = [
        (AUDIENCE_EVERYONE, 'Everyone'),
        (AUDIENCE_GUESTS, 'Guest Customers'),
        (AUDIENCE_LOGGED_IN, 'Logged-in Customers'),
        (AUDIENCE_MEMBERSHIP, 'Selected Membership Levels'),
    ]

    FREQ_SESSION = 'once_per_session'
    FREQ_DAY = 'once_per_day'
    FREQ_CAMPAIGN = 'once_per_campaign'
    FREQUENCY_CHOICES = [
        (FREQ_SESSION, 'Once per session'),
        (FREQ_DAY, 'Once per day'),
        (FREQ_CAMPAIGN, 'Once per campaign'),
    ]

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to='offer_posters/', null=True, blank=True)
    mobile_image = models.ImageField(upload_to='offer_posters/mobile/', null=True, blank=True)
    store = models.ForeignKey(
        Brand,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='offer_posters',
    )
    button_label = models.CharField(max_length=40, choices=BUTTON_LABEL_CHOICES, default='Shop Now')
    action_type = models.CharField(max_length=30, choices=ACTION_TYPE_CHOICES, default=ACTION_STORE)
    action_url = models.CharField(max_length=500, blank=True)
    target_audience = models.CharField(max_length=30, choices=AUDIENCE_CHOICES, default=AUDIENCE_EVERYONE)
    membership_levels = models.JSONField(default=list, blank=True)
    priority = models.PositiveIntegerField(default=0)
    start_at = models.DateTimeField(null=True, blank=True)
    end_at = models.DateTimeField(null=True, blank=True)
    display_frequency = models.CharField(max_length=30, choices=FREQUENCY_CHOICES, default=FREQ_SESSION)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_DRAFT)
    approval_status = models.CharField(max_length=20, choices=APPROVAL_CHOICES, default=APPROVAL_PENDING)
    rejection_reason = models.CharField(max_length=300, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_offer_posters',
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='updated_offer_posters',
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_offer_posters',
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'offer_posters'
        ordering = ['priority', '-created_at']

    def __str__(self):
        return self.title
