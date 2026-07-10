from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.conf import settings
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
import hashlib
import hmac
import secrets
import random
import string
import mimetypes
import requests
from datetime import datetime, timedelta
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.http import HttpResponseRedirect, JsonResponse
from .models import Permission, Role, RolePermission, ActivityLog, TelegramVerification, Address, SiteSettings
from .serializers import (
    CustomTokenObtainPairSerializer, UserSerializer, UserCreateSerializer,
    ChangePasswordSerializer, CustomerRegisterSerializer, PermissionSerializer, RoleSerializer,
    RolePermissionSerializer, ActivityLogSerializer, AddressSerializer, SiteSettingsSerializer,
)
from utils.permissions import IsAdminOrSuperAdmin, IsSuperAdmin

User = get_user_model()


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class LogoutView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({'detail': 'Successfully logged out.'})
        except Exception:
            return Response({'detail': 'Invalid token.'}, status=status.HTTP_400_BAD_REQUEST)


class RegisterView(generics.CreateAPIView):
    serializer_class = CustomerRegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': UserSerializer(user, context={'request': request}).data,
        }, status=status.HTTP_201_CREATED)


class TelegramLoginView(generics.GenericAPIView):
    permission_classes = [AllowAny]

    def post(self, request):
        auth_data = request.data or {}
        telegram_hash = str(auth_data.get('hash', '')).strip()
        auth_date = str(auth_data.get('auth_date', '')).strip()
        telegram_id = str(auth_data.get('id', '')).strip()

        if not telegram_hash or not auth_date or not telegram_id:
            return Response({'detail': 'Telegram login data is incomplete.'}, status=status.HTTP_400_BAD_REQUEST)

        from apps.notifications.services import TelegramService
        telegram_service = TelegramService()
        bot_token = telegram_service.get_bot_token()
        if not bot_token:
            return Response({'detail': 'Telegram bot token is not configured.'}, status=status.HTTP_400_BAD_REQUEST)

        if not self._verify_telegram_hash(auth_data, bot_token, telegram_hash):
            return Response({'detail': 'Telegram login signature is invalid.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            auth_datetime = datetime.fromtimestamp(int(auth_date), tz=timezone.get_current_timezone())
        except (TypeError, ValueError):
            return Response({'detail': 'Telegram auth date is invalid.'}, status=status.HTTP_400_BAD_REQUEST)

        if timezone.now() - auth_datetime > timedelta(days=1):
            return Response({'detail': 'Telegram login expired. Please try again.'}, status=status.HTTP_400_BAD_REQUEST)

        first_name = str(auth_data.get('first_name', '')).strip()
        last_name = str(auth_data.get('last_name', '')).strip()
        telegram_username = str(auth_data.get('username', '')).strip()
        photo_url = str(auth_data.get('photo_url', '')).strip()

        user = User.objects.filter(telegram_id=telegram_id).first()
        if not user:
            base_username = f"tg_{telegram_id}"
            username = base_username
            suffix = 1
            while User.objects.filter(username=username).exists():
                suffix += 1
                username = f"{base_username}_{suffix}"

            user = User(
                username=username,
                first_name=first_name or telegram_username or 'Telegram',
                last_name=last_name,
                role='customer',
                telegram_id=telegram_id,
            )
            user.set_unusable_password()
        elif not user.is_active:
            return Response({'detail': 'This account is disabled.'}, status=status.HTTP_400_BAD_REQUEST)

        user.telegram_username = telegram_username
        user.telegram_photo_url = photo_url
        user.telegram_auth_date = auth_datetime
        if first_name:
            user.first_name = first_name
        if last_name:
            user.last_name = last_name
        user.save()

        refresh = RefreshToken.for_user(user)
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': UserSerializer(user, context={'request': request}).data,
        })

    def _verify_telegram_hash(self, auth_data, bot_token, telegram_hash):
        pairs = []
        for key, value in auth_data.items():
            if key == 'hash' or value in [None, '']:
                continue
            pairs.append(f"{key}={value}")

        data_check_string = '\n'.join(sorted(pairs))
        secret_key = hashlib.sha256(bot_token.encode()).digest()
        expected_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected_hash, telegram_hash)


class TelegramLoginConfigView(generics.GenericAPIView):
    permission_classes = [AllowAny]

    def get(self, request):
        from apps.notifications.services import TelegramService
        telegram_service = TelegramService()
        bot_username = telegram_service.get_bot_username()
        bot_token = telegram_service.get_bot_token()
        return Response({
            'bot_username': bot_username,
            'configured': bool(bot_username and bot_token),
        })


class GoogleLoginConfigView(generics.GenericAPIView):
    permission_classes = [AllowAny]

    def get(self, request):
        client_id = getattr(settings, 'GOOGLE_OAUTH_CLIENT_ID', '')
        return Response({
            'client_id': client_id,
            'configured': bool(client_id),
        })


class GoogleLoginView(generics.GenericAPIView):
    permission_classes = [AllowAny]

    def post(self, request):
        credential = str(request.data.get('credential', '')).strip()
        client_id = getattr(settings, 'GOOGLE_OAUTH_CLIENT_ID', '')

        if not client_id:
            return Response({'detail': 'Google login is not configured.'}, status=status.HTTP_400_BAD_REQUEST)

        if not credential:
            return Response({'detail': 'Google login credential is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            response = requests.get(
                'https://oauth2.googleapis.com/tokeninfo',
                params={'id_token': credential},
                timeout=8,
            )
            payload = response.json()
        except Exception:
            return Response({'detail': 'Google login could not be verified.'}, status=status.HTTP_400_BAD_REQUEST)

        if response.status_code != 200:
            return Response({'detail': payload.get('error_description') or 'Google login is invalid.'}, status=status.HTTP_400_BAD_REQUEST)

        if payload.get('aud') != client_id:
            return Response({'detail': 'Google login client does not match this site.'}, status=status.HTTP_400_BAD_REQUEST)

        google_id = str(payload.get('sub', '')).strip()
        email = str(payload.get('email', '')).strip().lower()
        email_verified = str(payload.get('email_verified', '')).lower() == 'true'

        if not google_id:
            return Response({'detail': 'Google account ID is missing.'}, status=status.HTTP_400_BAD_REQUEST)

        if email and not email_verified:
            return Response({'detail': 'Google email is not verified.'}, status=status.HTTP_400_BAD_REQUEST)

        first_name = str(payload.get('given_name', '')).strip()
        last_name = str(payload.get('family_name', '')).strip()
        display_name = str(payload.get('name', '')).strip()
        picture_url = str(payload.get('picture', '')).strip()

        user = User.objects.filter(google_id=google_id).first()
        if not user and email:
            user = User.objects.filter(email__iexact=email).first()

        if not user:
            base_username = email.split('@')[0] if email else f"google_{google_id}"
            username = base_username[:140] or f"google_{google_id}"
            suffix = 1
            while User.objects.filter(username=username).exists():
                suffix += 1
                username = f"{base_username[:130]}_{suffix}"

            if not first_name and display_name:
                first_name = display_name.split(' ', 1)[0]
                last_name = display_name.split(' ', 1)[1] if ' ' in display_name else ''

            user = User(
                username=username,
                email=email,
                first_name=first_name or 'Google',
                last_name=last_name,
                role='customer',
                google_id=google_id,
            )
            user.set_unusable_password()
        elif not user.is_active:
            return Response({'detail': 'This account is disabled.'}, status=status.HTTP_400_BAD_REQUEST)

        user.google_id = google_id
        user.google_picture_url = picture_url
        user.google_auth_date = timezone.now()
        if email and not user.email:
            user.email = email
        if first_name:
            user.first_name = first_name
        if last_name:
            user.last_name = last_name
        user.save()

        refresh = RefreshToken.for_user(user)
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': UserSerializer(user, context={'request': request}).data,
        })


class TelegramVerificationStartView(generics.GenericAPIView):
    permission_classes = [AllowAny]

    def post(self, request):
        phone = str(request.data.get('phone', '')).strip()
        if not phone:
            return Response({'detail': 'Phone number is required.'}, status=status.HTTP_400_BAD_REQUEST)

        token = secrets.token_urlsafe(24)
        verification = TelegramVerification.objects.create(
            phone=phone,
            token=token,
            expires_at=timezone.now() + timedelta(minutes=10),
        )
        from apps.notifications.services import TelegramService
        bot_username = TelegramService().get_bot_username()
        bot_link = f"https://t.me/{bot_username}?start=verify_{token}" if bot_username else ''
        return Response({
            'token': verification.token,
            'bot_username': bot_username,
            'bot_link': bot_link,
            'configured': bool(bot_link),
            'expires_at': verification.expires_at,
        })


class TelegramVerificationStatusView(generics.GenericAPIView):
    permission_classes = [AllowAny]

    def get(self, request):
        token = request.query_params.get('token', '')
        verification = TelegramVerification.objects.filter(token=token).first()
        if not verification:
            return Response({'detail': 'Verification not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response({
            'has_chat': bool(verification.telegram_chat_id),
            'verified': verification.is_verified,
            'expired': verification.is_expired,
        })


class TelegramVerificationConfirmView(generics.GenericAPIView):
    permission_classes = [AllowAny]

    def post(self, request):
        token = request.data.get('token', '')
        otp = str(request.data.get('otp', '')).strip()
        verification = TelegramVerification.objects.filter(token=token).first()
        if not verification:
            return Response({'detail': 'Verification not found.'}, status=status.HTTP_404_NOT_FOUND)
        if verification.is_expired:
            return Response({'detail': 'Verification expired.'}, status=status.HTTP_400_BAD_REQUEST)
        if not verification.otp_code:
            return Response({'detail': 'Open the Telegram bot first.'}, status=status.HTTP_400_BAD_REQUEST)
        if otp != verification.otp_code:
            return Response({'detail': 'Invalid OTP code.'}, status=status.HTTP_400_BAD_REQUEST)

        verification.is_verified = True
        verification.verified_at = timezone.now()
        verification.save(update_fields=['is_verified', 'verified_at'])
        return Response({'verified': True, 'phone': verification.phone})


class TelegramWebhookView(generics.GenericAPIView):
    permission_classes = [AllowAny]

    def post(self, request):
        message = request.data.get('message') or {}
        text = message.get('text', '')
        chat = message.get('chat') or {}
        user = message.get('from') or {}

        if not text.startswith('/start verify_'):
            return Response({'ok': True})

        token = text.replace('/start verify_', '', 1).strip()
        verification = TelegramVerification.objects.filter(token=token).first()
        if not verification or verification.is_expired:
            return Response({'ok': True})

        otp = ''.join(random.choice(string.digits) for _ in range(6))
        verification.telegram_chat_id = str(chat.get('id', ''))
        verification.telegram_user_id = str(user.get('id', ''))
        verification.telegram_username = user.get('username', '') or ''
        verification.otp_code = otp
        verification.save(update_fields=[
            'telegram_chat_id', 'telegram_user_id', 'telegram_username', 'otp_code'
        ])

        from apps.notifications.services import TelegramService
        TelegramService().send_message(
            (
                f"<b>Shadow Shop verification</b>\n"
                f"Phone: <code>{verification.phone}</code>\n"
                f"Your OTP code is: <b>{otp}</b>\n\n"
                f"If you did not request this, ignore this message."
            ),
            event_type='telegram_otp',
            chat_id=verification.telegram_chat_id,
        )
        return Response({'ok': True})


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_object(self):
        return self.request.user


class ChangePasswordView(generics.UpdateAPIView):
    serializer_class = ChangePasswordSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        return Response({'detail': 'Password changed successfully.'})


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('-created_at')
    permission_classes = [IsAuthenticated, IsAdminOrSuperAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['role', 'is_active']
    search_fields = ['username', 'first_name', 'last_name', 'email', 'phone']
    ordering_fields = ['created_at', 'username']

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        return UserSerializer

    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        user = self.get_object()
        user.is_active = not user.is_active
        user.save()
        return Response({'is_active': user.is_active})

    @action(detail=True, methods=['post'])
    def reset_password(self, request, pk=None):
        user = self.get_object()
        new_password = request.data.get('password')
        if not new_password or len(new_password) < 8:
            return Response(
                {'detail': 'Password must be at least 8 characters.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        user.set_password(new_password)
        user.save()
        return Response({'detail': 'Password reset successfully.'})


class PermissionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Permission.objects.all()
    serializer_class = PermissionSerializer
    permission_classes = [IsAuthenticated, IsAdminOrSuperAdmin]
    pagination_class = None


class RoleViewSet(viewsets.ModelViewSet):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [IsAuthenticated, IsAdminOrSuperAdmin]
    pagination_class = None

    def destroy(self, request, *args, **kwargs):
        role = self.get_object()
        if role.is_system:
            return Response({'detail': 'System roles cannot be deleted.'}, status=400)
        RolePermission.objects.filter(role=role.name).delete()
        return super().destroy(request, *args, **kwargs)


class RolePermissionViewSet(viewsets.ModelViewSet):
    serializer_class = RolePermissionSerializer
    pagination_class = None
    filterset_fields = ['role']

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'by_role']:
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsAdminOrSuperAdmin()]

    def get_queryset(self):
        user = self.request.user
        if user.role in ['super_admin', 'admin']:
            return RolePermission.objects.all().select_related('permission')
        # Non-admin staff can only read their own role's permissions
        return RolePermission.objects.filter(role=user.role).select_related('permission')

    @action(detail=False, methods=['get'])
    def by_role(self, request):
        role = request.query_params.get('role')
        if role:
            if request.user.role not in ['super_admin', 'admin'] and role != request.user.role:
                return Response({'detail': 'You can only view your own role permissions.'}, status=403)
            perms = RolePermission.objects.filter(role=role, granted=True).select_related('permission')
            serializer = self.get_serializer(perms, many=True)
            return Response(serializer.data)
        return Response([])

    def create(self, request, *args, **kwargs):
        role = request.data.get('role')
        permission_id = request.data.get('permission')
        granted = request.data.get('granted', True)
        if not role or not permission_id:
            return Response({'detail': 'role and permission are required.'}, status=400)
        try:
            permission = Permission.objects.get(pk=permission_id)
        except Permission.DoesNotExist:
            return Response({'permission': ['Invalid permission.']}, status=400)

        role_permission, _ = RolePermission.objects.update_or_create(
            role=role,
            permission=permission,
            defaults={'granted': granted},
        )
        serializer = self.get_serializer(role_permission)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'])
    def reset_defaults(self, request):
        from apps.accounts.management.commands.seed_role_permissions import DEFAULTS
        role = request.data.get('role')
        if not role:
            return Response({'detail': 'role is required.'}, status=400)

        RolePermission.objects.filter(role=role).delete()

        spec = DEFAULTS.get(role)
        if not spec:
            return Response({'detail': f'No defaults defined for role "{role}". All permissions cleared.'})

        all_perms = {(p.module, p.action): p for p in Permission.objects.all()}
        pairs = list(all_perms.keys()) if spec == '__all__' else spec
        created = 0
        for module, action in pairs:
            perm = all_perms.get((module, action))
            if perm:
                RolePermission.objects.create(role=role, permission=perm, granted=True)
                created += 1

        return Response({'detail': f'Reset to defaults: {created} permissions applied.'})


class ActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ActivityLog.objects.all().select_related('user')
    serializer_class = ActivityLogSerializer
    permission_classes = [IsAuthenticated, IsAdminOrSuperAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['action', 'module', 'user']
    search_fields = ['description', 'user__username']
    ordering_fields = ['created_at']


class TelegramOTPLoginView(generics.GenericAPIView):
    permission_classes = [AllowAny]

    def post(self, request):
        token = request.data.get('token', '').strip()
        otp = str(request.data.get('otp', '')).strip()

        verification = TelegramVerification.objects.filter(token=token).first()
        if not verification:
            return Response({'detail': 'Verification not found.'}, status=status.HTTP_404_NOT_FOUND)
        if verification.is_expired:
            return Response({'detail': 'Verification expired.'}, status=status.HTTP_400_BAD_REQUEST)
        if not verification.otp_code:
            return Response({'detail': 'Open the Telegram bot first.'}, status=status.HTTP_400_BAD_REQUEST)
        if otp != verification.otp_code:
            return Response({'detail': 'Invalid OTP code.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(phone=verification.phone, is_active=True).first()
        if not user:
            return Response({'detail': 'No account found with this phone number. Please register first.'}, status=status.HTTP_404_NOT_FOUND)

        verification.is_verified = True
        verification.verified_at = timezone.now()
        verification.save(update_fields=['is_verified', 'verified_at'])

        refresh = RefreshToken.for_user(user)
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': UserSerializer(user, context={'request': request}).data,
        })


class AddressViewSet(viewsets.ModelViewSet):
    serializer_class = AddressSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Address.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'])
    def set_default(self, request, pk=None):
        address = self.get_object()
        address.is_default = True
        address.save()
        return Response({'detail': 'Default address updated.'})


class DashboardStatsView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.utils import timezone
        from apps.orders.models import Order
        from apps.inventory.models import Stock
        import datetime

        today = timezone.now().date()

        today_orders = Order.objects.filter(created_at__date=today)
        today_sales = sum(o.grand_total for o in today_orders.filter(payment_status='paid'))
        today_profit = sum(o.profit for o in today_orders.filter(payment_status='paid'))

        low_stock = Stock.objects.filter(quantity__gt=0, quantity__lte=5).count()
        out_of_stock = Stock.objects.filter(quantity__lte=0).count()

        return Response({
            'today_orders': today_orders.count(),
            'pending_orders': Order.objects.filter(status='new').count(),
            'packing_orders': Order.objects.filter(status='preparing').count(),
            'ready_to_ship': Order.objects.filter(status='packed').count(),
            'today_sales': float(today_sales),
            'today_profit': float(today_profit),
            'low_stock': low_stock,
            'out_of_stock': out_of_stock,
            'total_customers': request.user.__class__.objects.filter(role='customer').count(),
        })


class SiteSettingsView(generics.RetrieveUpdateAPIView):
    serializer_class = SiteSettingsSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsAuthenticated(), IsAdminOrSuperAdmin()]

    def get_object(self):
        return SiteSettings.get_solo()


class SiteSettingsManifestView(generics.GenericAPIView):
    permission_classes = [AllowAny]

    def get(self, request):
        site_settings = SiteSettings.get_solo()
        store_name = site_settings.store_name or 'Shadow Shop'

        icon_src = request.build_absolute_uri('/api/auth/site-settings/favicon/')
        source_name = ''
        if site_settings.favicon:
            source_name = site_settings.favicon.name
        elif site_settings.logo:
            source_name = site_settings.logo.name

        icon_type = mimetypes.guess_type(source_name)[0] or 'image/png'
        icon_sizes = 'any' if icon_type == 'image/svg+xml' else '512x512'

        return JsonResponse({
            'name': store_name,
            'short_name': store_name[:12] or 'Shadow',
            'description': 'Beauty and lifestyle shopping app.',
            'start_url': '/',
            'scope': '/',
            'display': 'standalone',
            'display_override': ['fullscreen', 'standalone', 'minimal-ui'],
            'orientation': 'portrait',
            'background_color': '#ffffff',
            'theme_color': '#E91E63',
            'categories': ['shopping', 'lifestyle', 'beauty'],
            'icons': [
                {
                    'src': icon_src,
                    'sizes': icon_sizes,
                    'type': icon_type,
                    'purpose': 'any',
                },
                {
                    'src': icon_src,
                    'sizes': icon_sizes,
                    'type': icon_type,
                    'purpose': 'any maskable',
                },
            ],
        }, content_type='application/manifest+json')


class SiteSettingsFaviconView(generics.GenericAPIView):
    permission_classes = [AllowAny]

    def get(self, request):
        site_settings = SiteSettings.get_solo()
        if site_settings.favicon:
            return HttpResponseRedirect(site_settings.favicon.url)
        if site_settings.logo:
            return HttpResponseRedirect(site_settings.logo.url)
        return HttpResponseRedirect('/app-icon-512.png')
