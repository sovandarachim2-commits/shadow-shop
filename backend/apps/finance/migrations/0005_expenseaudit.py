from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('finance', '0004_expensecategory_parent'),
    ]

    operations = [
        migrations.CreateModel(
            name='ExpenseAudit',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('action', models.CharField(choices=[('created', 'Created'), ('updated', 'Updated')], max_length=20)),
                ('changes', models.JSONField(blank=True, default=list)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('expense', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='audits', to='finance.expense')),
                ('user', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='expense_audits', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'expense_audits',
                'ordering': ['-created_at'],
            },
        ),
    ]
