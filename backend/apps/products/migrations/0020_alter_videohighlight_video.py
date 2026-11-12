from django.db import migrations, models
import utils.storage


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0019_videohighlight'),
    ]

    operations = [
        migrations.AlterField(
            model_name='videohighlight',
            name='video',
            field=models.FileField(
                blank=True,
                null=True,
                storage=utils.storage.get_local_media_storage,
                upload_to='video_highlights/videos/',
            ),
        ),
    ]
