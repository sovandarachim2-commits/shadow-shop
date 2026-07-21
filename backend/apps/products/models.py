from django.db import models
from django.conf import settings
from django.db.models import Avg
from django.utils import timezone
from django.utils.text import slugify


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
        if not self.slug:
            self.slug = slugify(self.name)
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
        if not self.slug:
            self.slug = slugify(self.name)
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
        if not self.slug:
            self.slug = slugify(self.name)
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
        ordering = ['order']

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
        if not self.slug:
            self.slug = slugify(self.name)
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
        ordering = ['order']

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
