import logging

from django.core.cache import cache

logger = logging.getLogger('shadow_shop.performance')

HOME_FEED_CACHE_KEY = 'storefront:home_feed:v1'
SITE_SETTINGS_CACHE_KEY = 'storefront:site_settings:v1'
STORE_NAME_CACHE_KEY = 'storefront:store_name:v1'
PRODUCT_LIST_CACHE_PREFIX = 'storefront:product_list:v1:'

HOME_FEED_TTL = 120
SITE_SETTINGS_TTL = 120
STORE_NAME_TTL = 120
PRODUCT_LIST_TTL = 30


def safe_cache_get(key, default=None):
    try:
        value = cache.get(key, default)
        return value
    except Exception:
        logger.warning('cache_get_failed key=%s', key, exc_info=True)
        return default


def safe_cache_set(key, value, timeout=None):
    try:
        cache.set(key, value, timeout)
        return True
    except Exception:
        logger.warning('cache_set_failed key=%s', key, exc_info=True)
        return False


def safe_cache_delete_many(keys):
    try:
        cache.delete_many(keys)
    except Exception:
        logger.warning('cache_delete_many_failed', exc_info=True)
        for key in keys:
            try:
                cache.delete(key)
            except Exception:
                pass


def bump_storefront_cache():
    """Drop cached public storefront payloads after catalog/settings changes."""
    safe_cache_delete_many([
        HOME_FEED_CACHE_KEY,
        SITE_SETTINGS_CACHE_KEY,
        STORE_NAME_CACHE_KEY,
        'auth:telegram_login_config:v1',
        'auth:site_manifest:v1',
        'auth:site_favicon_url:v1',
    ])
    # Product list cache keys vary by query string; clear via version bump when available.
    try:
        cache.incr('storefront:product_list:version')
    except ValueError:
        safe_cache_set('storefront:product_list:version', 1, None)
    except Exception:
        logger.warning('product_list_cache_bump_failed', exc_info=True)


def product_list_cache_key(query_string: str) -> str:
    version = safe_cache_get('storefront:product_list:version', 1) or 1
    return f'{PRODUCT_LIST_CACHE_PREFIX}{version}:{query_string}'
