from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

router = DefaultRouter()
router.register('users', views.UserViewSet, basename='users')
router.register('permissions', views.PermissionViewSet, basename='permissions')
router.register('roles', views.RoleViewSet, basename='roles')
router.register('role-permissions', views.RolePermissionViewSet, basename='role-permissions')
router.register('activity-logs', views.ActivityLogViewSet, basename='activity-logs')
router.register('addresses', views.AddressViewSet, basename='addresses')

urlpatterns = [
    path('login/', views.CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('register/', views.RegisterView.as_view(), name='register'),
    path('telegram/config/', views.TelegramLoginConfigView.as_view(), name='telegram-config'),
    path('telegram/login/', views.TelegramLoginView.as_view(), name='telegram-login'),
    path('telegram/start/', views.TelegramVerificationStartView.as_view(), name='telegram-start'),
    path('telegram/status/', views.TelegramVerificationStatusView.as_view(), name='telegram-status'),
    path('telegram/confirm/', views.TelegramVerificationConfirmView.as_view(), name='telegram-confirm'),
    path('telegram/otp-login/', views.TelegramOTPLoginView.as_view(), name='telegram-otp-login'),
    path('telegram/webhook/', views.TelegramWebhookView.as_view(), name='telegram-webhook'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('me/', views.MeView.as_view(), name='me'),
    path('change-password/', views.ChangePasswordView.as_view(), name='change-password'),
    path('dashboard/stats/', views.DashboardStatsView.as_view(), name='dashboard-stats'),
    path('site-settings/', views.SiteSettingsView.as_view(), name='site-settings'),
    path('', include(router.urls)),
]
