from .models import ActivityLog


# Paths that should not create activity noise.
SKIP_PATH_SUFFIXES = (
    '/auth/refresh/',
    '/auth/logout/',  # logout is logged explicitly with a clear message
    '/auth/activity-logs/',
    '/auth/site-settings/favicon/',
    '/auth/site-settings/manifest/',
)

METHOD_ACTION = {
    'POST': 'create',
    'PUT': 'update',
    'PATCH': 'update',
    'DELETE': 'delete',
}

PATH_MODULE_RULES = (
    ('/auth/users', 'users'),
    ('/auth/roles', 'users'),
    ('/auth/role-permissions', 'users'),
    ('/auth/permissions', 'users'),
    ('/auth/login', 'users'),
    ('/auth/google', 'users'),
    ('/auth/telegram', 'users'),
    ('/auth/site-settings', 'settings'),
    ('/orders/', 'orders'),
    ('/products/', 'products'),
    ('/inventory/', 'inventory'),
    ('/delivery/', 'delivery'),
    ('/finance/', 'finance'),
    ('/reports/', 'reports'),
    ('/notifications/', 'settings'),
)


def get_client_ip(request):
    if not request:
        return None
    forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if forwarded:
        return forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def _mark_request_logged(request):
    if request is not None:
        try:
            request._activity_logged = True
        except Exception:
            pass


def log_activity(
    *,
    user=None,
    action='view',
    module='users',
    description='',
    request=None,
    object_id='',
    object_type='',
    extra_data=None,
):
    """Write an audit log entry. Never raises — must not break the main request."""
    try:
        if request is not None and user is None:
            user = getattr(request, 'user', None)
            if user is not None and not getattr(user, 'is_authenticated', False):
                user = None

        ActivityLog.objects.create(
            user=user if getattr(user, 'pk', None) else None,
            action=action,
            module=(module or 'users')[:50],
            description=(description or '')[:2000],
            object_id=str(object_id or '')[:50],
            object_type=(object_type or '')[:100],
            ip_address=get_client_ip(request),
            extra_data=extra_data or {},
        )
        _mark_request_logged(request)
    except Exception:
        pass


def resolve_module_from_path(path=''):
    clean = (path or '').lower()
    for prefix, module in PATH_MODULE_RULES:
        if prefix in clean:
            return module
    return 'users'


def build_auto_description(request, action):
    user = getattr(request, 'user', None)
    who = ''
    if user and getattr(user, 'is_authenticated', False):
        who = user.get_full_name() or user.username
    method = (request.method or '').upper()
    path = request.path or ''
    label = {
        'create': 'created',
        'update': 'updated',
        'delete': 'deleted',
        'print': 'printed',
        'login': 'logged in',
        'logout': 'logged out',
    }.get(action, action)
    return f'{who or "User"} {label} via {method} {path}'.strip()


class ActivityLoggingMiddleware:
    """
    Automatically log successful staff write actions across the API.
    Explicit log_activity() calls still win (they mark the request as logged).
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        try:
            self._maybe_log(request, response)
        except Exception:
            pass
        return response

    def _maybe_log(self, request, response):
        if getattr(request, '_activity_logged', False):
            return

        method = (request.method or '').upper()
        if method not in METHOD_ACTION:
            return

        path = request.path or ''
        if not path.startswith('/api/'):
            return
        if any(path.endswith(suffix) or suffix in path for suffix in SKIP_PATH_SUFFIXES):
            return

        status_code = getattr(response, 'status_code', 500)
        if status_code >= 400:
            return

        user = getattr(request, 'user', None)
        if not user or not getattr(user, 'is_authenticated', False):
            return
        if getattr(user, 'role', None) == 'customer':
            return

        # Login endpoints often run before request.user is set from JWT;
        # those are logged explicitly in serializers/views.
        if path.endswith('/auth/login/') or '/auth/google/login' in path or '/auth/telegram/' in path:
            return

        action = METHOD_ACTION[method]
        if 'print' in path or path.endswith('/mark_printed/'):
            action = 'print'

        module = resolve_module_from_path(path)
        log_activity(
            user=user,
            action=action,
            module=module,
            description=build_auto_description(request, action),
            request=request,
            extra_data={
                'method': method,
                'path': path,
                'status_code': status_code,
                'source': 'middleware',
            },
        )
