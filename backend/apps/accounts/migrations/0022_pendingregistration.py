from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0021_emailverification'),
    ]

    operations = [
        migrations.CreateModel(
            name='PendingRegistration',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('email', models.EmailField(max_length=254, unique=True)),
                ('data', models.JSONField(default=dict)),
                ('password_hash', models.CharField(max_length=128)),
                ('code', models.CharField(max_length=6)),
                ('attempts', models.PositiveSmallIntegerField(default=0)),
                ('is_verified', models.BooleanField(default=False)),
                ('expires_at', models.DateTimeField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('verified_at', models.DateTimeField(blank=True, null=True)),
            ],
            options={
                'db_table': 'pending_registrations',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='pendingregistration',
            index=models.Index(fields=['email', 'code'], name='pending_reg_email_dafd83_idx'),
        ),
        migrations.AddIndex(
            model_name='pendingregistration',
            index=models.Index(fields=['email', 'is_verified'], name='pending_reg_email_1d0e39_idx'),
        ),
    ]
