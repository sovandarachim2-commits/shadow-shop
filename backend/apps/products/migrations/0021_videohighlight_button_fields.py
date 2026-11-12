from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0020_alter_videohighlight_video'),
    ]

    operations = [
        migrations.AddField(
            model_name='videohighlight',
            name='button_label',
            field=models.CharField(blank=True, max_length=60),
        ),
        migrations.AddField(
            model_name='videohighlight',
            name='button_label_km',
            field=models.CharField(blank=True, max_length=60),
        ),
        migrations.AddField(
            model_name='videohighlight',
            name='button_url',
            field=models.CharField(blank=True, max_length=500),
        ),
    ]
