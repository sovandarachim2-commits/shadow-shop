from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import HttpResponseRedirect
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

@api_view(['GET'])
@permission_classes([AllowAny])
def api_root(request):
    return Response({
        'name': 'Shadow Shop API',
        'version': '1.0',
        'status': 'online',
        'documentation': request.build_absolute_uri('/api/docs/'),
        'endpoints': {
            'auth': request.build_absolute_uri('/api/auth/'),
            'products': request.build_absolute_uri('/api/products/'),
            'orders': request.build_absolute_uri('/api/orders/'),
            'inventory': request.build_absolute_uri('/api/inventory/'),
            'delivery': request.build_absolute_uri('/api/delivery/'),
            'notifications': request.build_absolute_uri('/api/notifications/'),
            'reports': request.build_absolute_uri('/api/reports/'),
            'payments': request.build_absolute_uri('/api/payments/'),
        }
    })

def root_redirect(request):
    return HttpResponseRedirect('/api/docs/')

urlpatterns = [
    path('', root_redirect),
    path('django-admin/', admin.site.urls),
    path('api/', api_root, name='api-root'),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    path('api/auth/', include('apps.accounts.urls')),
    path('api/products/', include('apps.products.urls')),
    path('api/orders/', include('apps.orders.urls')),
    path('api/inventory/', include('apps.inventory.urls')),
    path('api/delivery/', include('apps.delivery.urls')),
    path('api/finance/', include('apps.finance.urls')),
    path('api/notifications/', include('apps.notifications.urls')),
    path('api/reports/', include('apps.reports.urls')),
    path('api/payments/', include('apps.payments.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
