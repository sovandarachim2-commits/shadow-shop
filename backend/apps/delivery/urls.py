from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('by-config', views.DeliveryByConfigViewSet, basename='delivery-by-config')
router.register('companies', views.DeliveryCompanyViewSet, basename='delivery-companies')
router.register('list', views.DeliveryViewSet, basename='deliveries')

urlpatterns = [
    path('', include(router.urls)),
]
