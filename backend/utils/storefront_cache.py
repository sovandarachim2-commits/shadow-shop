from django.core.cache import cache

HOME_FEED_CACHE_KEY = 'storefront:home_feed:v1'
SITE_SETTINGS_CACHE_KEY = 'storefront:site_settings:v1'

HOME_FEED_TTL = 60
SITE_SETTINGS_TTL = 120


def bump_storefront_cache():
    """Drop cached public storefront payloads after catalog/settings changes."""
    cache.delete_many([HOME_FEED_CACHE_KEY, SITE_SETTINGS_CACHE_KEY])
