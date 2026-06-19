from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('customers', views.CustomerViewSet, basename='customers')
router.register('list', views.OrderViewSet, basename='orders')
router.register('prepare-records', views.PrepareRecordViewSet, basename='prepare-records')
router.register('out-records', views.OutRecordViewSet, basename='out-records')
router.register('wishlist', views.WishlistViewSet, basename='wishlist')
router.register('cart', views.CartViewSet, basename='cart')
router.register('rewards', views.RewardsViewSet, basename='rewards')
router.register('admin/reward-items', views.AdminRewardItemViewSet, basename='admin-reward-items')
router.register('admin/reward-redemptions', views.AdminRewardRedemptionViewSet, basename='admin-reward-redemptions')
router.register('admin/reward-points', views.AdminRewardPointsViewSet, basename='admin-reward-points')

urlpatterns = [
    path('', include(router.urls)),
]
