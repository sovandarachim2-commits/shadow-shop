from django.apps import AppConfig


class ProductsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.products'
    label = 'products'

    def ready(self):
        from django.db.models.signals import post_delete, post_save
        from utils.storefront_cache import bump_storefront_cache
        from .models import Banner, Brand, Category, Product, ProductImage

        def _bump(**kwargs):
            bump_storefront_cache()

        for model in (Banner, Brand, Category, Product, ProductImage):
            post_save.connect(_bump, sender=model, dispatch_uid=f'storefront_cache_save_{model.__name__}')
            post_delete.connect(_bump, sender=model, dispatch_uid=f'storefront_cache_delete_{model.__name__}')
