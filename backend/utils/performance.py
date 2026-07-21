import logging
import time

from django.conf import settings
from django.db import connection

logger = logging.getLogger('shadow_shop.performance')


class SlowRequestLoggingMiddleware:
    """Log slow HTTP requests and attach timing headers for production triage."""

    def __init__(self, get_response):
        self.get_response = get_response
        self.threshold = float(getattr(settings, 'SLOW_REQUEST_THRESHOLD_SECONDS', 0.75))
        self.db_threshold = float(getattr(settings, 'SLOW_DB_THRESHOLD_SECONDS', 0.4))
        self.instrument_db = bool(getattr(settings, 'PERF_INSTRUMENT_DB', False))

    def __call__(self, request):
        stats = {'queries': 0, 'db_seconds': 0.0}
        start = time.perf_counter()

        if self.instrument_db:
            def execute_wrapper(execute, sql, params, many, context):
                started = time.perf_counter()
                try:
                    return execute(sql, params, many, context)
                finally:
                    elapsed = time.perf_counter() - started
                    stats['queries'] += 1
                    stats['db_seconds'] += elapsed

            with connection.execute_wrapper(execute_wrapper):
                response = self.get_response(request)
        else:
            response = self.get_response(request)

        elapsed = time.perf_counter() - start
        response['X-Response-Time'] = f'{elapsed:.3f}s'
        if self.instrument_db:
            response['X-DB-Queries'] = str(stats['queries'])
            response['X-DB-Time'] = f"{stats['db_seconds']:.3f}s"

        if elapsed >= self.threshold or (
            self.instrument_db and stats['db_seconds'] >= self.db_threshold
        ):
            logger.warning(
                'slow_request method=%s path=%s status=%s duration=%.3fs '
                'db_queries=%s db_time=%.3fs',
                request.method,
                request.path,
                getattr(response, 'status_code', '?'),
                elapsed,
                stats['queries'] if self.instrument_db else '-',
                stats['db_seconds'] if self.instrument_db else 0.0,
            )
        return response
