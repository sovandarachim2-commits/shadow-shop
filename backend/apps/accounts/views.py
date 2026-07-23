from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.conf import settings
from django.utils import timezone
from django.core.mail import send_mail
from django.core.mail import BadHeaderError
from django.db import transaction
from django.contrib.auth.hashers import make_password
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
import hashlib
import hmac
import secrets
import random
import string
import mimetypes
import requests
import smtplib
from datetime import datetime, timedelta
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.http import HttpResponseRedirect, JsonResponse
from .models import Permission, Role, RolePermission, ActivityLog, TelegramVerification, EmailVerification, PendingRegistration, Address, SiteSettings
from .serializers import (
    CustomTokenObtainPairSerializer, UserSerializer, UserCreateSerializer,
    ChangePasswordSerializer, SetInitialPasswordSerializer, CustomerRegisterSerializer, PermissionSerializer, RoleSerializer,
    RolePermissionSerializer, ActivityLogSerializer, AddressSerializer, SiteSettingsSerializer,
)
from utils.permissions import IsAdminOrSuperAdmin, IsSuperAdmin

User = get_user_model()


def _verification_code():
    return ''.join(random.choice(string.digits) for _ in range(4))


def _absolute_media_url(file_field):
    if not file_field:
        return None
    url = file_field.url
    if url.startswith(('http://', 'https://')):
        return url
    base = (getattr(settings, 'BACKEND_URL', None) or getattr(settings, 'FRONTEND_URL', None) or '').rstrip('/')
    if not base:
        return url
    return f"{base}{url if url.startswith('/') else f'/{url}'}"


def _send_email_verification(email, code, purpose='account'):
    from email.utils import formataddr
    from django.utils.html import escape

    site = SiteSettings.get_solo()
    store_name = site.store_name or 'Shadow Shop'
    is_password_reset = purpose == 'password_reset'
    subject = f"{store_name} {'password reset' if is_password_reset else 'verification'} code"
    ignore_text = (
        "If you did not request a password reset, you can ignore this email."
        if is_password_reset
        else "If you did not create an account, you can ignore this email."
    )
    message = (
        f"Your {store_name} verification code is {code}.\n\n"
        f"This code expires in 10 minutes. {ignore_text}"
    )
    store_email = (site.store_email or '').strip()
    if store_email:
        from_email = formataddr((store_name, store_email))
    else:
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', None) or 'no-reply@localhost'

    logo_url = _absolute_media_url(site.login_logo) or _absolute_media_url(site.logo)
    safe_name = escape(store_name)
    safe_code = escape(str(code))
    logo_block = ''
    if logo_url:
        safe_logo = escape(logo_url)
        logo_block = (
            f'<div style="margin:0 0 20px;text-align:center">'
            f'<img src="{safe_logo}" alt="{safe_name}" width="72" height="72" '
            f'style="width:72px;height:72px;border-radius:50%;object-fit:cover;display:inline-block;border:2px solid #f3f4f6" />'
            f'</div>'
        )

    html_message = f'''
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:440px;margin:0 auto;padding:28px 20px;color:#111827">
      {logo_block}
      <p style="margin:0 0 8px;font-size:18px;font-weight:700;text-align:center">{safe_name}</p>
      <p style="margin:0 0 20px;font-size:14px;line-height:1.5;color:#4b5563;text-align:center">
        Your verification code is
      </p>
      <p style="margin:0 0 20px;font-size:32px;font-weight:800;letter-spacing:8px;text-align:center;color:#db2777">
        {safe_code}
      </p>
      <p style="margin:0;font-size:13px;line-height:1.5;color:#6b7280;text-align:center">
        This code expires in 10 minutes. {escape(ignore_text)}
      </p>
    </div>
    '''

    send_mail(
        subject,
        message,
        from_email,
        [email],
        fail_silently=False,
        html_message=html_message,
    )


def _create_email_verification(user, request=None):
    code = ''.join(random.choice(string.digits) for _ in range(4))
    verification = EmailVerification.objects.create(
        user=user,
        email=(user.email or '').strip().lower(),
        code=code,
        expires_at=timezone.now() + timedelta(minutes=10),
    )
    _send_email_verification(verification.email, code)
    return verification


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
        validated = serializer.validated_data.copy()
        email = str(validated.get('email', '')).strip().lower()
        username = str(validated.get('username') or email).strip()
        password = validated.pop('password')
        validated.update({
            'email': email,
            'username': username,
            'role': 'customer',
            'phone': validated.get('phone', ''),
        })
        code = _verification_code()
        with transaction.atomic():
            PendingRegistration.objects.update_or_create(
                email=email,
                defaults={
                    'data': validated,
                    'password_hash': make_password(password),
                    'code': code,
                    'attempts': 0,
                    'is_verified': False,
                    'expires_at': timezone.now() + timedelta(minutes=10),
                    'verified_at': None,
                },
            )
            _send_email_verification(email, code)
        return Response({
            'detail': 'Verification code sent.',
            'email': email,
        }, status=status.HTTP_201_CREATED)


class EmailVerificationResendView(generics.GenericAPIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = str(request.data.get('email', '')).strip().lower()
        if not email:
            return Response({'detail': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(email__iexact=email, role='customer').exists():
            return Response({'detail': 'This email is already verified.'}, status=status.HTTP_400_BAD_REQUEST)

        pending = PendingRegistration.objects.filter(email__iexact=email, is_verified=False).first()
        if not pending:
            return Response({'detail': 'No pending verification found for this email. Please register again.'}, status=status.HTTP_404_NOT_FOUND)

        if pending.updated_at >= timezone.now() - timedelta(seconds=45):
            return Response({'detail': 'Please wait before requesting another code.'}, status=status.HTTP_429_TOO_MANY_REQUESTS)

        pending.code = _verification_code()
        pending.attempts = 0
        pending.expires_at = timezone.now() + timedelta(minutes=10)
        pending.save(update_fields=['code', 'attempts', 'expires_at', 'updated_at'])
        _send_email_verification(email, pending.code)
        return Response({'detail': 'Verification code sent.', 'email': email})


class EmailVerificationConfirmView(generics.GenericAPIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = str(request.data.get('email', '')).strip().lower()
        code = ''.join(ch for ch in str(request.data.get('code', '')).strip() if ch.isdigit())
        if not email or len(code) != 4:
            return Response({'detail': 'Enter the 4 digit verification code.'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(email__iexact=email, role='customer').exists():
            return Response({'detail': 'This email is already verified. Please login.'}, status=status.HTTP_400_BAD_REQUEST)

        pending = PendingRegistration.objects.filter(email__iexact=email, is_verified=False).first()
        if not pending:
            return Response({'detail': 'Verification code not found. Please resend a new code.'}, status=status.HTTP_404_NOT_FOUND)
        if pending.is_expired:
            return Response({'detail': 'Verification code expired. Please resend a new code.'}, status=status.HTTP_400_BAD_REQUEST)
        if pending.attempts >= 5:
            return Response({'detail': 'Too many attempts. Please resend a new code.'}, status=status.HTTP_429_TOO_MANY_REQUESTS)

        if pending.code != code:
            pending.attempts += 1
            pending.save(update_fields=['attempts', 'updated_at'])
            return Response({'detail': 'Invalid verification code.'}, status=status.HTTP_400_BAD_REQUEST)

        data = pending.data or {}
        username = data.get('username') or email
        with transaction.atomic():
            if User.objects.filter(email__iexact=email, is_active=True).exists():
                return Response({'detail': 'This email is already verified. Please login.'}, status=status.HTTP_400_BAD_REQUEST)
            if User.objects.filter(username__iexact=username, is_active=True).exists():
                return Response({'detail': 'An account with this username already exists.'}, status=status.HTTP_400_BAD_REQUEST)
            User.objects.filter(
                email__iexact=email,
                role='customer',
                is_active=False,
            ).delete()
            User.objects.filter(
                username__iexact=username,
                role='customer',
                is_active=False,
            ).delete()
            user = User(
                username=username,
                email=email,
                first_name=data.get('first_name', ''),
                last_name=data.get('last_name', ''),
                phone=data.get('phone', ''),
                role='customer',
                is_active=True,
                password=pending.password_hash,
            )
            user.save()
            pending.is_verified = True
            pending.verified_at = timezone.now()
            pending.save(update_fields=['is_verified', 'verified_at', 'updated_at'])

        refresh = RefreshToken.for_user(user)
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': UserSerializer(user, context={'request': request}).data,
        })


def _latest_password_reset_verification(email):
    return EmailVerification.objects.select_related('user').filter(
        email__iexact=email,
        user__is_active=True,
    ).order_by('-created_at').first()


class ForgotPasswordRequestView(generics.GenericAPIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = str(request.data.get('email', '')).strip().lower()
        if not email:
            return Response({'detail': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(email__iexact=email, is_active=True).first()
        if not user:
            return Response({'detail': 'No account found with this email.'}, status=status.HTTP_404_NOT_FOUND)

        latest = _latest_password_reset_verification(email)
        if latest and latest.created_at >= timezone.now() - timedelta(seconds=45):
            return Response({'detail': 'Please wait before requesting another code.'}, status=status.HTTP_429_TOO_MANY_REQUESTS)

        code = _verification_code()
        EmailVerification.objects.create(
            user=user,
            email=email,
            code=code,
            attempts=0,
            is_verified=False,
            expires_at=timezone.now() + timedelta(minutes=10),
        )
        try:
            _send_email_verification(email, code, purpose='password_reset')
        except (BadHeaderError, smtplib.SMTPException, OSError):
            return Response(
                {'detail': 'Could not send reset email. Please check email settings and try again.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response({
            'detail': 'Password reset code has been sent.',
            'email': email,
        })


class ForgotPasswordVerifyCodeView(generics.GenericAPIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = str(request.data.get('email', '')).strip().lower()
        code = ''.join(ch for ch in str(request.data.get('code', '')).strip() if ch.isdigit())
        if not email or len(code) != 4:
            return Response({'detail': 'Enter the 4 digit verification code.'}, status=status.HTTP_400_BAD_REQUEST)

        verification = _latest_password_reset_verification(email)
        if not verification:
            return Response({'detail': 'Verification code not found. Please request a new code.'}, status=status.HTTP_404_NOT_FOUND)
        if verification.is_expired:
            return Response({'detail': 'Verification code expired. Please request a new code.'}, status=status.HTTP_400_BAD_REQUEST)
        if verification.attempts >= 5:
            return Response({'detail': 'Too many attempts. Please request a new code.'}, status=status.HTTP_429_TOO_MANY_REQUESTS)

        if verification.code != code:
            verification.attempts += 1
            verification.save(update_fields=['attempts'])
            return Response({'detail': 'Invalid verification code.'}, status=status.HTTP_400_BAD_REQUEST)

        verification.is_verified = True
        verification.verified_at = timezone.now()
        verification.save(update_fields=['is_verified', 'verified_at'])
        return Response({'detail': 'Code verified.', 'email': email})


class ForgotPasswordResetView(generics.GenericAPIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = str(request.data.get('email', '')).strip().lower()
        code = ''.join(ch for ch in str(request.data.get('code', '')).strip() if ch.isdigit())
        password = str(request.data.get('password', ''))
        confirm_password = str(request.data.get('confirm_password', request.data.get('confirmPassword', '')))

        if not email or len(code) != 4:
            return Response({'detail': 'Enter the 4 digit verification code.'}, status=status.HTTP_400_BAD_REQUEST)
        if len(password) < 8:
            return Response({'detail': 'Password must be at least 8 characters.'}, status=status.HTTP_400_BAD_REQUEST)
        if password != confirm_password:
            return Response({'detail': 'Passwords do not match.'}, status=status.HTTP_400_BAD_REQUEST)

        verification = _latest_password_reset_verification(email)
        if not verification or verification.code != code:
            return Response({'detail': 'Verification code not found. Please request a new code.'}, status=status.HTTP_404_NOT_FOUND)
        if verification.is_expired:
            return Response({'detail': 'Verification code expired. Please request a new code.'}, status=status.HTTP_400_BAD_REQUEST)
        if not verification.is_verified:
            return Response({'detail': 'Please verify the code first.'}, status=status.HTTP_400_BAD_REQUEST)

        user = verification.user
        user.set_password(password)
        user.save(update_fields=['password'])
        verification.expires_at = timezone.now()
        verification.save(update_fields=['expires_at'])
        return Response({'detail': 'Password reset successfully.'})


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
        from utils.storefront_cache import safe_cache_get, safe_cache_set

        cache_key = 'auth:telegram_login_config:v1'
        cached = safe_cache_get(cache_key)
        if cached is not None:
            return Response(cached)

        telegram_service = TelegramService()
        # Never block login on live Telegram getMe (up to 8s).
        bot_username = telegram_service.get_bot_username(allow_remote=False)
        bot_token = telegram_service.get_bot_token()
        payload = {
            'bot_username': bot_username,
            'configured': bool(bot_username and bot_token),
        }
        safe_cache_set(cache_key, payload, 120)
        return Response(payload)


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


class SetInitialPasswordView(generics.GenericAPIView):
    serializer_class = SetInitialPasswordSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        if user.has_usable_password():
            return Response({'detail': 'Password is already set.'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user.set_password(serializer.validated_data['password'])
        user.save(update_fields=['password'])
        return Response(UserSerializer(user, context={'request': request}).data)


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

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
        email = str(user.email or '').strip().lower()
        response = super().destroy(request, *args, **kwargs)
        if email:
            PendingRegistration.objects.filter(email__iexact=email).delete()
        return response


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

    def retrieve(self, request, *args, **kwargs):
        from utils.storefront_cache import SITE_SETTINGS_CACHE_KEY, SITE_SETTINGS_TTL, safe_cache_get, safe_cache_set

        cached = safe_cache_get(SITE_SETTINGS_CACHE_KEY)
        if cached is not None:
            return Response(cached)

        instance = self.get_object()
        data = self.get_serializer(instance).data
        safe_cache_set(SITE_SETTINGS_CACHE_KEY, data, SITE_SETTINGS_TTL)
        return Response(data)

    def perform_update(self, serializer):
        from utils.storefront_cache import bump_storefront_cache
        serializer.save()
        bump_storefront_cache()


class SiteSettingsManifestView(generics.GenericAPIView):
    permission_classes = [AllowAny]

    def get(self, request):
        from utils.storefront_cache import safe_cache_get, safe_cache_set

        cache_key = 'auth:site_manifest:v1'
        cached = safe_cache_get(cache_key)
        if cached is not None:
            return JsonResponse(cached, content_type='application/manifest+json')

        site_settings = SiteSettings.get_solo()
        store_name = site_settings.store_name or 'Shadow Shop'

        icon_src = request.build_absolute_uri('/app-icon-512.png')
        if site_settings.favicon:
            icon_src = site_settings.favicon.url
            if icon_src.startswith('/'):
                icon_src = request.build_absolute_uri(icon_src)
        elif site_settings.logo:
            icon_src = site_settings.logo.url
            if icon_src.startswith('/'):
                icon_src = request.build_absolute_uri(icon_src)

        source_name = ''
        if site_settings.favicon:
            source_name = site_settings.favicon.name
        elif site_settings.logo:
            source_name = site_settings.logo.name

        icon_type = mimetypes.guess_type(source_name)[0] or 'image/png'
        icon_sizes = 'any' if icon_type == 'image/svg+xml' else '512x512'

        payload = {
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
        }
        safe_cache_set(cache_key, payload, 300)
        return JsonResponse(payload, content_type='application/manifest+json')


class SiteSettingsFaviconView(generics.GenericAPIView):
    permission_classes = [AllowAny]

    def get(self, request):
        from utils.storefront_cache import safe_cache_get, safe_cache_set

        cache_key = 'auth:site_favicon_url:v1'
        cached = safe_cache_get(cache_key)
        if cached:
            return HttpResponseRedirect(cached)

        site_settings = SiteSettings.get_solo()
        target = '/app-icon-512.png'
        if site_settings.favicon:
            target = site_settings.favicon.url
        elif site_settings.logo:
            target = site_settings.logo.url
        safe_cache_set(cache_key, target, 300)
        return HttpResponseRedirect(target)
