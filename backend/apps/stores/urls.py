from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PublicPartnerInquiryCreateView,
    PublicStoreListView,
    PublicStoreDetailView,
    AdminPartnerInquiryViewSet,
    AdminStoreViewSet,
    AdminStoreContractViewSet,
    AdminStoreMembershipViewSet,
    AdminStorePayoutViewSet,
)

router = DefaultRouter()
router.register(r'admin/inquiries', AdminPartnerInquiryViewSet, basename='admin-inquiries')
router.register(r'admin/stores', AdminStoreViewSet, basename='admin-stores')
router.register(r'admin/contracts', AdminStoreContractViewSet, basename='admin-contracts')
router.register(r'admin/memberships', AdminStoreMembershipViewSet, basename='admin-memberships')
router.register(r'admin/payouts', AdminStorePayoutViewSet, basename='admin-payouts')

urlpatterns = [
    # Public endpoints
    path('inquiries/submit/', PublicPartnerInquiryCreateView.as_view(), name='public-inquiry-submit'),
    path('public/list/', PublicStoreListView.as_view(), name='public-store-list'),
    path('public/<slug:slug>/', PublicStoreDetailView.as_view(), name='public-store-detail'),

    # Admin management endpoints
    path('', include(router.urls)),
]

