from .base import *

DEBUG = False
PERF_INSTRUMENT_DB = env_bool('PERF_INSTRUMENT_DB', default=False)
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
CSRF_TRUSTED_ORIGINS = config(
    'CSRF_TRUSTED_ORIGINS',
    default=''
).split(',')
CSRF_TRUSTED_ORIGINS = [origin for origin in CSRF_TRUSTED_ORIGINS if origin]

# Reuse DB connections between requests (big win on MySQL + gunicorn)
DATABASES['default']['CONN_MAX_AGE'] = 60

# Redis shared cache across gunicorn workers (install/start redis-server on OVH).
# Falls back to local memory if Redis URL is empty.
_redis_url = (REDIS_URL or '').strip()
if _redis_url:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.redis.RedisCache',
            'LOCATION': _redis_url,
            'KEY_PREFIX': 'shadow_shop',
            'TIMEOUT': 60,
        }
    }
    # Prefer cached DB sessions when Redis is available (less MySQL on every request).
    SESSION_ENGINE = 'django.contrib.sessions.backends.cached_db'
else:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'shadow-shop',
            'TIMEOUT': 60,
        }
    }

DJANGO_LOG_FILE = config('DJANGO_LOG_FILE', default='')

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'WARNING',
    },
    'loggers': {
        'shadow_shop.performance': {
            'handlers': ['console'],
            'level': 'WARNING',
            'propagate': False,
        },
    },
}

if DJANGO_LOG_FILE:
    LOGGING['handlers']['file'] = {
        'class': 'logging.handlers.RotatingFileHandler',
        'filename': DJANGO_LOG_FILE,
        'maxBytes': 1024 * 1024 * 10,
        'backupCount': 5,
        'formatter': 'verbose',
    }
    LOGGING['root']['handlers'].append('file')
    LOGGING['loggers']['shadow_shop.performance']['handlers'].append('file')
