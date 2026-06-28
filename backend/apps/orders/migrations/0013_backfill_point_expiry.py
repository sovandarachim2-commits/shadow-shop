from datetime import timedelta

from django.db import migrations


def backfill_point_expiry(apps, schema_editor):
    PointTransaction = apps.get_model('orders', 'PointTransaction')
    RewardSettings = apps.get_model('orders', 'RewardSettings')
    settings = RewardSettings.objects.filter(pk=1).first()
    if settings and not settings.expiration_enabled:
        return
    expiry_days = settings.points_expiry_days if settings else 365
    if not expiry_days:
        return
    for item in PointTransaction.objects.filter(points__gt=0, expires_at__isnull=True).iterator():
        item.expires_at = item.created_at + timedelta(days=expiry_days)
        item.save(update_fields=['expires_at'])


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0012_reward_automation_tiers_and_expiry'),
    ]

    operations = [
        migrations.RunPython(backfill_point_expiry, migrations.RunPython.noop),
    ]
