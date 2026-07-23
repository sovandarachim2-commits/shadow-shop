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
    path('email/resend-code/', views.EmailVerificationResendView.as_view(), name='email-resend-code'),
    path('email/verify-code/', views.EmailVerificationConfirmView.as_view(), name='email-verify-code'),
    path('password/forgot/', views.ForgotPasswordRequestView.as_view(), name='password-forgot'),
    path('password/verify-code/', views.ForgotPasswordVerifyCodeView.as_view(), name='password-verify-code'),
    path('password/reset/', views.ForgotPasswordResetView.as_view(), name='password-reset'),
    path('google/config/', views.GoogleLoginConfigView.as_view(), name='google-config'),
    path('google/login/', views.GoogleLoginView.as_view(), name='google-login'),
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
    path('set-initial-password/', views.SetInitialPasswordView.as_view(), name='set-initial-password'),
    path('dashboard/stats/', views.DashboardStatsView.as_view(), name='dashboard-stats'),
    path('site-settings/', views.SiteSettingsView.as_view(), name='site-settings'),
    path('site-settings/favicon/', views.SiteSettingsFaviconView.as_view(), name='site-settings-favicon'),
    path('site-settings/manifest/', views.SiteSettingsManifestView.as_view(), name='site-settings-manifest'),
    path('', include(router.urls)),
]
