from rest_framework import serializers
from .models import Brand, Category, Product, ProductImage, ProductSet, ProductSetItem, Promotion, Banner, HomeSectionStyle


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


class ProductListSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    brand_name = serializers.CharField(source='brand.name', read_only=True)
    primary_image = serializers.SerializerMethodField()
    current_stock = serializers.SerializerMethodField()
    display_price = serializers.SerializerMethodField()
    old_price = serializers.SerializerMethodField()
    is_flash_sale_active = serializers.BooleanField(read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'code', 'name', 'slug', 'category', 'category_name',
            'brand', 'brand_name',
            'primary_image', 'wholesale_price', 'retail_price', 'cost_price',
            'display_price', 'old_price', 'flash_sale_price',
            'flash_sale_starts_at', 'flash_sale_ends_at',
            'unit', 'current_stock', 'is_active', 'is_featured',
            'is_flash_sale_active',
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


class ProductDetailSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    brand_name = serializers.CharField(source='brand.name', read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    current_stock = serializers.SerializerMethodField()
    display_price = serializers.SerializerMethodField()
    old_price = serializers.SerializerMethodField()
    is_flash_sale_active = serializers.BooleanField(read_only=True)

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


class ProductWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = [
            'id', 'code', 'barcode', 'name', 'category', 'brand', 'description', 'benefits',
            'ingredients', 'how_to_use', 'unit', 'weight', 'cost_price',
            'wholesale_price', 'retail_price', 'flash_sale_price',
            'flash_sale_starts_at', 'flash_sale_ends_at',
            'min_order_qty', 'is_active',
            'is_featured', 'is_new_arrival', 'is_best_seller',
        ]
        read_only_fields = ['id']


class ProductSetItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_code = serializers.CharField(source='product.code', read_only=True)
    product_image = serializers.SerializerMethodField()

    class Meta:
        model = ProductSetItem
        fields = ['id', 'product', 'product_name', 'product_code', 'product_image', 'quantity']

    def get_product_image(self, obj):
        images = list(obj.product.images.all())
        img = next((image for image in images if image.is_primary), None) or (images[0] if images else None)
        if img and img.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(img.image.url)
            return img.image.url
        return None


class ProductSetSerializer(serializers.ModelSerializer):
    items = ProductSetItemSerializer(many=True, read_only=True)
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = ProductSet
        fields = '__all__'

    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            return request.build_absolute_uri(obj.image.url) if request else obj.image.url
        return None


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
