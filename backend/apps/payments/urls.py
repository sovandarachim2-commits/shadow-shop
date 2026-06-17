from django.urls import include, path
from rest_framework.routers import DefaultRouter
from .views import AbaPaymentViewSet, BakongPaymentViewSet

router = DefaultRouter()
router.register('bakong', BakongPaymentViewSet, basename='bakong-payments')
router.register('aba', AbaPaymentViewSet, basename='aba-payments')

urlpatterns = [
    path('', include(router.urls)),
]

