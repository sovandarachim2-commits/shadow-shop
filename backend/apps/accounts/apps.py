import sys

from django.apps import AppConfig


class AccountsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.accounts'
    label = 'accounts'

    def ready(self):
        if any(arg in sys.argv for arg in ('test', 'migrate', 'makemigrations', 'collectstatic')):
            return

        import threading

        def warm_telegram_keys():
            try:
                from apps.accounts.views import TelegramLoginView
                TelegramLoginView()._jwks_client().get_jwk_set()
            except Exception:
                pass

        threading.Thread(target=warm_telegram_keys, name='telegram-jwks', daemon=True).start()
