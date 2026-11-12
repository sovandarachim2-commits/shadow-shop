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
from .models import Brand, Category, Product, ProductImage, ProductReview, ProductSet, ProductSetImage, ProductSetItem, Promotion, Banner, HomeSectionStyle, Announcement
from .serializers import (
    BrandSerializer, CategorySerializer, ProductListSerializer, ProductDetailSerializer,
    ProductWriteSerializer, ProductImageSerializer, ProductSetImageSerializer, ProductSetSerializer,
    ProductReviewSerializer, PromotionSerializer, BannerSerializer, HomeSectionStyleSerializer,
    AnnouncementSerializer,
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

    @action(detail=True, methods=['post', 'delete'], url_path='flash-sale')
    def flash_sale(self, request, pk=None):
        product = self.get_object()
        if request.method == 'DELETE':
            product.is_featured = False
            product.flash_sale_price = None
            product.flash_sale_starts_at = None
            product.flash_sale_ends_at = None
            product.flash_sale_max_order_qty = None
            product.save(update_fields=[
                'is_featured', 'flash_sale_price', 'flash_sale_starts_at',
                'flash_sale_ends_at', 'flash_sale_max_order_qty', 'updated_at',
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

        max_qty = data.get('flash_sale_max_order_qty')
        if max_qty:
            try:
                max_qty_int = int(max_qty)
                if max_qty_int < 1:
                    return Response({'flash_sale_max_order_qty': ['Max order quantity must be at least 1.']}, status=status.HTTP_400_BAD_REQUEST)
            except (ValueError, TypeError):
                return Response({'flash_sale_max_order_qty': ['Invalid max order quantity.']}, status=status.HTTP_400_BAD_REQUEST)
        else:
            max_qty_int = None

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
            product_set.save(update_fields=[
                'is_featured', 'flash_sale_price', 'flash_sale_starts_at',
                'flash_sale_ends_at', 'flash_sale_max_order_qty',
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

        max_qty = data.get('flash_sale_max_order_qty')
        if max_qty:
            try:
                max_qty_int = int(max_qty)
                if max_qty_int < 1:
                    return Response({'flash_sale_max_order_qty': ['Max order quantity must be at least 1.']}, status=status.HTTP_400_BAD_REQUEST)
            except (ValueError, TypeError):
                return Response({'flash_sale_max_order_qty': ['Invalid max order quantity.']}, status=status.HTTP_400_BAD_REQUEST)
        else:
            max_qty_int = None

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
        }
        safe_cache_set(HOME_FEED_CACHE_KEY, payload, HOME_FEED_TTL)
        return Response(payload)


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

    def perform_create(self, serializer):
        announcement = serializer.save()
        if announcement.status == Announcement.STATUS_PUBLISHED:
            bump_storefront_cache()
        self._log('create', announcement, f'Created announcement "{announcement}"')

    def perform_update(self, serializer):
        was_published = serializer.instance.status == Announcement.STATUS_PUBLISHED
        announcement = serializer.save()
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
