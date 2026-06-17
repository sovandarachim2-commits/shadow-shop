from django.urls import path
from . import views

urlpatterns = [
    path('sales/', views.SalesReportView.as_view(), name='sales-report'),
    path('products/', views.ProductReportView.as_view(), name='product-report'),
    path('inventory/', views.InventoryReportView.as_view(), name='inventory-report'),
]
