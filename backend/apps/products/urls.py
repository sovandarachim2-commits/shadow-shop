from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('brands', views.BrandViewSet, basename='brands')
router.register('categories', views.CategoryViewSet, basename='categories')
router.register('home-sections', views.HomeSectionStyleViewSet, basename='home-sections')
router.register('items', views.ProductViewSet, basename='products')
router.register('reviews', views.ProductReviewViewSet, basename='product-reviews')
router.register('sets', views.ProductSetViewSet, basename='product-sets')
router.register('promotions', views.PromotionViewSet, basename='promotions')
router.register('banners', views.BannerViewSet, basename='banners')

urlpatterns = [
    path('home/', views.HomeFeedView.as_view(), name='home-feed'),
    path('', include(router.urls)),
]
