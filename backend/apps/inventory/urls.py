from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('stock', views.StockViewSet, basename='stock')
router.register('movements', views.StockMovementViewSet, basename='stock-movements')
router.register('warehouses', views.WarehouseViewSet, basename='warehouses')
router.register('transfers', views.StockTransferViewSet, basename='stock-transfers')

urlpatterns = [
    path('', include(router.urls)),
]
