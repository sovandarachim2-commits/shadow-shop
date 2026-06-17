from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('telegram', views.TelegramConfigViewSet, basename='telegram')
router.register('logs', views.NotificationLogViewSet, basename='notification-logs')

urlpatterns = [
    path('', include(router.urls)),
]
