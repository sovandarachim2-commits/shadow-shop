from rest_framework import viewsets, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import TelegramConfig, NotificationLog
from .services import TelegramService
from utils.permissions import IsAdminOrSuperAdmin
from rest_framework import serializers


class TelegramConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = TelegramConfig
        fields = '__all__'


class NotificationLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationLog
        fields = '__all__'


class TelegramConfigViewSet(viewsets.ModelViewSet):
    queryset = TelegramConfig.objects.all()
    serializer_class = TelegramConfigSerializer
    permission_classes = [IsAuthenticated, IsAdminOrSuperAdmin]

    def _clear_telegram_login_cache(self):
        from django.core.cache import cache
        try:
            cache.delete('auth:telegram_login_config:v1')
        except Exception:
            pass

    def perform_create(self, serializer):
        serializer.save()
        self._clear_telegram_login_cache()

    def perform_update(self, serializer):
        serializer.save()
        self._clear_telegram_login_cache()

    def perform_destroy(self, instance):
        instance.delete()
        self._clear_telegram_login_cache()

    @action(detail=True, methods=['post'])
    def test(self, request, pk=None):
        config = self.get_object()
        service = TelegramService()
        service.config = config
        success = service.send_message('Shadow Shop test notification - connection successful.', 'test')
        return Response({
            'success': success,
            'detail': 'Test message sent.' if success else service.last_error_message,
        })


class NotificationLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = NotificationLog.objects.all().order_by('-created_at')
    serializer_class = NotificationLogSerializer
    permission_classes = [IsAuthenticated, IsAdminOrSuperAdmin]
