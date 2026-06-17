from django.db import migrations, models


def create_default_styles(apps, schema_editor):
    HomeSectionStyle = apps.get_model('products', 'HomeSectionStyle')
    defaults = [
        ('main_category', 'Main Category', '#FCE7F3', '#111827'),
        ('brand', 'Shop by Brand', '#FCE7F3', '#111827'),
        ('best_seller', 'Best Seller', '#FCE7F3', '#111827'),
        ('new_arrival', 'New Arrivals', '#FCE7F3', '#111827'),
    ]
    for key, title, background_color, text_color in defaults:
        HomeSectionStyle.objects.get_or_create(
            key=key,
            defaults={
                'title': title,
                'background_color': background_color,
                'text_color': text_color,
                'is_active': True,
            },
        )


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0004_remove_luckybox'),
    ]

    operations = [
        migrations.CreateModel(
            name='HomeSectionStyle',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('key', models.CharField(choices=[('main_category', 'Main Category'), ('brand', 'Shop by Brand'), ('best_seller', 'Best Seller'), ('new_arrival', 'New Arrivals')], max_length=40, unique=True)),
                ('title', models.CharField(max_length=120)),
                ('background_color', models.CharField(default='#FCE7F3', max_length=20)),
                ('text_color', models.CharField(default='#111827', max_length=20)),
                ('is_active', models.BooleanField(default=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'home_section_styles',
                'ordering': ['key'],
            },
        ),
        migrations.RunPython(create_default_styles, migrations.RunPython.noop),
    ]
