from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters import rest_framework as filters
from django.db.models import F, Q
from django.utils import timezone
from .models import Brand, Category, Product, ProductImage, ProductReview, ProductSet, ProductSetImage, ProductSetItem, Promotion, Banner, HomeSectionStyle
from .serializers import (
    BrandSerializer, CategorySerializer, ProductListSerializer, ProductDetailSerializer,
    ProductWriteSerializer, ProductImageSerializer, ProductSetImageSerializer, ProductSetSerializer,
    ProductReviewSerializer, PromotionSerializer, BannerSerializer, HomeSectionStyleSerializer,
)
from utils.permissions import IsAdminOrSuperAdmin, IsStaff


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


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all().prefetch_related('children')
    serializer_class = CategorySerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['is_active', 'parent']
    search_fields = ['name']
    ordering_fields = ['order', 'name']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAuthenticated(), IsAdminOrSuperAdmin()]

    @action(detail=False, methods=['get'])
    def tree(self, request):
        root_cats = Category.objects.filter(parent=None, is_active=True)
        serializer = self.get_serializer(root_cats, many=True)
        return Response(serializer.data)


class BrandViewSet(viewsets.ModelViewSet):
    queryset = Brand.objects.all()
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
    ordering_fields = ['name', 'wholesale_price', 'created_at', 'rating']

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

    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload_images(self, request, pk=None):
        product = self.get_object()
        images = request.FILES.getlist('images')
        if not images:
            return Response({'detail': 'No images were uploaded.'}, status=status.HTTP_400_BAD_REQUEST)

        is_primary = request.data.get('is_primary', False)
        created = []
        for i, image in enumerate(images):
            img = ProductImage.objects.create(
                product=product,
                image=image,
                is_primary=(is_primary and i == 0),
                order=product.images.count() + i,
            )
            created.append(ProductImageSerializer(img, context={'request': request}).data)
        return Response(created, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def set_primary_image(self, request, pk=None):
        product = self.get_object()
        image_id = request.data.get('image_id')
        product.images.update(is_primary=False)
        product.images.filter(id=image_id).update(is_primary=True)
        return Response({'detail': 'Primary image updated.'})

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
        return Response(status=status.HTTP_204_NO_CONTENT)

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
    filterset_fields = ['is_active', 'is_featured']
    search_fields = ['name']
    ordering_fields = ['name', 'price', 'created_at']
    ordering = ['-created_at']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAuthenticated(), IsAdminOrSuperAdmin()]

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
        serializer = self.get_serializer(product_set)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload_images(self, request, pk=None):
        product_set = self.get_object()
        images = request.FILES.getlist('images')
        if not images:
            return Response({'detail': 'No images were uploaded.'}, status=status.HTTP_400_BAD_REQUEST)

        is_primary = request.data.get('is_primary', False)
        created = []
        for i, image in enumerate(images):
            img = ProductSetImage.objects.create(
                product_set=product_set,
                image=image,
                is_primary=(is_primary and i == 0),
                order=product_set.images.count() + i,
            )
            created.append(ProductSetImageSerializer(img, context={'request': request}).data)
        return Response(created, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def set_primary_image(self, request, pk=None):
        product_set = self.get_object()
        image_id = request.data.get('image_id')
        product_set.images.update(is_primary=False)
        product_set.images.filter(id=image_id).update(is_primary=True)
        return Response({'detail': 'Primary image updated.'})

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
        return Response(status=status.HTTP_204_NO_CONTENT)


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
