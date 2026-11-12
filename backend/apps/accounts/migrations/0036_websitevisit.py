from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0035_marketing_poster_permission'),
    ]

    operations = [
        migrations.CreateModel(
            name='WebsiteVisit',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('visitor_id', models.CharField(db_index=True, max_length=64)),
                ('path', models.CharField(db_index=True, max_length=255)),
                ('referrer', models.CharField(blank=True, default='', max_length=255)),
                ('device_type', models.CharField(default='desktop', max_length=20)),
                ('browser', models.CharField(blank=True, default='', max_length=50)),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True)),
                ('user_agent', models.CharField(blank=True, default='', max_length=255)),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                (
                    'user',
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name='website_visits',
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                'db_table': 'website_visits',
                'ordering': ['-created_at'],
                'indexes': [models.Index(fields=['created_at', 'visitor_id'], name='website_vis_created_3d07da_idx')],
            },
        ),
    ]

