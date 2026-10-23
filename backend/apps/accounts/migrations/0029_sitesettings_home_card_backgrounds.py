from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0028_user_referral_code_user_referred_by'),
    ]

    operations = [
        migrations.AddField(
            model_name='sitesettings',
            name='flash_card_background',
            field=models.ImageField(blank=True, null=True, upload_to='site/home_cards/'),
        ),
        migrations.AddField(
            model_name='sitesettings',
            name='rewards_card_background',
            field=models.ImageField(blank=True, null=True, upload_to='site/home_cards/'),
        ),
    ]
