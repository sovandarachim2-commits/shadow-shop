from decimal import Decimal
from rest_framework import viewsets, status, generics
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters import rest_framework as filters
from django.db.models import Count, F, Q
from django.utils import timezone
from .models import Brand, Category, Product, ProductImage, ProductReview, ProductSet, ProductSetImage, ProductSetItem, Promotion, Banner, HomeSectionStyle, Announcement, OfferPoster, VideoHighlight
from .serializers import (
    BrandSerializer, CategorySerializer, ProductListSerializer, ProductDetailSerializer,
    ProductWriteSerializer, ProductImageSerializer, ProductSetImageSerializer, ProductSetSerializer,
    ProductReviewSerializer, PromotionSerializer, BannerSerializer, HomeSectionStyleSerializer,
    AnnouncementSerializer, OfferPosterSerializer, VideoHighlightSerializer,
)
from .flash_sale_stats import attach_flash_sale_stats
from utils.image_optimization import ensure_card_variant, optimize_uploaded_image
from utils.permissions import IsAdminOrSuperAdmin, IsStaff, HasModulePermission
from utils.storefront_cache import (
    ANNOUNCEMENTS_PUBLIC_CACHE_KEY,
    ANNOUNCEMENTS_PUBLIC_TTL,
    HOME_FEED_CACHE_KEY,
    HOME_FEED_TTL,
    bump_storefront_cache,
    get_storefront_revision,
    product_list_cache_key,
    safe_cache_get,
    safe_cache_set,
    PRODUCT_LIST_TTL,
)


def apply_image_display_order(images, ordered_ids):
    by_id = {image.id: image for image in images}
    ordered = []
    seen = set()
    for raw_id in ordered_ids:
        try:
            image_id = int(raw_id)
        except (TypeError, ValueError):
            continue
        image = by_id.get(image_id)
        if image and image.id not in seen:
            ordered.append(image)
            seen.add(image.id)
    ordered.extend(image for image in images if image.id not in seen)
    for index, image in enumerate(ordered):
        image.order = index
        image.is_primary = index == 0
        image.save(update_fields=['order', 'is_primary'])
    return ordered


class StorefrontRevisionView(APIView):
    """Tiny public counter. Shop pages watch it and reload the moment admin saves."""
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({'revision': get_storefront_revision()})

class ProductFilter(filters.FilterSet):
    min_price = filters.NumberFilter(field_name='wholesale_price', lookup_expr='gte')
    max_price = filters.NumberFilter(field_name='wholesale_price', lookup_expr='lte')
    in_stock = filters.BooleanFilter(method='filter_in_stock')
    active_flash_sale = filters.BooleanFilter(method='filter_active_flash_sale')

    class Meta:
        model = Product
        fields = ['category', 'brand', 'is_active', 'is_featured', 'is_new_arrival', 'is_best_seller', 'unit']

    def filter_in_stock(self, queryset, name, value):
        if value:
            return queryset.filter(
                Q(availability_status=Product.AVAILABILITY_AVAILABLE) |
                Q(availability_status=Product.AVAILABILITY_AUTO, stock__quantity__gt=0)
            )
        return queryset.filter(
            Q(availability_status=Product.AVAILABILITY_OUT_OF_STOCK) |
            Q(availability_status=Product.AVAILABILITY_AUTO, stock__quantity__lte=0)
        )

    def filter_active_flash_sale(self, queryset, name, value):
        if not value:
            return queryset
        now = timezone.now()
        return queryset.filter(
            is_featured=True,
            flash_sale_price__isnull=False,
            flash_sale_price__lt=F('retail_price'),
        ).filter(
            Q(flash_sale_starts_at__isnull=True) | Q(flash_sale_starts_at__lte=now),
            Q(flash_sale_ends_at__isnull=True) | Q(flash_sale_ends_at__gte=now),
        )


class ProductSetFilter(filters.FilterSet):
    active_flash_sale = filters.BooleanFilter(method='filter_active_flash_sale')

    class Meta:
        model = ProductSet
        fields = ['is_active', 'is_featured']

    def filter_active_flash_sale(self, queryset, name, value):
        if not value:
            return queryset
        now = timezone.now()
        return queryset.filter(
            is_featured=True,
            flash_sale_price__isnull=False,
            flash_sale_price__lt=F('price'),
        ).filter(
            Q(flash_sale_starts_at__isnull=True) | Q(flash_sale_starts_at__lte=now),
            Q(flash_sale_ends_at__isnull=True) | Q(flash_sale_ends_at__gte=now),
        )


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all().prefetch_related('children').annotate(
        annotated_children_count=Count('children', distinct=True),
        annotated_products_count=Count(
            'products',
            filter=Q(products__is_active=True),
            distinct=True,
        ),
    ).order_by('order', 'name')
    serializer_class = CategorySerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['is_active', 'parent']
    search_fields = ['name']
    ordering_fields = ['order', 'name']

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'tree']:
            return [AllowAny()]
        return [IsAuthenticated(), IsAdminOrSuperAdmin()]

    @action(detail=False, methods=['get'])
    def tree(self, request):
        root_cats = self.get_queryset().filter(parent=None, is_active=True)
        serializer = self.get_serializer(root_cats, many=True)
        return Response(serializer.data)


class BrandViewSet(viewsets.ModelViewSet):
    queryset = Brand.objects.all().annotate(
        annotated_products_count=Count(
            'products',
            filter=Q(products__is_active=True),
            distinct=True,
        ),
    )
    serializer_class = BrandSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['order', 'name', 'created_at']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAuthenticated(), IsAdminOrSuperAdmin()]


class HomeSectionStyleViewSet(viewsets.ModelViewSet):
    queryset = HomeSectionStyle.objects.all()
    serializer_class = HomeSectionStyleSerializer
    filter_backends = [OrderingFilter]
    ordering_fields = ['key', 'title', 'updated_at']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAuthenticated(), IsAdminOrSuperAdmin()]


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all().select_related('category', 'brand').prefetch_related('images', 'stock')
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = ProductFilter
    search_fields = ['name', 'code', 'barcode', 'description', 'brand__name']
    ordering_fields = ['name', 'wholesale_price', 'retail_price', 'created_at', 'rating']

    def get_serializer_class(self):
        if self.action == 'list':
            return ProductListSerializer
        if self.action in ['create', 'update', 'partial_update']:
            return ProductWriteSerializer
        return ProductDetailSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAuthenticated(), IsAdminOrSuperAdmin()]

    def perform_create(self, serializer):
        product = serializer.save()
        bump_storefront_cache()
        from apps.accounts.activity import log_activity
        log_activity(
            user=self.request.user,
            action='create',
            module='products',
            description=f'Created product {product.name}',
            request=self.request,
            object_id=product.pk,
            object_type='Product',
        )

    def perform_update(self, serializer):
        product = serializer.save()
        bump_storefront_cache()
        from apps.accounts.activity import log_activity
        log_activity(
            user=self.request.user,
            action='update',
            module='products',
            description=f'Updated product {product.name}',
            request=self.request,
            object_id=product.pk,
            object_type='Product',
        )

    def perform_destroy(self, instance):
        name = instance.name
        product_id = instance.pk
        super().perform_destroy(instance)
        bump_storefront_cache()
        from apps.accounts.activity import log_activity
        log_activity(
            user=self.request.user,
            action='delete',
            module='products',
            description=f'Deleted product {name}',
            request=self.request,
            object_id=product_id,
            object_type='Product',
        )

    def list(self, request, *args, **kwargs):
        cacheable = request.method == 'GET' and not request.user.is_authenticated
        cache_key = None
        if cacheable:
            cache_key = product_list_cache_key(request.META.get('QUERY_STRING', ''))
            cached = safe_cache_get(cache_key)
            if cached is not None:
                return Response(cached)

        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        products = list(page if page is not None else queryset)
        attach_flash_sale_stats(products)
        serializer = self.get_serializer(products, many=True)
        if page is not None:
            response = self.get_paginated_response(serializer.data)
        else:
            response = Response(serializer.data)

        if cacheable and cache_key:
            safe_cache_set(cache_key, response.data, PRODUCT_LIST_TTL)
        return response

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        attach_flash_sale_stats([instance])
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload_images(self, request, pk=None):
        product = self.get_object()
        images = request.FILES.getlist('images')
        if not images:
            return Response({'detail': 'No images were uploaded.'}, status=status.HTTP_400_BAD_REQUEST)

        is_primary = str(request.data.get('is_primary', False)).lower() in ('1', 'true', 'yes')
        created = []
        next_order = product.images.count()
        if is_primary:
            product.images.update(is_primary=False)
        for i, image in enumerate(images):
            img = ProductImage.objects.create(
                product=product,
                image=optimize_uploaded_image(image),
                is_primary=(is_primary and i == 0),
                order=next_order + i,
            )
            ensure_card_variant(img.image, force=True)
            created.append(ProductImageSerializer(img, context={'request': request}).data)
        bump_storefront_cache()
        return Response(created, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def set_primary_image(self, request, pk=None):
        product = self.get_object()
        image_id = request.data.get('image_id')
        images = list(product.images.all())
        target = next((image for image in images if str(image.id) == str(image_id)), None)
        if not target:
            return Response({'detail': 'Image not found.'}, status=status.HTTP_404_NOT_FOUND)
        rest = [image.id for image in images if image.id != target.id]
        apply_image_display_order(images, [target.id, *rest])
        bump_storefront_cache()
        return Response({'detail': 'Primary image updated.'})

    @action(detail=True, methods=['post'])
    def reorder_images(self, request, pk=None):
        product = self.get_object()
        image_ids = request.data.get('image_ids') or []
        if not isinstance(image_ids, list) or not image_ids:
            return Response({'detail': 'Choose the image order.'}, status=status.HTTP_400_BAD_REQUEST)
        apply_image_display_order(list(product.images.all()), image_ids)
        bump_storefront_cache()
        return Response({'detail': 'Image order updated.'})

    @action(detail=True, methods=['delete'], url_path='delete_image/(?P<image_id>[^/.]+)')
    def delete_image(self, request, pk=None, image_id=None):
        product = self.get_object()
        deleted, _ = product.images.filter(id=image_id).delete()
        if not deleted:
            return Response({'detail': 'Image not found.'}, status=status.HTTP_404_NOT_FOUND)
        if not product.images.filter(is_primary=True).exists():
            first = product.images.first()
            if first:
                first.is_primary = True
                first.save(update_fields=['is_primary'])
        bump_storefront_cache()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @staticmethod
    def _notify_flash_sale_subscribers(request, item, is_set=False):
        raw_flag = request.data.get('send_notification')
        should_send = str(raw_flag or '').strip().lower() in ('1', 'true', 'yes', 'on')
        if not should_send or not getattr(item, 'is_featured', False):
            return

        from threading import Thread
        from django.conf import settings
        from django.utils.html import escape
        from apps.accounts.models import User
        from apps.notifications.services import TelegramService

        chat_ids = list(
            User.objects.filter(
                is_active=True,
                telegram_id__isnull=False,
                telegram_notifications_enabled=True,
            ).exclude(telegram_id='').values_list('telegram_id', flat=True)
        )
        if not chat_ids:
            return

        img_field = None
        primary_img = item.images.filter(is_primary=True).first() or item.images.first()
        if primary_img and getattr(primary_img, 'image', None):
            img_field = primary_img.image
        elif is_set and getattr(item, 'image', None):
            img_field = item.image

        photo_path = None
        photo_url = None
        if img_field:
            try:
                photo_path = img_field.path
            except Exception:
                photo_path = None
            try:
                photo_url = request.build_absolute_uri(img_field.url)
            except Exception:
                photo_url = None

        regular_price = getattr(item, 'price', None) if is_set else getattr(item, 'retail_price', None)
        flash_price = getattr(item, 'flash_sale_price', None)
        lines = [f"⚡ <b>FLASH SALE: {escape(item.name)}</b>"]
        if flash_price is not None:
            price_text = f"🔥 Flash Price: <b>${flash_price}</b>"
            if regular_price and regular_price > flash_price:
                price_text += f" <s>${regular_price}</s>"
            lines.append(price_text)
        if getattr(item, 'flash_sale_stock', None):
            lines.append(f"📦 Limited Stock: {item.flash_sale_stock}")
        if getattr(item, 'flash_sale_max_order_qty', None):
            lines.append(f"🛒 Max Order: {item.flash_sale_max_order_qty} per order")
        caption = "\n".join(lines)

        frontend_url = str(getattr(settings, 'FRONTEND_URL', '') or '').rstrip('/')
        route_path = f"/product-set/{item.pk}" if is_set else f"/product/{item.pk}"
        full_url = f"{frontend_url}{route_path}" if frontend_url else ''
        reply_markup = (
            {'inline_keyboard': [[{'text': '⚡ Shop Flash Sale', 'url': full_url}]]}
            if full_url else None
        )
        ref_prefix = 'flash_sale_set' if is_set else 'flash_sale_product'

        def _send_all():
            service = TelegramService()
            for cid in chat_ids:
                try:
                    service.send_photo(
                        caption=caption,
                        photo_path=photo_path,
                        photo_url=photo_url,
                        event_type='flash_sale',
                        chat_id=str(cid),
                        reference=f'{ref_prefix}_{item.pk}',
                        reply_markup=reply_markup,
                    )
                except Exception:
                    pass

        Thread(target=_send_all, daemon=True).start()

    @staticmethod
    def _parse_optional_positive_int(data, field_name, label):
        raw = data.get(field_name)
        if raw is None or str(raw).strip() == '':
            return None, None
        try:
            value = int(raw)
            if value < 1:
                return None, Response(
                    {field_name: [f'{label} must be at least 1.']},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            return value, None
        except (ValueError, TypeError):
            return None, Response(
                {field_name: [f'Invalid {label.lower()}.']},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=True, methods=['post', 'delete'], url_path='flash-sale')
    def flash_sale(self, request, pk=None):
        product = self.get_object()
        if request.method == 'DELETE':
            product.is_featured = False
            product.flash_sale_price = None
            product.flash_sale_starts_at = None
            product.flash_sale_ends_at = None
            product.flash_sale_max_order_qty = None
            product.flash_sale_stock = None
            product.save(update_fields=[
                'is_featured', 'flash_sale_price', 'flash_sale_starts_at',
                'flash_sale_ends_at', 'flash_sale_max_order_qty', 'flash_sale_stock', 'updated_at',
            ])
            bump_storefront_cache()
            from apps.accounts.activity import log_activity
            log_activity(
                user=request.user,
                action='delete',
                module='product_flash_sale',
                description=f'Removed flash sale from product {product.name}',
                request=request,
                object_id=product.pk,
                object_type='Product',
            )
            return Response({'detail': f'Flash sale removed from product {product.name}', 'id': product.id})

        data = request.data
        price = data.get('flash_sale_price')
        if price is None or str(price).strip() == '':
            return Response({'flash_sale_price': ['Flash sale price is required.']}, status=status.HTTP_400_BAD_REQUEST)
        try:
            price_dec = Decimal(str(price))
            if price_dec <= 0:
                return Response({'flash_sale_price': ['Flash sale price must be greater than zero.']}, status=status.HTTP_400_BAD_REQUEST)
            if product.retail_price and price_dec >= product.retail_price:
                return Response({'flash_sale_price': [f'Flash sale price must be lower than retail price (${product.retail_price}).']}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            return Response({'flash_sale_price': ['Invalid flash sale price.']}, status=status.HTTP_400_BAD_REQUEST)

        starts_at = data.get('flash_sale_starts_at') or None
        ends_at = data.get('flash_sale_ends_at') or None
        if starts_at and ends_at and str(starts_at) >= str(ends_at):
            return Response({'flash_sale_ends_at': ['End time must be after start time.']}, status=status.HTTP_400_BAD_REQUEST)

        max_qty_int, error_response = self._parse_optional_positive_int(
            data, 'flash_sale_max_order_qty', 'Max order quantity'
        )
        if error_response:
            return error_response

        flash_stock_int, error_response = self._parse_optional_positive_int(
            data, 'flash_sale_stock', 'Flash sale stock'
        )
        if error_response:
            return error_response

        status_val = data.get('status', 'active')
        is_featured = data.get('is_featured', True)
        if status_val == 'inactive' or is_featured is False or str(is_featured).lower() in ('0', 'false', 'inactive'):
            is_active_featured = False
        else:
            is_active_featured = True

        serializer = ProductWriteSerializer(product, data={
            'flash_sale_price': price_dec,
            'flash_sale_starts_at': starts_at,
            'flash_sale_ends_at': ends_at,
            'flash_sale_max_order_qty': max_qty_int,
            'flash_sale_stock': flash_stock_int,
            'is_featured': is_active_featured,
        }, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        bump_storefront_cache()

        from apps.accounts.activity import log_activity
        log_activity(
            user=request.user,
            action='update',
            module='product_flash_sale',
            description=f'Configured flash sale for product {product.name}',
            request=request,
            object_id=product.pk,
            object_type='Product',
        )

        product.refresh_from_db()
        attach_flash_sale_stats([product])
        self._notify_flash_sale_subscribers(request, product, is_set=False)
        return Response(ProductListSerializer(product, context={'request': request}).data)

    @action(detail=False, methods=['get'])
    def search_by_code(self, request):
        code = request.query_params.get('code', '')
        try:
            product = Product.objects.get(code=code)
            serializer = ProductDetailSerializer(product, context={'request': request})
            return Response(serializer.data)
        except Product.DoesNotExist:
            return Response({'detail': 'Product not found.'}, status=status.HTTP_404_NOT_FOUND)


class ProductReviewViewSet(viewsets.ModelViewSet):
    queryset = ProductReview.objects.select_related('product', 'user')
    serializer_class = ProductReviewSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['product', 'user']
    ordering_fields = ['created_at', 'rating']
    ordering = ['-created_at']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        product_id = request.data.get('product')
        if not product_id:
            return Response({'product': ['This field is required.']}, status=status.HTTP_400_BAD_REQUEST)

        review = ProductReview.objects.filter(product_id=product_id, user=request.user).first()
        if review:
            serializer = self.get_serializer(review, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save(user=request.user)
            return Response(serializer.data)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ProductSetViewSet(viewsets.ModelViewSet):
    queryset = ProductSet.objects.all().prefetch_related('images', 'items__product__images', 'items__product__stock')
    serializer_class = ProductSetSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = ProductSetFilter
    search_fields = ['name']
    ordering_fields = ['name', 'price', 'created_at']
    ordering = ['-created_at']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAuthenticated(), IsAdminOrSuperAdmin()]

    def perform_create(self, serializer):
        product_set = serializer.save()
        bump_storefront_cache()
        from apps.accounts.activity import log_activity
        log_activity(
            user=self.request.user,
            action='create',
            module='products',
            description=f'Created product set {product_set.name}',
            request=self.request,
            object_id=product_set.pk,
            object_type='ProductSet',
        )

    def perform_update(self, serializer):
        product_set = serializer.save()
        bump_storefront_cache()
        from apps.accounts.activity import log_activity
        log_activity(
            user=self.request.user,
            action='update',
            module='products',
            description=f'Updated product set {product_set.name}',
            request=self.request,
            object_id=product_set.pk,
            object_type='ProductSet',
        )

    def perform_destroy(self, instance):
        name = instance.name
        set_id = instance.pk
        super().perform_destroy(instance)
        bump_storefront_cache()
        from apps.accounts.activity import log_activity
        log_activity(
            user=self.request.user,
            action='delete',
            module='products',
            description=f'Deleted product set {name}',
            request=self.request,
            object_id=set_id,
            object_type='ProductSet',
        )

    @action(detail=True, methods=['post'], url_path='set_items')
    def set_items(self, request, pk=None):
        product_set = self.get_object()
        items_data = request.data.get('items', [])
        product_set.items.all().delete()
        for item in items_data:
            try:
                ProductSetItem.objects.create(
                    product_set=product_set,
                    product_id=item['product'],
                    quantity=max(1, int(item.get('quantity', 1))),
                )
            except Exception:
                pass
        bump_storefront_cache()
        serializer = self.get_serializer(product_set)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload_images(self, request, pk=None):
        product_set = self.get_object()
        images = request.FILES.getlist('images')
        if not images:
            return Response({'detail': 'No images were uploaded.'}, status=status.HTTP_400_BAD_REQUEST)

        is_primary = str(request.data.get('is_primary', False)).lower() in ('1', 'true', 'yes')
        created = []
        next_order = product_set.images.count()
        if is_primary:
            product_set.images.update(is_primary=False)
        for i, image in enumerate(images):
            img = ProductSetImage.objects.create(
                product_set=product_set,
                image=optimize_uploaded_image(image),
                is_primary=(is_primary and i == 0),
                order=next_order + i,
            )
            ensure_card_variant(img.image, force=True)
            created.append(ProductSetImageSerializer(img, context={'request': request}).data)
        bump_storefront_cache()
        return Response(created, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def set_primary_image(self, request, pk=None):
        product_set = self.get_object()
        image_id = request.data.get('image_id')
        images = list(product_set.images.all())
        target = next((image for image in images if str(image.id) == str(image_id)), None)
        if not target:
            return Response({'detail': 'Image not found.'}, status=status.HTTP_404_NOT_FOUND)
        rest = [image.id for image in images if image.id != target.id]
        apply_image_display_order(images, [target.id, *rest])
        bump_storefront_cache()
        return Response({'detail': 'Primary image updated.'})

    @action(detail=True, methods=['post'])
    def reorder_images(self, request, pk=None):
        product_set = self.get_object()
        image_ids = request.data.get('image_ids') or []
        if not isinstance(image_ids, list) or not image_ids:
            return Response({'detail': 'Choose the image order.'}, status=status.HTTP_400_BAD_REQUEST)
        apply_image_display_order(list(product_set.images.all()), image_ids)
        bump_storefront_cache()
        return Response({'detail': 'Image order updated.'})

    @action(detail=True, methods=['delete'], url_path='delete_image/(?P<image_id>[^/.]+)')
    def delete_image(self, request, pk=None, image_id=None):
        product_set = self.get_object()
        deleted, _ = product_set.images.filter(id=image_id).delete()
        if not deleted:
            return Response({'detail': 'Image not found.'}, status=status.HTTP_404_NOT_FOUND)
        if not product_set.images.filter(is_primary=True).exists():
            first = product_set.images.first()
            if first:
                first.is_primary = True
                first.save(update_fields=['is_primary'])
        bump_storefront_cache()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post', 'delete'], url_path='flash-sale')
    def flash_sale(self, request, pk=None):
        product_set = self.get_object()
        if request.method == 'DELETE':
            product_set.is_featured = False
            product_set.flash_sale_price = None
            product_set.flash_sale_starts_at = None
            product_set.flash_sale_ends_at = None
            product_set.flash_sale_max_order_qty = None
            product_set.flash_sale_stock = None
            product_set.save(update_fields=[
                'is_featured', 'flash_sale_price', 'flash_sale_starts_at',
                'flash_sale_ends_at', 'flash_sale_max_order_qty', 'flash_sale_stock',
            ])
            bump_storefront_cache()
            from apps.accounts.activity import log_activity
            log_activity(
                user=request.user,
                action='delete',
                module='product_flash_sale',
                description=f'Removed flash sale from product set {product_set.name}',
                request=request,
                object_id=product_set.pk,
                object_type='ProductSet',
            )
            return Response({'detail': f'Flash sale removed from product set {product_set.name}', 'id': product_set.id})

        data = request.data
        price = data.get('flash_sale_price')
        if price is None or str(price).strip() == '':
            return Response({'flash_sale_price': ['Flash sale price is required.']}, status=status.HTTP_400_BAD_REQUEST)
        try:
            price_dec = Decimal(str(price))
            if price_dec <= 0:
                return Response({'flash_sale_price': ['Flash sale price must be greater than zero.']}, status=status.HTTP_400_BAD_REQUEST)
            if product_set.price and price_dec >= product_set.price:
                return Response({'flash_sale_price': [f'Flash sale price must be lower than set price (${product_set.price}).']}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            return Response({'flash_sale_price': ['Invalid flash sale price.']}, status=status.HTTP_400_BAD_REQUEST)

        starts_at = data.get('flash_sale_starts_at') or None
        ends_at = data.get('flash_sale_ends_at') or None
        if starts_at and ends_at and str(starts_at) >= str(ends_at):
            return Response({'flash_sale_ends_at': ['End time must be after start time.']}, status=status.HTTP_400_BAD_REQUEST)

        max_qty_int, error_response = ProductViewSet._parse_optional_positive_int(
            data, 'flash_sale_max_order_qty', 'Max order quantity'
        )
        if error_response:
            return error_response

        flash_stock_int, error_response = ProductViewSet._parse_optional_positive_int(
            data, 'flash_sale_stock', 'Flash sale stock'
        )
        if error_response:
            return error_response

        status_val = data.get('status', 'active')
        is_featured = data.get('is_featured', True)
        if status_val == 'inactive' or is_featured is False or str(is_featured).lower() in ('0', 'false', 'inactive'):
            is_active_featured = False
        else:
            is_active_featured = True

        serializer = ProductSetSerializer(product_set, data={
            'flash_sale_price': price_dec,
            'flash_sale_starts_at': starts_at,
            'flash_sale_ends_at': ends_at,
            'flash_sale_max_order_qty': max_qty_int,
            'flash_sale_stock': flash_stock_int,
            'is_featured': is_active_featured,
        }, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        bump_storefront_cache()

        from apps.accounts.activity import log_activity
        log_activity(
            user=request.user,
            action='update',
            module='product_flash_sale',
            description=f'Configured flash sale for product set {product_set.name}',
            request=request,
            object_id=product_set.pk,
            object_type='ProductSet',
        )

        product_set.refresh_from_db()
        ProductViewSet._notify_flash_sale_subscribers(request, product_set, is_set=True)
        return Response(ProductSetSerializer(product_set, context={'request': request}).data)


class PromotionViewSet(viewsets.ModelViewSet):
    queryset = Promotion.objects.all()
    serializer_class = PromotionSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAuthenticated(), IsAdminOrSuperAdmin()]

    @action(detail=False, methods=['get'])
    def active(self, request):
        from django.utils import timezone
        now = timezone.now()
        promos = Promotion.objects.filter(is_active=True, start_date__lte=now, end_date__gte=now)
        serializer = self.get_serializer(promos, many=True)
        return Response(serializer.data)


class BannerViewSet(viewsets.ModelViewSet):
    queryset = Banner.objects.all()
    serializer_class = BannerSerializer
    parser_classes = [MultiPartParser, FormParser]

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAuthenticated(), IsAdminOrSuperAdmin()]

    def get_queryset(self):
        qs = Banner.objects.all()
        if self.request.query_params.get('is_active'):
            qs = qs.filter(is_active=True)
        return qs


class HomeFeedView(generics.GenericAPIView):
    """Single payload for the storefront home page (fewer round-trips on VPS)."""
    permission_classes = [AllowAny]

    def get(self, request):
        cached = safe_cache_get(HOME_FEED_CACHE_KEY)
        if cached is not None:
            return Response(cached)

        now = timezone.now()
        ctx = {'request': request}
        product_qs = Product.objects.filter(is_active=True).select_related(
            'category', 'brand'
        ).prefetch_related('images', 'stock')

        flash_qs = list(product_qs.filter(
            is_featured=True,
            flash_sale_price__isnull=False,
            flash_sale_price__lt=F('retail_price'),
        ).filter(
            Q(flash_sale_starts_at__isnull=True) | Q(flash_sale_starts_at__lte=now),
            Q(flash_sale_ends_at__isnull=True) | Q(flash_sale_ends_at__gte=now),
        )[:10])
        best_sellers = list(product_qs.filter(is_best_seller=True)[:12])
        new_arrivals = list(product_qs.filter(is_new_arrival=True)[:12])
        attach_flash_sale_stats(flash_qs + best_sellers + new_arrivals)

        categories = Category.objects.filter(is_active=True).prefetch_related('children').annotate(
            annotated_children_count=Count('children', distinct=True),
            annotated_products_count=Count(
                'products',
                filter=Q(products__is_active=True),
                distinct=True,
            ),
        )
        brands = Brand.objects.filter(is_active=True).annotate(
            annotated_products_count=Count(
                'products',
                filter=Q(products__is_active=True),
                distinct=True,
            ),
        )

        from apps.accounts.models import SiteSettings
        site = SiteSettings.get_solo()

        def card_background(image):
            if not image:
                return None
            return request.build_absolute_uri(image.url)

        payload = {
            'banners': BannerSerializer(
                Banner.objects.filter(is_active=True),
                many=True,
                context=ctx,
            ).data,
            'side_cards': {
                'flash_sale_background': card_background(site.flash_card_background),
                'rewards_background': card_background(site.rewards_card_background),
                'flash_sale_enabled': getattr(site, 'flash_card_enabled', True),
                'rewards_enabled': getattr(site, 'rewards_card_enabled', True),
            },
            'categories': CategorySerializer(categories, many=True, context=ctx).data,
            'brands': BrandSerializer(brands, many=True, context=ctx).data,
            'best_sellers': ProductListSerializer(best_sellers, many=True, context=ctx).data,
            'flash_sale': ProductListSerializer(flash_qs, many=True, context=ctx).data,
            'new_arrivals': ProductListSerializer(new_arrivals, many=True, context=ctx).data,
            'video_highlights': VideoHighlightSerializer(
                VideoHighlight.objects.filter(status=VideoHighlight.STATUS_PUBLISHED)
                .select_related('product')
                .order_by('display_order', '-created_at'),
                many=True,
                context=ctx,
            ).data,
        }
        safe_cache_set(HOME_FEED_CACHE_KEY, payload, HOME_FEED_TTL)
        return Response(payload)


def _translate_text(text, source_lang='en', target_lang='km'):
    cleaned = str(text or '').strip()
    if not cleaned:
        return ''
    import requests
    response = requests.get(
        'https://translate.googleapis.com/translate_a/single',
        params={'client': 'gtx', 'sl': source_lang, 'tl': target_lang, 'dt': 't', 'q': cleaned},
        timeout=5,
    )
    response.raise_for_status()
    data = response.json()
    return ''.join(part[0] for part in (data[0] or []) if part and part[0]).strip()


class AnnouncementViewSet(viewsets.ModelViewSet):
    queryset = Announcement.objects.all().select_related('created_by', 'updated_by').order_by('priority', 'id')
    serializer_class = AnnouncementSerializer
    pagination_class = None
    permission_module = 'marketing_announcements'
    permission_action_map = {
        'list': 'view',
        'retrieve': 'view',
        'create': 'create',
        'duplicate': 'create',
        'update': 'edit',
        'partial_update': 'edit',
        'publish': 'edit',
        'unpublish': 'edit',
        'toggle_active': 'edit',
        'reorder': 'edit',
        'translate': 'view',
        'destroy': 'delete',
    }
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'is_active', 'animation_type', 'language_rule']
    search_fields = ['title', 'message_en', 'message_km', 'mobile_message_en', 'mobile_message_km']
    ordering_fields = ['priority', 'created_at', 'updated_at', 'start_at', 'end_at']

    def get_permissions(self):
        if self.action == 'public':
            return [AllowAny()]
        return [IsAuthenticated(), HasModulePermission()]

    def _log(self, action_name, announcement, description):
        from apps.accounts.activity import log_activity
        log_activity(
            user=self.request.user,
            action=action_name,
            module='marketing_announcements',
            description=description,
            request=self.request,
            object_id=announcement.pk if announcement else '',
            object_type='Announcement',
        )

    def _autofill_translations(self, announcement):
        lang_rule = (announcement.language_rule or 'all').lower()
        pairs = []
        if lang_rule != 'en':
            pairs.extend([
                ('message_en', 'message_km', 'en', 'km'),
                ('mobile_message_en', 'mobile_message_km', 'en', 'km'),
                ('link_text', 'link_text_km', 'en', 'km'),
            ])
        if lang_rule != 'km':
            pairs.extend([
                ('message_km', 'message_en', 'km', 'en'),
                ('mobile_message_km', 'mobile_message_en', 'km', 'en'),
                ('link_text_km', 'link_text', 'km', 'en'),
            ])
        update_fields = []
        for src_field, dst_field, src_lang, dst_lang in pairs:
            src_val = str(getattr(announcement, src_field, '') or '').strip()
            dst_val = str(getattr(announcement, dst_field, '') or '').strip()
            if src_val and not dst_val:
                try:
                    translated = _translate_text(src_val, src_lang, dst_lang)
                except Exception:
                    translated = ''
                if translated:
                    setattr(announcement, dst_field, translated)
                    update_fields.append(dst_field)
        if not update_fields:
            return
        if isinstance(announcement.published_snapshot, dict):
            snapshot = dict(announcement.published_snapshot)
            for field in update_fields:
                snapshot[field] = getattr(announcement, field)
            announcement.published_snapshot = snapshot
            update_fields.append('published_snapshot')
        announcement.save(update_fields=update_fields)

    def perform_create(self, serializer):
        announcement = serializer.save()
        self._autofill_translations(announcement)
        if announcement.status == Announcement.STATUS_PUBLISHED:
            bump_storefront_cache()
        self._log('create', announcement, f'Created announcement "{announcement}"')

    def perform_update(self, serializer):
        was_published = serializer.instance.status == Announcement.STATUS_PUBLISHED
        announcement = serializer.save()
        self._autofill_translations(announcement)
        if announcement.status == Announcement.STATUS_PUBLISHED and not announcement.has_unpublished_changes:
            bump_storefront_cache()
        elif was_published and announcement.status != Announcement.STATUS_PUBLISHED:
            bump_storefront_cache()
        self._log('update', announcement, f'Updated announcement "{announcement}"')

    def perform_destroy(self, instance):
        ann_id = instance.pk
        label = str(instance)
        was_published = instance.status == Announcement.STATUS_PUBLISHED
        super().perform_destroy(instance)
        if was_published:
            bump_storefront_cache()
        from apps.accounts.activity import log_activity
        log_activity(
            user=self.request.user,
            action='delete',
            module='marketing_announcements',
            description=f'Deleted announcement "{label}"',
            request=self.request,
            object_id=ann_id,
            object_type='Announcement',
        )

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        announcement = self.get_object()
        announcement.publish(user=request.user)
        bump_storefront_cache()
        self._log('update', announcement, f'Published announcement "{announcement}"')
        return Response(self.get_serializer(announcement).data)

    @action(detail=True, methods=['post'])
    def unpublish(self, request, pk=None):
        announcement = self.get_object()
        announcement.unpublish(user=request.user)
        bump_storefront_cache()
        self._log('update', announcement, f'Unpublished announcement "{announcement}"')
        return Response(self.get_serializer(announcement).data)

    @action(detail=True, methods=['post'], url_path='toggle-active')
    def toggle_active(self, request, pk=None):
        announcement = self.get_object()
        next_active = request.data.get('is_active')
        if next_active is None:
            announcement.is_active = not announcement.is_active
        else:
            announcement.is_active = str(next_active).lower() in ('1', 'true', 'yes', 'on') if isinstance(next_active, str) else bool(next_active)
        announcement.updated_by = request.user
        update_fields = ['is_active', 'updated_by', 'updated_at']
        if isinstance(announcement.published_snapshot, dict):
            snapshot = dict(announcement.published_snapshot)
            snapshot['is_active'] = announcement.is_active
            announcement.published_snapshot = snapshot
            update_fields.append('published_snapshot')
        announcement.save(update_fields=update_fields)
        if announcement.status == Announcement.STATUS_PUBLISHED:
            bump_storefront_cache()
        self._log('update', announcement, f'{"Enabled" if announcement.is_active else "Disabled"} announcement "{announcement}"')
        return Response(self.get_serializer(announcement).data)

    @action(detail=False, methods=['post'])
    def translate(self, request):
        direction = str(request.data.get('direction') or 'en_to_km').strip().lower()
        if direction == 'km_to_en':
            message_km = str(request.data.get('message_km') or '').strip()
            mobile_message_km = str(request.data.get('mobile_message_km') or '').strip()
            link_text_km = str(request.data.get('link_text_km') or '').strip()
            if not (message_km or mobile_message_km or link_text_km):
                return Response(
                    {'detail': 'Enter a Khmer message first.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            try:
                return Response({
                    'message_en': _translate_text(message_km, 'km', 'en') if message_km else '',
                    'mobile_message_en': _translate_text(mobile_message_km, 'km', 'en') if mobile_message_km else '',
                    'link_text': _translate_text(link_text_km, 'km', 'en') if link_text_km else '',
                })
            except Exception:
                return Response(
                    {'detail': 'Auto-translation service is temporarily unavailable.'},
                    status=status.HTTP_502_BAD_GATEWAY,
                )

        message_en = str(request.data.get('message_en') or '').strip()
        mobile_message_en = str(request.data.get('mobile_message_en') or '').strip()
        link_text = str(request.data.get('link_text') or '').strip()
        if not (message_en or mobile_message_en or link_text):
            return Response(
                {'detail': 'Enter an English message first.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            return Response({
                'message_km': _translate_text(message_en, 'en', 'km') if message_en else '',
                'mobile_message_km': _translate_text(mobile_message_en, 'en', 'km') if mobile_message_en else '',
                'link_text_km': _translate_text(link_text, 'en', 'km') if link_text else '',
            })
        except Exception:
            return Response(
                {'detail': 'Auto-translation service is temporarily unavailable.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        source = self.get_object()
        max_priority = Announcement.objects.order_by('-priority').values_list('priority', flat=True).first()
        next_priority = (max_priority + 1) if max_priority is not None else 0
        copy_title = f'{source.title} (Copy)' if source.title else ''
        duplicate_obj = Announcement.objects.create(
            title=copy_title[:200],
            message_en=source.message_en,
            message_km=source.message_km,
            mobile_message_en=source.mobile_message_en,
            mobile_message_km=source.mobile_message_km,
            icon=source.icon,
            link_url=source.link_url,
            link_text=source.link_text,
            link_text_km=source.link_text_km,
            open_in_new_tab=source.open_in_new_tab,
            background_color=source.background_color,
            text_color=source.text_color,
            use_gradient=source.use_gradient,
            gradient_css=source.gradient_css,
            font_size=source.font_size,
            font_weight=source.font_weight,
            alignment=source.alignment,
            height=source.height,
            padding_x=source.padding_x,
            border_radius=source.border_radius,
            icon_size=source.icon_size,
            icon_color=source.icon_color,
            show_close_button=source.show_close_button,
            animation_type=source.animation_type,
            animation_speed=source.animation_speed,
            animation_direction=source.animation_direction,
            transition_duration=source.transition_duration,
            rotation_delay=source.rotation_delay,
            reduced_motion=source.reduced_motion,
            show_on_desktop=source.show_on_desktop,
            show_on_tablet=source.show_on_tablet,
            show_on_mobile=source.show_on_mobile,
            tablet_font_size=source.tablet_font_size,
            tablet_height=source.tablet_height,
            tablet_padding_x=source.tablet_padding_x,
            tablet_alignment=source.tablet_alignment,
            mobile_font_size=source.mobile_font_size,
            mobile_height=source.mobile_height,
            mobile_padding_x=source.mobile_padding_x,
            mobile_alignment=source.mobile_alignment,
            start_at=source.start_at,
            end_at=source.end_at,
            is_active=False,
            priority=next_priority,
            target_stores=list(source.target_stores or []),
            target_delivery_areas=list(source.target_delivery_areas or []),
            language_rule=source.language_rule,
            page_display_mode=source.page_display_mode,
            target_pages=list(source.target_pages or []),
            status=Announcement.STATUS_DRAFT,
            published_snapshot=None,
            has_unpublished_changes=False,
            published_at=None,
            created_by=request.user,
            updated_by=request.user,
        )
        self._log('create', duplicate_obj, f'Duplicated announcement "{source}" as "{duplicate_obj}"')
        return Response(self.get_serializer(duplicate_obj).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'])
    def reorder(self, request):
        ordered_ids = request.data.get('ordered_ids') or []
        if not isinstance(ordered_ids, list) or not ordered_ids:
            return Response({'detail': 'ordered_ids list is required.'}, status=status.HTTP_400_BAD_REQUEST)

        announcements = list(Announcement.objects.all().order_by('priority', 'id'))
        by_id = {item.id: item for item in announcements}
        ordered = []
        seen = set()
        for raw_id in ordered_ids:
            try:
                item_id = int(raw_id)
            except (TypeError, ValueError):
                continue
            item = by_id.get(item_id)
            if item and item.id not in seen:
                ordered.append(item)
                seen.add(item.id)
        ordered.extend(item for item in announcements if item.id not in seen)

        published_touched = False
        for index, item in enumerate(ordered):
            if item.priority != index:
                item.priority = index
                update_fields = ['priority']
                if isinstance(item.published_snapshot, dict):
                    snapshot = dict(item.published_snapshot)
                    snapshot['priority'] = index
                    item.published_snapshot = snapshot
                    update_fields.append('published_snapshot')
                item.save(update_fields=update_fields)
                if item.status == Announcement.STATUS_PUBLISHED:
                    published_touched = True

        if published_touched:
            bump_storefront_cache()
        from apps.accounts.activity import log_activity
        log_activity(
            user=request.user,
            action='update',
            module='marketing_announcements',
            description='Reordered announcement bar priorities',
            request=request,
            object_type='Announcement',
        )
        return Response(self.get_serializer(ordered, many=True).data)

    @action(detail=False, methods=['get'], authentication_classes=[], permission_classes=[AllowAny])
    def public(self, request):
        from django.utils.dateparse import parse_datetime

        items = safe_cache_get(ANNOUNCEMENTS_PUBLIC_CACHE_KEY)
        if items is None:
            qs = Announcement.objects.filter(
                status=Announcement.STATUS_PUBLISHED,
                is_active=True,
            ).order_by('priority', 'id')
            items = []
            for ann in qs:
                payload = dict(ann.published_snapshot) if isinstance(ann.published_snapshot, dict) else ann.build_snapshot()
                payload['id'] = ann.pk
                payload['priority'] = ann.priority
                payload['is_active'] = ann.is_active
                payload['version'] = (ann.published_at or ann.updated_at).isoformat() if (ann.published_at or ann.updated_at) else str(ann.pk)
                items.append(payload)
            safe_cache_set(ANNOUNCEMENTS_PUBLIC_CACHE_KEY, items, ANNOUNCEMENTS_PUBLIC_TTL)

        now = timezone.now()
        lang_filter = (request.query_params.get('lang') or '').strip().lower()
        page_filter = (request.query_params.get('page') or '').strip().lower()
        store_filter = (request.query_params.get('store') or '').strip()
        area_filter = (request.query_params.get('area') or '').strip().lower()

        visible = []
        for item in items:
            if not item.get('is_active', True):
                continue
            start_raw = item.get('start_at')
            end_raw = item.get('end_at')
            if start_raw:
                start_dt = parse_datetime(start_raw)
                if start_dt and timezone.is_naive(start_dt):
                    start_dt = timezone.make_aware(start_dt, timezone.get_current_timezone())
                if start_dt and start_dt > now:
                    continue
            if end_raw:
                end_dt = parse_datetime(end_raw)
                if end_dt and timezone.is_naive(end_dt):
                    end_dt = timezone.make_aware(end_dt, timezone.get_current_timezone())
                if end_dt and end_dt < now:
                    continue

            lang_rule = (item.get('language_rule') or 'all').lower()
            if lang_filter in ('en', 'km') and lang_rule in ('en', 'km') and lang_rule != lang_filter:
                continue

            if page_filter and item.get('page_display_mode') == 'selected':
                allowed_pages = [str(p).strip().lower() for p in (item.get('target_pages') or [])]
                if page_filter not in allowed_pages:
                    continue

            target_stores = [str(s).strip() for s in (item.get('target_stores') or []) if str(s).strip()]
            if store_filter and target_stores and store_filter not in target_stores:
                continue

            target_areas = [str(a).strip().lower() for a in (item.get('target_delivery_areas') or []) if str(a).strip()]
            if area_filter and target_areas and area_filter not in target_areas:
                continue

            visible.append(item)

        visible.sort(key=lambda x: (int(x.get('priority') or 0), int(x.get('id') or 0)))
        return Response(visible)


def _is_super_admin(user):
    return bool(user and user.is_authenticated and (user.is_superuser or getattr(user, 'role', '') == 'super_admin'))


def _is_admin_or_super_admin(user):
    return bool(user and user.is_authenticated and (user.is_superuser or getattr(user, 'role', '') in ('super_admin', 'admin')))


class OfferPosterViewSet(viewsets.ModelViewSet):
    queryset = OfferPoster.objects.select_related('store', 'created_by', 'approved_by').all()
    serializer_class = OfferPosterSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    permission_module = 'marketing_posters'
    permission_action_map = {
        'list': 'view',
        'retrieve': 'view',
        'create': 'create',
        'update': 'edit',
        'partial_update': 'edit',
        'publish': 'edit',
        'pause': 'edit',
        'approve': 'approve',
        'reject': 'approve',
        'destroy': 'delete',
    }
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'approval_status', 'store', 'target_audience', 'display_frequency']
    search_fields = ['title', 'description', 'store__name']
    ordering_fields = ['priority', 'created_at', 'start_at', 'end_at', 'title']
    ordering = ['priority', '-created_at']

    def get_permissions(self):
        if self.action == 'public':
            return [AllowAny()]
        return [IsAuthenticated(), HasModulePermission()]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if self.action == 'public':
            return qs
        if _is_admin_or_super_admin(user):
            return qs
        return qs.filter(created_by=user)

    def _log(self, action_name, poster, description):
        from apps.accounts.activity import log_activity
        log_activity(
            user=self.request.user,
            action=action_name,
            module='marketing_posters',
            description=description,
            request=self.request,
            object_id=poster.pk if poster else '',
            object_type='OfferPoster',
        )

    def _notify_poster_subscribers(self, poster):
        raw_flag = self.request.data.get('send_notification')
        should_send = str(raw_flag or '').strip().lower() in ('1', 'true', 'yes', 'on')
        if not should_send:
            return
        if poster.status != OfferPoster.STATUS_PUBLISHED or poster.approval_status != OfferPoster.APPROVAL_APPROVED:
            return

        from threading import Thread
        from django.conf import settings
        from django.utils.html import escape
        from apps.accounts.models import User
        from apps.notifications.services import TelegramService

        title = escape(poster.title or 'New Offer')
        desc = escape(poster.description or '')
        store_line = f"\nStore: <b>{escape(poster.store.name)}</b>" if poster.store else ''
        text = f"<b>{title}</b>{store_line}"
        if desc:
            text += f"\n\n{desc}"

        frontend_url = str(getattr(settings, 'FRONTEND_URL', '') or '').rstrip('/')
        target_path = OfferPosterSerializer(poster, context={'request': self.request}).data.get('resolved_action_url') or '/'
        full_url = target_path if target_path.startswith('http') else (f"{frontend_url}{target_path}" if frontend_url else '')
        reply_markup = None
        if full_url:
            reply_markup = {
                'inline_keyboard': [[{'text': poster.button_label or 'Shop Now', 'url': full_url}]]
            }

        chat_ids = list(
            User.objects.filter(
                is_active=True,
                telegram_id__isnull=False,
                telegram_notifications_enabled=True,
            ).exclude(telegram_id='').values_list('telegram_id', flat=True)
        )
        if not chat_ids:
            return

        img_field = getattr(poster, 'image', None) or getattr(poster, 'mobile_image', None)
        photo_path = None
        photo_url = None
        if img_field:
            try:
                photo_path = img_field.path
            except Exception:
                photo_path = None
            try:
                photo_url = self.request.build_absolute_uri(img_field.url)
            except Exception:
                photo_url = None

        def _send_all():
            service = TelegramService()
            for cid in chat_ids:
                try:
                    service.send_photo(
                        caption=text,
                        photo_path=photo_path,
                        photo_url=photo_url,
                        event_type='offer_poster',
                        chat_id=str(cid),
                        reference=f'poster_{poster.pk}',
                        reply_markup=reply_markup,
                    )
                except Exception:
                    pass

        Thread(target=_send_all, daemon=True).start()

    def perform_create(self, serializer):
        poster = serializer.save()
        bump_storefront_cache()
        self._log('create', poster, f'Created offer poster: {poster.title}')
        self._notify_poster_subscribers(poster)

    def perform_update(self, serializer):
        poster = serializer.save()
        bump_storefront_cache()
        self._log('update', poster, f'Updated offer poster: {poster.title}')
        self._notify_poster_subscribers(poster)

    def perform_destroy(self, instance):
        title = instance.title
        if instance.image:
            instance.image.delete(save=False)
        if instance.mobile_image:
            instance.mobile_image.delete(save=False)
        instance.delete()
        bump_storefront_cache()
        self._log('delete', None, f'Deleted offer poster: {title}')

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        poster = self.get_object()
        poster.status = OfferPoster.STATUS_PUBLISHED
        poster.updated_by = request.user
        poster.save(update_fields=['status', 'updated_by', 'updated_at'])
        bump_storefront_cache()
        self._log('update', poster, f'Published offer poster: {poster.title}')
        return Response(self.get_serializer(poster).data)

    @action(detail=True, methods=['post'])
    def pause(self, request, pk=None):
        poster = self.get_object()
        poster.status = OfferPoster.STATUS_PAUSED
        poster.updated_by = request.user
        poster.save(update_fields=['status', 'updated_by', 'updated_at'])
        bump_storefront_cache()
        self._log('update', poster, f'Paused offer poster: {poster.title}')
        return Response(self.get_serializer(poster).data)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        if not _is_super_admin(request.user):
            return Response({'detail': 'Only Super Admin can approve posters.'}, status=status.HTTP_403_FORBIDDEN)
        poster = self.get_object()
        poster.approval_status = OfferPoster.APPROVAL_APPROVED
        poster.rejection_reason = ''
        poster.approved_by = request.user
        poster.approved_at = timezone.now()
        poster.updated_by = request.user
        poster.save(update_fields=['approval_status', 'rejection_reason', 'approved_by', 'approved_at', 'updated_by', 'updated_at'])
        bump_storefront_cache()
        self._log('approve', poster, f'Approved offer poster: {poster.title}')
        return Response(self.get_serializer(poster).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        if not _is_super_admin(request.user):
            return Response({'detail': 'Only Super Admin can reject posters.'}, status=status.HTTP_403_FORBIDDEN)
        poster = self.get_object()
        poster.approval_status = OfferPoster.APPROVAL_REJECTED
        poster.rejection_reason = str(request.data.get('reason') or '').strip()[:300]
        poster.updated_by = request.user
        poster.save(update_fields=['approval_status', 'rejection_reason', 'updated_by', 'updated_at'])
        bump_storefront_cache()
        self._log('reject', poster, f'Rejected offer poster: {poster.title}')
        return Response(self.get_serializer(poster).data)

    @action(detail=False, methods=['get'], url_path='public')
    def public(self, request):
        now = timezone.now()
        posters = OfferPoster.objects.filter(
            status=OfferPoster.STATUS_PUBLISHED,
            approval_status=OfferPoster.APPROVAL_APPROVED,
        ).filter(
            Q(start_at__isnull=True) | Q(start_at__lte=now),
            Q(end_at__isnull=True) | Q(end_at__gte=now),
        ).select_related('store').order_by('priority', '-created_at')

        user = request.user
        is_authenticated = bool(user and user.is_authenticated)
        user_tier = ''
        if is_authenticated:
            try:
                from apps.orders.models import RewardSettings
                from apps.orders.rewards import get_member_tier
                settings_obj = RewardSettings.get_solo()
                user_tier = get_member_tier(getattr(user, 'reward_points', 0), settings_obj).lower()
            except Exception:
                user_tier = 'classic'

        eligible = []
        for poster in posters:
            audience = poster.target_audience
            if audience == OfferPoster.AUDIENCE_GUESTS and is_authenticated:
                continue
            if audience == OfferPoster.AUDIENCE_LOGGED_IN and not is_authenticated:
                continue
            if audience == OfferPoster.AUDIENCE_MEMBERSHIP:
                if not is_authenticated:
                    continue
                levels = [str(lvl).strip().lower() for lvl in (poster.membership_levels or [])]
                if user_tier not in levels:
                    continue
            eligible.append(poster)

        serializer = self.get_serializer(eligible, many=True)
        return Response(serializer.data)


class VideoHighlightViewSet(viewsets.ModelViewSet):
    queryset = VideoHighlight.objects.select_related('product', 'created_by', 'updated_by').all()
    serializer_class = VideoHighlightSerializer
    permission_classes = [IsAuthenticated, HasModulePermission]
    permission_module = 'marketing_videos'
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'product']
    search_fields = ['title', 'product_label', 'product_label_km', 'caption', 'caption_km', 'product__name']
    ordering_fields = ['display_order', 'created_at', 'updated_at']
    ordering = ['display_order', '-created_at']

    def get_permissions(self):
        if self.action == 'public':
            return [AllowAny()]
        return super().get_permissions()

    def _log(self, action_name, video_obj, description):
        from apps.accounts.activity import log_activity
        log_activity(
            user=self.request.user,
            action=action_name,
            module='marketing_videos',
            description=description,
            request=self.request,
            object_id=video_obj.pk,
            object_type='VideoHighlight',
        )

    def perform_create(self, serializer):
        video_obj = serializer.save()
        bump_storefront_cache()
        self._log('create', video_obj, f'Created video highlight: {video_obj.title}')

    def perform_update(self, serializer):
        video_obj = serializer.save()
        bump_storefront_cache()
        self._log('update', video_obj, f'Updated video highlight: {video_obj.title}')

    def perform_destroy(self, instance):
        title = instance.title
        if instance.video:
            instance.video.delete(save=False)
        if instance.cover_image:
            instance.cover_image.delete(save=False)
        instance.delete()
        bump_storefront_cache()
        from apps.accounts.activity import log_activity
        log_activity(
            user=self.request.user,
            action='delete',
            module='marketing_videos',
            description=f'Deleted video highlight: {title}',
            request=self.request,
            object_type='VideoHighlight',
        )

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        video_obj = self.get_object()
        video_obj.status = VideoHighlight.STATUS_PUBLISHED
        video_obj.updated_by = request.user
        video_obj.save(update_fields=['status', 'updated_by', 'updated_at'])
        bump_storefront_cache()
        self._log('update', video_obj, f'Published video highlight: {video_obj.title}')
        return Response(self.get_serializer(video_obj).data)

    @action(detail=True, methods=['post'])
    def unpublish(self, request, pk=None):
        video_obj = self.get_object()
        video_obj.status = VideoHighlight.STATUS_DRAFT
        video_obj.updated_by = request.user
        video_obj.save(update_fields=['status', 'updated_by', 'updated_at'])
        bump_storefront_cache()
        self._log('update', video_obj, f'Unpublished video highlight: {video_obj.title}')
        return Response(self.get_serializer(video_obj).data)

    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def public(self, request):
        videos = (
            VideoHighlight.objects.filter(status=VideoHighlight.STATUS_PUBLISHED)
            .select_related('product')
            .order_by('display_order', '-created_at')
        )
        return Response(self.get_serializer(videos, many=True).data)
