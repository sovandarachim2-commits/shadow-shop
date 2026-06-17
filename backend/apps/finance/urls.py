from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('expense-categories', views.ExpenseCategoryViewSet, basename='expense-categories')
router.register('expenses', views.ExpenseViewSet, basename='expenses')
router.register('revenue', views.RevenueViewSet, basename='revenue')
router.register('daily-summary', views.DailySummaryViewSet, basename='daily-summary')

urlpatterns = [
    path('', include(router.urls)),
]
