from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.utils import timezone
from .models import DeliveryCompany, Delivery, DeliveryStatusHistory, DeliveryByConfig
from .serializers import (
    DeliveryCompanySerializer, DeliverySerializer, DeliveryCreateSerializer,
    DeliveryStatusHistorySerializer, DeliveryByConfigSerializer,
)
from utils.permissions import IsAdminOrSuperAdmin, IsStaff, IsDelivery


class DeliveryByConfigViewSet(viewsets.ModelViewSet):
    queryset = DeliveryByConfig.objects.all()
    serializer_class = DeliveryByConfigSerializer
    permission_classes = [IsAuthenticated, IsAdminOrSuperAdmin]

    @action(detail=True, methods=['post'], url_path='toggle_telegram')
    def toggle_telegram(self, request, pk=None):
        obj = self.get_object()
        obj.telegram_enabled = not obj.telegram_enabled
        obj.save()
        return Response(DeliveryByConfigSerializer(obj).data)

    @action(detail=True, methods=['post'], url_path='toggle_status')
    def toggle_status(self, request, pk=None):
        obj = self.get_object()
        obj.is_active = not obj.is_active
        obj.save()
        return Response(DeliveryByConfigSerializer(obj).data)

    @action(detail=True, methods=['post'], url_path='test_bot')
    def test_bot(self, request, pk=None):
        obj = self.get_object()
        if not obj.telegram_group:
            return Response({'detail': 'Telegram group not set.'}, status=400)
        try:
            from apps.notifications.services import TelegramService
            TelegramService().send_message(
                chat_id=obj.telegram_group,
                text=f'✅ Test message from Shadow Shop — Delivery: {obj.name}',
                message_thread_id=obj.telegram_topic,
            )
            return Response({'detail': 'Test message sent!'})
        except Exception as e:
            return Response({'detail': str(e)}, status=400)


class DeliveryCompanyViewSet(viewsets.ModelViewSet):
    queryset = DeliveryCompany.objects.filter(is_active=True)
    serializer_class = DeliveryCompanySerializer
    permission_classes = [IsAuthenticated, IsAdminOrSuperAdmin]


class DeliveryViewSet(viewsets.ModelViewSet):
    queryset = Delivery.objects.all().select_related(
        'order__customer', 'company', 'assigned_to'
    ).prefetch_related('status_history').order_by('-created_at')
    permission_classes = [IsAuthenticated, IsStaff]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'company', 'assigned_to']
    search_fields = ['order__order_number', 'tracking_number', 'recipient_name']

    def get_serializer_class(self):
        if self.action == 'create':
            return DeliveryCreateSerializer
        return DeliverySerializer

    def perform_create(self, serializer):
        delivery = serializer.save(assigned_by=self.request.user)
        delivery.order.status = 'shipped'
        delivery.order.save()

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        delivery = self.get_object()
        new_status = request.data.get('status')
        note = request.data.get('note', '')
        location = request.data.get('location', '')

        valid_statuses = [s[0] for s in Delivery.STATUS_CHOICES]
        if new_status not in valid_statuses:
            return Response({'detail': 'Invalid status.'}, status=status.HTTP_400_BAD_REQUEST)

        delivery.status = new_status
        if new_status == 'shipped':
            delivery.shipped_at = timezone.now()
        elif new_status == 'delivered':
            delivery.delivered_at = timezone.now()
            delivery.order.status = 'completed'
            delivery.order.save()
        delivery.save()

        DeliveryStatusHistory.objects.create(
            delivery=delivery, status=new_status,
            note=note, location=location, changed_by=request.user,
        )

        from apps.notifications.services import TelegramService
        TelegramService().notify_delivery_update(delivery)

        return Response(DeliverySerializer(delivery, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def assign_driver(self, request, pk=None):
        delivery = self.get_object()
        driver_id = request.data.get('driver_id')
        from django.contrib.auth import get_user_model
        User = get_user_model()
        try:
            driver = User.objects.get(id=driver_id, role='delivery')
            delivery.assigned_to = driver
            delivery.assigned_by = request.user
            delivery.save()
            return Response({'detail': 'Driver assigned successfully.'})
        except User.DoesNotExist:
            return Response({'detail': 'Driver not found.'}, status=status.HTTP_404_NOT_FOUND)
