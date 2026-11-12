import re
from urllib.parse import urlparse
from rest_framework import serializers
from django.db import IntegrityError
from django.db.models import Sum
from django.utils import timezone
from .models import Brand, Category, Product, ProductImage, ProductReview, ProductSet, ProductSetImage, ProductSetItem, Promotion, Banner, HomeSectionStyle, Announcement, OfferPoster
from utils.image_optimization import card_variant_url


class CategorySerializer(serializers.ModelSerializer):
    children_count = serializers.SerializerMethodField()
    products_count = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = '__all__'
        extra_kwargs = {'image': {'write_only': True, 'required': False}}

    def get_children_count(self, obj):
        annotated = getattr(obj, 'annotated_children_count', None)
        if annotated is not None:
            return annotated
        return obj.children.count()

    def get_products_count(self, obj):
        annotated = getattr(obj, 'annotated_products_count', None)
        if annotated is not None:
            return annotated
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
        annotated = getattr(obj, 'annotated_products_count', None)
        if annotated is not None:
            return annotated
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
    flash_sale_remaining_stock = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'code', 'name', 'slug', 'category', 'category_name',
            'brand', 'brand_name',
            'primary_image', 'wholesale_price', 'retail_price', 'cost_price',
            'display_price', 'old_price', 'flash_sale_price',
            'flash_sale_starts_at', 'flash_sale_ends_at', 'flash_sale_max_order_qty', 'flash_sale_stock',
            'unit', 'current_stock', 'availability_status', 'is_available_for_sale', 'is_active', 'is_featured',
            'is_flash_sale_active',
            'flash_sale_order_count', 'flash_sale_quantity_sold', 'flash_sale_remaining_stock',
            'is_new_arrival', 'is_best_seller', 'rating', 'created_at',
        ]

    def get_primary_image(self, obj):
        images = list(obj.images.all())
        img = next((image for image in images if image.is_primary), None) or (images[0] if images else None)
        if img and img.image:
            return card_variant_url(img.image, self.context.get('request'))
        return None

    def get_current_stock(self, obj):
        try:
            return obj.stock.quantity
        except Exception:
            return 0

    def get_display_price(self, obj):
        return obj.active_price

    def get_old_price(self, obj):
        if obj.is_flash_sale_active:
            return obj.retail_price
        if obj.compare_at_price and obj.compare_at_price > obj.active_price:
            return obj.compare_at_price
        return None

    def _flash_sale_items(self, obj):
        if not obj.flash_sale_price or not obj.is_flash_sale_active:
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
        if hasattr(obj, '_flash_sale_order_count'):
            return obj._flash_sale_order_count
        if not obj.is_flash_sale_active:
            return 0
        return self._flash_sale_items(obj).values('order_id').distinct().count()

    def get_flash_sale_quantity_sold(self, obj):
        if hasattr(obj, '_flash_sale_quantity_sold'):
            return obj._flash_sale_quantity_sold
        if not obj.is_flash_sale_active:
            return 0
        return self._flash_sale_items(obj).aggregate(total=Sum('quantity'))['total'] or 0

    def get_flash_sale_remaining_stock(self, obj):
        if obj.flash_sale_stock is None:
            return None
        sold = self.get_flash_sale_quantity_sold(obj)
        return max(0, int(obj.flash_sale_stock) - int(sold or 0))


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
    flash_sale_remaining_stock = serializers.SerializerMethodField()

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
        if obj.is_flash_sale_active:
            return obj.retail_price
        if obj.compare_at_price and obj.compare_at_price > obj.active_price:
            return obj.compare_at_price
        return None

    def _flash_sale_items(self, obj):
        if not obj.flash_sale_price or not obj.is_flash_sale_active:
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
        if hasattr(obj, '_flash_sale_order_count'):
            return obj._flash_sale_order_count
        if not obj.is_flash_sale_active:
            return 0
        return self._flash_sale_items(obj).values('order_id').distinct().count()

    def get_flash_sale_quantity_sold(self, obj):
        if hasattr(obj, '_flash_sale_quantity_sold'):
            return obj._flash_sale_quantity_sold
        if not obj.is_flash_sale_active:
            return 0
        return self._flash_sale_items(obj).aggregate(total=Sum('quantity'))['total'] or 0

    def get_flash_sale_remaining_stock(self, obj):
        if obj.flash_sale_stock is None:
            return None
        sold = self.get_flash_sale_quantity_sold(obj)
        return max(0, int(obj.flash_sale_stock) - int(sold or 0))


class ProductWriteSerializer(serializers.ModelSerializer):
    code = serializers.CharField(max_length=50, required=False, allow_blank=True)
    is_flash_sale_active = serializers.BooleanField(read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'code', 'barcode', 'name', 'category', 'brand', 'description', 'benefits',
            'ingredients', 'how_to_use', 'unit', 'weight', 'cost_price',
            'wholesale_price', 'retail_price', 'compare_at_price', 'flash_sale_price',
            'flash_sale_starts_at', 'flash_sale_ends_at', 'flash_sale_max_order_qty', 'flash_sale_stock',
            'min_order_qty', 'availability_status', 'is_active',
            'is_featured', 'is_flash_sale_active', 'is_new_arrival', 'is_best_seller',
        ]
        read_only_fields = ['id', 'is_flash_sale_active']

    def validate(self, attrs):
        attrs = super().validate(attrs)
        compare_at_price = attrs.get('compare_at_price')
        retail_price = attrs.get('retail_price', getattr(self.instance, 'retail_price', None))
        if compare_at_price is not None and retail_price is not None and compare_at_price <= retail_price:
            raise serializers.ValidationError({'compare_at_price': 'Old price must be higher than the retail price.'})
        return attrs

    def _generate_product_code(self):
        next_number = (Product.objects.order_by('-id').values_list('id', flat=True).first() or 0) + 1
        while True:
            code = f"SKU{next_number:03d}"
            if not Product.objects.filter(code=code).exists():
                return code
            next_number += 1

    def _raise_integrity_error(self, exc):
        msg = str(exc).lower()
        if 'code' in msg:
            raise serializers.ValidationError({'code': 'Product code already exists.'})
        if 'slug' in msg:
            raise serializers.ValidationError({'name': 'A product with a similar name already exists.'})
        raise serializers.ValidationError({'detail': 'Could not save product due to a conflict.'})

    def create(self, validated_data):
        if not validated_data.get('code'):
            validated_data['code'] = self._generate_product_code()
        try:
            return super().create(validated_data)
        except IntegrityError as exc:
            self._raise_integrity_error(exc)

    def update(self, instance, validated_data):
        if 'code' in validated_data and not validated_data.get('code'):
            validated_data.pop('code')
        try:
            return super().update(instance, validated_data)
        except IntegrityError as exc:
            self._raise_integrity_error(exc)


class ProductSetItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    brand_name = serializers.SerializerMethodField()
    product_code = serializers.CharField(source='product.code', read_only=True)
    product_image = serializers.SerializerMethodField()
    product_current_stock = serializers.SerializerMethodField()

    class Meta:
        model = ProductSetItem
        fields = ['id', 'product', 'product_name', 'brand_name', 'product_code', 'product_image', 'product_current_stock', 'quantity']

    def get_brand_name(self, obj):
        return obj.product.brand.name if obj.product.brand else ''

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
    display_price = serializers.DecimalField(source='active_price', max_digits=12, decimal_places=2, read_only=True)
    old_price = serializers.SerializerMethodField()
    is_flash_sale_active = serializers.BooleanField(read_only=True)

    class Meta:
        model = ProductSet
        fields = '__all__'
        extra_kwargs = {'image': {'write_only': True, 'required': False}}

    def get_image_url(self, obj):
        images = list(obj.images.all())
        img = next((image for image in images if image.is_primary), None) or (images[0] if images else None)
        if img and img.image:
            return card_variant_url(img.image, self.context.get('request'))
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

    def get_old_price(self, obj):
        return obj.price if obj.is_flash_sale_active else None


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


_HEX_COLOR_RE = re.compile(r'^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$')
_RGB_COLOR_RE = re.compile(r'^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(\s*,\s*(0|1|0?\.\d+))?\s*\)$')
_GRADIENT_RE = re.compile(r'^(linear|radial)-gradient\([a-zA-Z0-9#%,.\s()-]+\)$')
_HTML_TAG_RE = re.compile(r'</?[a-zA-Z][^>]*>')
_UNSAFE_TEXT_RE = re.compile(r'(<\s*script|</\s*script|<\s*iframe|<\s*object|<\s*embed|<\s*svg|javascript:|vbscript:|data:text/html|\bon[a-z]+\s*=)', re.IGNORECASE)


def sanitize_announcement_text(value, field_label='Text'):
    text = str(value or '').strip()
    if not text:
        return ''
    if _UNSAFE_TEXT_RE.search(text):
        raise serializers.ValidationError(f'{field_label} contains disallowed HTML or script content.')
    cleaned = _HTML_TAG_RE.sub('', text).strip()
    return cleaned


def validate_announcement_url(value):
    url = str(value or '').strip()
    if not url:
        return ''
    if any(ch in url for ch in ('\r', '\n', '\x00')):
        raise serializers.ValidationError('Link URL contains invalid characters.')
    lower = url.lower()
    if lower.startswith(('javascript:', 'data:', 'vbscript:', 'file:', '//')):
        raise serializers.ValidationError('Unsafe link URL scheme is not allowed.')
    if url.startswith('/'):
        return url
    parsed = urlparse(url)
    if parsed.scheme.lower() in ('http', 'https', 'mailto', 'tel'):
        if parsed.scheme.lower() in ('http', 'https') and not parsed.netloc:
            raise serializers.ValidationError('Enter a valid URL.')
        return url
    raise serializers.ValidationError('Link URL must be a relative path (/...) or start with http://, https://, mailto:, or tel:.')


def validate_announcement_color(value, default='#111827'):
    color = str(value or default).strip()
    if _HEX_COLOR_RE.match(color) or _RGB_COLOR_RE.match(color):
        return color
    raise serializers.ValidationError('Enter a valid hex (#RRGGBB) or rgb/rgba color.')


def validate_announcement_gradient(value):
    grad = str(value or '').strip()
    if not grad:
        return ''
    lower = grad.lower()
    if any(bad in lower for bad in ('url(', 'expression(', ';', '{', '}', '<', '>', 'javascript:')):
        raise serializers.ValidationError('Gradient contains disallowed CSS.')
    if not _GRADIENT_RE.match(grad):
        raise serializers.ValidationError('Gradient must be a valid linear-gradient(...) or radial-gradient(...) value.')
    return grad


def _bounded_int(value, minimum, maximum, field_label):
    if value is None or value == '':
        return None
    try:
        num = int(value)
    except (TypeError, ValueError):
        raise serializers.ValidationError(f'{field_label} must be a whole number.')
    if num < minimum or num > maximum:
        raise serializers.ValidationError(f'{field_label} must be between {minimum} and {maximum}.')
    return num


def _clean_string_list(value):
    if value is None or value == '':
        return []
    if not isinstance(value, list):
        raise serializers.ValidationError('Must be a list of strings.')
    cleaned = []
    seen = set()
    for item in value:
        s = str(item or '').strip()
        if s and s not in seen:
            cleaned.append(s[:100])
            seen.add(s)
    return cleaned


class AnnouncementSerializer(serializers.ModelSerializer):
    save_mode = serializers.ChoiceField(choices=['draft', 'publish'], write_only=True, required=False, default='draft')
    created_by_name = serializers.SerializerMethodField()
    updated_by_name = serializers.SerializerMethodField()
    is_currently_live = serializers.SerializerMethodField()
    schedule_state = serializers.SerializerMethodField()

    class Meta:
        model = Announcement
        fields = [
            'id', 'title', 'message_en', 'message_km', 'mobile_message_en', 'mobile_message_km',
            'icon', 'link_url', 'link_text', 'link_text_km', 'open_in_new_tab',
            'background_color', 'text_color', 'use_gradient', 'gradient_css',
            'font_size', 'font_weight', 'alignment', 'height', 'padding_x', 'border_radius',
            'icon_size', 'icon_color', 'show_close_button',
            'animation_type', 'animation_speed', 'animation_direction',
            'transition_duration', 'rotation_delay', 'reduced_motion',
            'show_on_desktop', 'show_on_tablet', 'show_on_mobile',
            'tablet_font_size', 'tablet_height', 'tablet_padding_x', 'tablet_alignment',
            'mobile_font_size', 'mobile_height', 'mobile_padding_x', 'mobile_alignment',
            'start_at', 'end_at', 'is_active', 'priority',
            'target_stores', 'target_delivery_areas', 'language_rule',
            'page_display_mode', 'target_pages',
            'status', 'has_unpublished_changes', 'published_at',
            'created_by', 'created_by_name', 'updated_by', 'updated_by_name',
            'created_at', 'updated_at', 'is_currently_live', 'schedule_state',
            'save_mode',
        ]
        read_only_fields = [
            'id', 'status', 'has_unpublished_changes', 'published_at',
            'created_by', 'updated_by', 'created_at', 'updated_at',
        ]

    def get_created_by_name(self, obj):
        if not obj.created_by:
            return ''
        return obj.created_by.get_full_name() or obj.created_by.username

    def get_updated_by_name(self, obj):
        if not obj.updated_by:
            return ''
        return obj.updated_by.get_full_name() or obj.updated_by.username

    def get_schedule_state(self, obj):
        now = timezone.now()
        snapshot = obj.published_snapshot if (obj.status == Announcement.STATUS_PUBLISHED and obj.published_snapshot) else None
        start_at = obj.start_at
        end_at = obj.end_at
        if snapshot:
            from django.utils.dateparse import parse_datetime
            if snapshot.get('start_at'):
                start_at = parse_datetime(snapshot['start_at']) or start_at
            if snapshot.get('end_at'):
                end_at = parse_datetime(snapshot['end_at']) or end_at
        if end_at and end_at < now:
            return 'expired'
        if start_at and start_at > now:
            return 'scheduled'
        return 'active'

    def get_is_currently_live(self, obj):
        if obj.status != Announcement.STATUS_PUBLISHED or not obj.is_active:
            return False
        return self.get_schedule_state(obj) == 'active'

    def validate_title(self, value):
        return sanitize_announcement_text(value, 'Title')

    def validate_message_en(self, value):
        return sanitize_announcement_text(value, 'English message')

    def validate_message_km(self, value):
        return sanitize_announcement_text(value, 'Khmer message')

    def validate_mobile_message_en(self, value):
        return sanitize_announcement_text(value, 'Mobile English message')

    def validate_mobile_message_km(self, value):
        return sanitize_announcement_text(value, 'Mobile Khmer message')

    def validate_link_text(self, value):
        return sanitize_announcement_text(value, 'Link text')

    def validate_link_text_km(self, value):
        return sanitize_announcement_text(value, 'Khmer link text')

    def validate_icon(self, value):
        return sanitize_announcement_text(value, 'Icon')[:60]

    def validate_link_url(self, value):
        return validate_announcement_url(value)

    def validate_background_color(self, value):
        return validate_announcement_color(value, '#111827')

    def validate_text_color(self, value):
        return validate_announcement_color(value, '#FFFFFF')

    def validate_icon_color(self, value):
        return validate_announcement_color(value, '#FFFFFF')

    def validate_gradient_css(self, value):
        return validate_announcement_gradient(value)

    def validate_tablet_alignment(self, value):
        v = str(value or '').strip()
        if v and v not in ('left', 'center', 'right'):
            raise serializers.ValidationError('Invalid tablet alignment.')
        return v

    def validate_mobile_alignment(self, value):
        v = str(value or '').strip()
        if v and v not in ('left', 'center', 'right'):
            raise serializers.ValidationError('Invalid mobile alignment.')
        return v

    def validate_target_stores(self, value):
        return _clean_string_list(value)

    def validate_target_delivery_areas(self, value):
        return _clean_string_list(value)

    def validate_target_pages(self, value):
        return _clean_string_list(value)

    def validate(self, attrs):
        attrs = super().validate(attrs)
        inst = self.instance

        # Bounded integer validations
        int_rules = [
            ('font_size', 10, 32, 'Font size'),
            ('height', 24, 120, 'Bar height'),
            ('padding_x', 0, 64, 'Horizontal padding'),
            ('border_radius', 0, 32, 'Border radius'),
            ('icon_size', 10, 32, 'Icon size'),
            ('animation_speed', 1, 10, 'Animation speed'),
            ('transition_duration', 100, 5000, 'Transition duration'),
            ('rotation_delay', 1000, 30000, 'Delay between announcements'),
            ('tablet_font_size', 10, 32, 'Tablet font size'),
            ('tablet_height', 24, 120, 'Tablet height'),
            ('tablet_padding_x', 0, 64, 'Tablet padding'),
            ('mobile_font_size', 10, 32, 'Mobile font size'),
            ('mobile_height', 24, 120, 'Mobile height'),
            ('mobile_padding_x', 0, 64, 'Mobile padding'),
        ]
        for field, min_v, max_v, label in int_rules:
            if field in attrs and attrs[field] is not None:
                attrs[field] = _bounded_int(attrs[field], min_v, max_v, label)

        start_at = attrs.get('start_at', getattr(inst, 'start_at', None))
        end_at = attrs.get('end_at', getattr(inst, 'end_at', None))
        if start_at and end_at and start_at >= end_at:
            raise serializers.ValidationError({'end_at': 'End date and time must be after start date and time.'})

        msg_en = attrs.get('message_en', getattr(inst, 'message_en', ''))
        msg_km = attrs.get('message_km', getattr(inst, 'message_km', ''))
        mob_en = attrs.get('mobile_message_en', getattr(inst, 'mobile_message_en', ''))
        mob_km = attrs.get('mobile_message_km', getattr(inst, 'mobile_message_km', ''))
        if not any((str(msg_en or '').strip(), str(msg_km or '').strip(), str(mob_en or '').strip(), str(mob_km or '').strip())):
            raise serializers.ValidationError({'message_en': 'At least one announcement message (English or Khmer) is required.'})

        return attrs

    def create(self, validated_data):
        save_mode = validated_data.pop('save_mode', 'draft')
        request = self.context.get('request')
        user = request.user if request and request.user.is_authenticated else None
        validated_data['created_by'] = user
        validated_data['updated_by'] = user
        instance = super().create(validated_data)
        if save_mode == 'publish':
            instance.publish(user=user)
        return instance

    def update(self, instance, validated_data):
        save_mode = validated_data.pop('save_mode', 'draft')
        request = self.context.get('request')
        user = request.user if request and request.user.is_authenticated else None
        validated_data['updated_by'] = user
        was_published = instance.status == Announcement.STATUS_PUBLISHED
        instance = super().update(instance, validated_data)
        if save_mode == 'publish':
            instance.publish(user=user)
        elif was_published:
            instance.has_unpublished_changes = True
            instance.save(update_fields=['has_unpublished_changes'])
        return instance


VALID_POSTER_MEMBERSHIP_TIERS = {
    'classic', 'silver', 'gold', 'platinum', 'diamond', 'vip', 'elite', 'royal',
}
ALLOWED_POSTER_IMAGE_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.webp'}
MAX_POSTER_IMAGE_BYTES = 5 * 1024 * 1024


def _validate_poster_image(file_obj, label='Image'):
    if not file_obj:
        return file_obj
    import os
    ext = os.path.splitext(str(getattr(file_obj, 'name', '') or ''))[1].lower()
    if ext and ext not in ALLOWED_POSTER_IMAGE_EXTENSIONS:
        raise serializers.ValidationError(f'{label} must be PNG, JPG, JPEG, or WebP.')
    size = getattr(file_obj, 'size', 0) or 0
    if size > MAX_POSTER_IMAGE_BYTES:
        raise serializers.ValidationError(f'{label} must be 5 MB or smaller.')
    return file_obj


class OfferPosterSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    mobile_image_url = serializers.SerializerMethodField()
    store_name = serializers.SerializerMethodField()
    store_slug = serializers.SerializerMethodField()
    resolved_action_url = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    remove_image = serializers.BooleanField(write_only=True, required=False, default=False)
    remove_mobile_image = serializers.BooleanField(write_only=True, required=False, default=False)

    class Meta:
        model = OfferPoster
        fields = [
            'id', 'title', 'description',
            'image', 'image_url', 'mobile_image', 'mobile_image_url',
            'remove_image', 'remove_mobile_image',
            'store', 'store_name', 'store_slug',
            'button_label', 'action_type', 'action_url', 'resolved_action_url',
            'target_audience', 'membership_levels',
            'priority', 'start_at', 'end_at', 'display_frequency',
            'status', 'approval_status', 'rejection_reason',
            'created_by', 'created_by_name', 'approved_by', 'approved_at',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'approval_status', 'rejection_reason',
            'created_by', 'approved_by', 'approved_at',
            'created_at', 'updated_at',
        ]

    def _build_media_url(self, field_file):
        if not field_file:
            return None
        url = field_file.url
        request = self.context.get('request')
        if request and url.startswith('/'):
            return request.build_absolute_uri(url)
        return url

    def get_image_url(self, obj):
        return self._build_media_url(obj.image)

    def get_mobile_image_url(self, obj):
        return self._build_media_url(obj.mobile_image)

    def get_store_name(self, obj):
        return obj.store.name if obj.store else ''

    def get_store_slug(self, obj):
        return obj.store.slug if obj.store else ''

    def get_created_by_name(self, obj):
        if not obj.created_by:
            return ''
        full = f'{obj.created_by.first_name} {obj.created_by.last_name}'.strip()
        return full or obj.created_by.username or obj.created_by.email or ''

    def get_resolved_action_url(self, obj):
        if obj.action_type == OfferPoster.ACTION_STORE:
            return f'/shop?brand={obj.store.slug}' if obj.store else '/shop'
        if obj.action_type == OfferPoster.ACTION_FLASH_SALE:
            return '/flash-sale'
        if obj.action_type == OfferPoster.ACTION_REWARDS:
            return '/profile/rewards'
        return obj.action_url or '/'

    def validate_title(self, value):
        cleaned = sanitize_announcement_text(value, 'Poster title')
        if not cleaned:
            raise serializers.ValidationError('Poster title is required.')
        return cleaned

    def validate_description(self, value):
        return sanitize_announcement_text(value, 'Short description')

    def validate_image(self, value):
        return _validate_poster_image(value, 'Desktop poster image')

    def validate_mobile_image(self, value):
        return _validate_poster_image(value, 'Mobile poster image')

    def validate_membership_levels(self, value):
        if value in (None, ''):
            return []
        if isinstance(value, str):
            import json
            try:
                value = json.loads(value)
            except Exception:
                value = [part.strip() for part in value.split(',') if part.strip()]
        if not isinstance(value, list):
            raise serializers.ValidationError('Membership levels must be a list.')
        cleaned = []
        for item in value:
            tier = str(item or '').strip().lower()
            if tier in VALID_POSTER_MEMBERSHIP_TIERS and tier not in cleaned:
                cleaned.append(tier)
        return cleaned

    def validate(self, attrs):
        attrs = super().validate(attrs)
        inst = self.instance

        start_at = attrs.get('start_at', getattr(inst, 'start_at', None))
        end_at = attrs.get('end_at', getattr(inst, 'end_at', None))
        if start_at and end_at and start_at >= end_at:
            raise serializers.ValidationError({'end_at': 'End date and time must be after start date and time.'})

        action_type = attrs.get('action_type', getattr(inst, 'action_type', OfferPoster.ACTION_STORE))
        action_url = str(attrs.get('action_url', getattr(inst, 'action_url', '')) or '').strip()

        if action_type == OfferPoster.ACTION_EXTERNAL:
            parsed = urlparse(action_url)
            if parsed.scheme not in ('http', 'https') or not parsed.netloc:
                raise serializers.ValidationError({'action_url': 'Enter a valid http:// or https:// URL.'})
            attrs['action_url'] = action_url
        elif action_type == OfferPoster.ACTION_INTERNAL:
            if not action_url:
                raise serializers.ValidationError({'action_url': 'Enter an internal page path (e.g. /shop).'})
            if not action_url.startswith('/'):
                action_url = f'/{action_url}'
            attrs['action_url'] = action_url

        target_audience = attrs.get('target_audience', getattr(inst, 'target_audience', OfferPoster.AUDIENCE_EVERYONE))
        levels = attrs.get('membership_levels', getattr(inst, 'membership_levels', []))
        if target_audience == OfferPoster.AUDIENCE_MEMBERSHIP and not levels:
            raise serializers.ValidationError({'membership_levels': 'Select at least one membership level.'})

        return attrs

    def create(self, validated_data):
        validated_data.pop('remove_image', False)
        validated_data.pop('remove_mobile_image', False)
        request = self.context.get('request')
        user = request.user if request and request.user.is_authenticated else None
        validated_data['created_by'] = user
        validated_data['updated_by'] = user
        if user and (user.is_superuser or getattr(user, 'role', '') == 'super_admin'):
            validated_data['approval_status'] = OfferPoster.APPROVAL_APPROVED
            validated_data['approved_by'] = user
            validated_data['approved_at'] = timezone.now()
        else:
            validated_data['approval_status'] = OfferPoster.APPROVAL_PENDING
        return super().create(validated_data)

    def update(self, instance, validated_data):
        remove_image = validated_data.pop('remove_image', False)
        remove_mobile_image = validated_data.pop('remove_mobile_image', False)
        request = self.context.get('request')
        user = request.user if request and request.user.is_authenticated else None
        validated_data['updated_by'] = user

        if remove_image and 'image' not in validated_data:
            if instance.image:
                instance.image.delete(save=False)
            validated_data['image'] = None
        if remove_mobile_image and 'mobile_image' not in validated_data:
            if instance.mobile_image:
                instance.mobile_image.delete(save=False)
            validated_data['mobile_image'] = None

        if user and not (user.is_superuser or getattr(user, 'role', '') == 'super_admin'):
            validated_data['approval_status'] = OfferPoster.APPROVAL_PENDING
            validated_data['rejection_reason'] = ''

        return super().update(instance, validated_data)
