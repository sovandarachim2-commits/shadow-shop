from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('products', '0018_flash_sale_stock'),
    ]

    operations = [
        migrations.CreateModel(
            name='VideoHighlight',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=200)),
                ('video', models.FileField(blank=True, null=True, upload_to='video_highlights/videos/')),
                ('cover_image', models.ImageField(blank=True, null=True, upload_to='video_highlights/covers/')),
                ('product_label', models.CharField(blank=True, max_length=120)),
                ('product_label_km', models.CharField(blank=True, max_length=120)),
                ('caption', models.CharField(blank=True, max_length=255)),
                ('caption_km', models.CharField(blank=True, max_length=255)),
                ('original_video_url', models.URLField(blank=True, max_length=500)),
                ('display_order', models.PositiveIntegerField(default=0)),
                (
                    'status',
                    models.CharField(
                        choices=[('draft', 'Draft'), ('published', 'Published')],
                        default='draft',
                        max_length=20,
                    ),
                ),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                (
                    'created_by',
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name='created_video_highlights',
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    'product',
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name='video_highlights',
                        to='products.product',
                    ),
                ),
                (
                    'updated_by',
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name='updated_video_highlights',
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                'db_table': 'video_highlights',
                'ordering': ['display_order', '-created_at'],
            },
        ),
    ]

