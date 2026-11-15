from django.db import migrations, models


def preserve_existing_public_stores(apps, schema_editor):
    Store = apps.get_model('stores', 'Store')
    # These stores were already publicly listed before the visibility controls.
    Store.objects.using(schema_editor.connection.alias).filter(status='active', is_verified=True).update(
        is_published=True, is_public_approved=True, show_on_homepage=True,
    )


class Migration(migrations.Migration):
    dependencies = [('stores', '0007_store_name_change_note_and_more')]
    operations = [
        migrations.AddField(model_name='store', name='category', field=models.CharField(blank=True, max_length=100)),
        migrations.AddField(model_name='store', name='is_published', field=models.BooleanField(default=False)),
        migrations.AddField(model_name='store', name='is_public_approved', field=models.BooleanField(default=False)),
        migrations.AddField(model_name='store', name='show_on_homepage', field=models.BooleanField(default=False)),
        migrations.AddField(model_name='store', name='is_featured', field=models.BooleanField(default=False)),
        migrations.AddField(model_name='store', name='homepage_display_order', field=models.PositiveIntegerField(default=0)),
        migrations.RunPython(preserve_existing_public_stores, migrations.RunPython.noop),
    ]
