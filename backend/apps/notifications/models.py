from django.db import models
from django.conf import settings


class TelegramConfig(models.Model):
    name = models.CharField(max_length=100, default='Default')
    bot_username = models.CharField(max_length=100, blank=True)
    bot_token = models.CharField(max_length=200)
    chat_id = models.CharField(max_length=50)
    is_active = models.BooleanField(default=True)
    notify_new_order = models.BooleanField(default=True)
    notify_payment = models.BooleanField(default=True)
    notify_low_stock = models.BooleanField(default=True)
    notify_delivery = models.BooleanField(default=True)
    notify_daily_summary = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'telegram_configs'

    def __str__(self):
        return f"Telegram Config - {self.name}"


class NotificationLog(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('sent', 'Sent'),
        ('failed', 'Failed'),
    ]

    event_type = models.CharField(max_length=50)
    message = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    error_message = models.TextField(blank=True)
    recipient = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'notification_logs'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.event_type} - {self.status}"
