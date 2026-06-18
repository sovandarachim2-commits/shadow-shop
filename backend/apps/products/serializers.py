from rest_framework import serializers
from django.db.models import Sum
from .models import Brand, Category, Product, ProductImage, ProductReview, ProductSet, ProductSetImage, ProductSetItem, Promotion, Banner, HomeSectionStyle


class CategorySerializer(serializers.ModelSerializer):
    children_count = serializers.SerializerMethodField()
    products_count = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = '__all__'
        extra_kwargs = {'image': {'write_only': True, 'required': False}}

    def get_children_count(self, obj):
        return obj.children.count()

    def get_products_count(self, obj):
        return obj.products.filter(is_active=True).count()

    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            return request.build_absolute_uri(obj.image.url) if request else obj.image.url
        return None


class HomeSectionStyleSerializer(serializers.ModelSerializer):
    label = serializers.CharField(source='get_key_display', read_only=True)

    class Meta:
        model = HomeSectionStyle
        fields = ['id', 'key', 'label', 'title', 'background_color', 'text_color', 'is_active', 'updated_at']
        read_only_fields = ['key', 'label', 'updated_at']


class BrandSerializer(serializers.ModelSerializer):
    products_count = serializers.SerializerMethodField()
    logo_url = serializers.SerializerMethodField()

    class Meta:
        model = Brand
        fields = '__all__'

    def get_products_count(self, obj):
        return obj.products.filter(is_active=True).count()

    def get_logo_url(self, obj):
        if obj.logo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.logo.url)
            return obj.logo.url
        return None


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ['id', 'image', 'alt_text', 'is_primary', 'order']


class ProductSetImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductSetImage
        fields = ['id', 'image', 'alt_text', 'is_primary', 'order']


class ProductReviewSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = ProductReview
        fields = ['id', 'product', 'user', 'user_name', 'rating', 'comment', 'created_at', 'updated_at']
        read_only_fields = ['user', 'user_name', 'created_at', 'updated_at']
        validators = []

    def get_user_name(self, obj):
        return obj.user.get_full_name() or obj.user.username

    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError('Rating must be between 1 and 5.')
        return value


class ProductListSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    brand_name = serializers.CharField(source='brand.name', read_only=True)
    primary_image = serializers.SerializerMethodField()
    current_stock = serializers.SerializerMethodField()
    is_available_for_sale = serializers.BooleanField(read_only=True)
    display_price = serializers.SerializerMethodField()
    old_price = serializers.SerializerMethodField()
    is_flash_sale_active = serializers.BooleanField(read_only=True)
    flash_sale_order_count = serializers.SerializerMethodField()
    flash_sale_quantity_sold = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'code', 'name', 'slug', 'category', 'category_name',
            'brand', 'brand_name',
            'primary_image', 'wholesale_price', 'retail_price', 'cost_price',
            'display_price', 'old_price', 'flash_sale_price',
            'flash_sale_starts_at', 'flash_sale_ends_at', 'flash_sale_max_order_qty',
            'unit', 'current_stock', 'availability_status', 'is_available_for_sale', 'is_active', 'is_featured',
            'is_flash_sale_active',
            'flash_sale_order_count', 'flash_sale_quantity_sold',
            'is_new_arrival', 'is_best_seller', 'rating', 'created_at',
        ]

    def get_primary_image(self, obj):
        images = list(obj.images.all())
        img = next((image for image in images if image.is_primary), None) or (images[0] if images else None)
        if img and img.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(img.image.url)
            return img.image.url
        return None

    def get_current_stock(self, obj):
        try:
            return obj.stock.quantity
        except Exception:
            return 0

    def get_display_price(self, obj):
        return obj.active_price

    def get_old_price(self, obj):
        return obj.retail_price if obj.is_flash_sale_active else None

    def _flash_sale_items(self, obj):
        if not obj.flash_sale_price:
            return obj.order_items.none()
        qs = obj.order_items.filter(
            unit_price=obj.flash_sale_price,
            order__is_draft=False,
        ).exclude(order__status='cancelled')
        if obj.flash_sale_starts_at:
            qs = qs.filter(order__created_at__gte=obj.flash_sale_starts_at)
        if obj.flash_sale_ends_at:
            qs = qs.filter(order__created_at__lte=obj.flash_sale_ends_at)
        return qs

    def get_flash_sale_order_count(self, obj):
        return self._flash_sale_items(obj).values('order_id').distinct().count()

    def get_flash_sale_quantity_sold(self, obj):
        return self._flash_sale_items(obj).aggregate(total=Sum('quantity'))['total'] or 0


class ProductDetailSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    brand_name = serializers.CharField(source='brand.name', read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    current_stock = serializers.SerializerMethodField()
    is_available_for_sale = serializers.BooleanField(read_only=True)
    display_price = serializers.SerializerMethodField()
    old_price = serializers.SerializerMethodField()
    is_flash_sale_active = serializers.BooleanField(read_only=True)
    flash_sale_order_count = serializers.SerializerMethodField()
    flash_sale_quantity_sold = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = '__all__'

    def get_current_stock(self, obj):
        try:
            return obj.stock.quantity
        except Exception:
            return 0

    def get_display_price(self, obj):
        return obj.active_price

    def get_old_price(self, obj):
        return obj.retail_price if obj.is_flash_sale_active else None

    def _flash_sale_items(self, obj):
        if not obj.flash_sale_price:
            return obj.order_items.none()
        qs = obj.order_items.filter(
            unit_price=obj.flash_sale_price,
            order__is_draft=False,
        ).exclude(order__status='cancelled')
        if obj.flash_sale_starts_at:
            qs = qs.filter(order__created_at__gte=obj.flash_sale_starts_at)
        if obj.flash_sale_ends_at:
            qs = qs.filter(order__created_at__lte=obj.flash_sale_ends_at)
        return qs

    def get_flash_sale_order_count(self, obj):
        return self._flash_sale_items(obj).values('order_id').distinct().count()

    def get_flash_sale_quantity_sold(self, obj):
        return self._flash_sale_items(obj).aggregate(total=Sum('quantity'))['total'] or 0


class ProductWriteSerializer(serializers.ModelSerializer):
    code = serializers.CharField(max_length=50, required=False, allow_blank=True)

    class Meta:
        model = Product
        fields = [
            'id', 'code', 'barcode', 'name', 'category', 'brand', 'description', 'benefits',
            'ingredients', 'how_to_use', 'unit', 'weight', 'cost_price',
            'wholesale_price', 'retail_price', 'flash_sale_price',
            'flash_sale_starts_at', 'flash_sale_ends_at', 'flash_sale_max_order_qty',
            'min_order_qty', 'availability_status', 'is_active',
            'is_featured', 'is_new_arrival', 'is_best_seller',
        ]
        read_only_fields = ['id']

    def _generate_product_code(self):
        next_number = (Product.objects.order_by('-id').values_list('id', flat=True).first() or 0) + 1
        while True:
            code = f"SKU{next_number:03d}"
            if not Product.objects.filter(code=code).exists():
                return code
            next_number += 1

    def create(self, validated_data):
        if not validated_data.get('code'):
            validated_data['code'] = self._generate_product_code()
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if 'code' in validated_data and not validated_data.get('code'):
            validated_data.pop('code')
        return super().update(instance, validated_data)


class ProductSetItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_code = serializers.CharField(source='product.code', read_only=True)
    product_image = serializers.SerializerMethodField()
    product_current_stock = serializers.SerializerMethodField()

    class Meta:
        model = ProductSetItem
        fields = ['id', 'product', 'product_name', 'product_code', 'product_image', 'product_current_stock', 'quantity']

    def get_product_image(self, obj):
        images = list(obj.product.images.all())
        img = next((image for image in images if image.is_primary), None) or (images[0] if images else None)
        if img and img.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(img.image.url)
            return img.image.url
        return None

    def get_product_current_stock(self, obj):
        try:
            return obj.product.stock.quantity
        except Exception:
            return 0


class ProductSetSerializer(serializers.ModelSerializer):
    items = ProductSetItemSerializer(many=True, read_only=True)
    images = ProductSetImageSerializer(many=True, read_only=True)
    image_url = serializers.SerializerMethodField()
    current_stock = serializers.SerializerMethodField()

    class Meta:
        model = ProductSet
        fields = '__all__'
        extra_kwargs = {'image': {'write_only': True, 'required': False}}

    def get_image_url(self, obj):
        images = list(obj.images.all())
        img = next((image for image in images if image.is_primary), None) or (images[0] if images else None)
        if img and img.image:
            request = self.context.get('request')
            return request.build_absolute_uri(img.image.url) if request else img.image.url
        if obj.image:
            request = self.context.get('request')
            return request.build_absolute_uri(obj.image.url) if request else obj.image.url
        return None

    def get_current_stock(self, obj):
        items = list(obj.items.all())
        if not items:
            return 0

        available_sets = []
        for item in items:
            if not item.product.is_available_for_sale:
                return 0
            if item.product.availability_status == Product.AVAILABILITY_AVAILABLE:
                continue
            required_qty = max(1, int(item.quantity or 1))
            try:
                product_stock = int(item.product.stock.quantity or 0)
            except Exception:
                product_stock = 0
            available_sets.append(product_stock // required_qty)

        return min(available_sets) if available_sets else 999999


class PromotionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Promotion
        fields = '__all__'


class BannerSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Banner
        fields = '__all__'

    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
        return None
