from rest_framework.permissions import BasePermission


ROLE_SUPER_ADMIN = 'super_admin'
ROLE_ADMIN = 'admin'
ROLE_SELLER = 'seller'
ROLE_CASHIER = 'cashier'
ROLE_WAREHOUSE = 'warehouse'
ROLE_SCANNER = 'scanner'
ROLE_DELIVERY = 'delivery'
ROLE_CUSTOMER = 'customer'

ADMIN_ROLES = [ROLE_SUPER_ADMIN, ROLE_ADMIN]
STAFF_ROLES = [ROLE_SUPER_ADMIN, ROLE_ADMIN, ROLE_SELLER, ROLE_CASHIER, ROLE_WAREHOUSE, ROLE_SCANNER, ROLE_DELIVERY]


class IsSuperAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == ROLE_SUPER_ADMIN


class IsAdminOrSuperAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ADMIN_ROLES


class IsStaff(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in STAFF_ROLES


class IsCustomer(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == ROLE_CUSTOMER


class IsSeller(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in [ROLE_SELLER, ROLE_ADMIN, ROLE_SUPER_ADMIN]


class IsCashier(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in [ROLE_CASHIER, ROLE_ADMIN, ROLE_SUPER_ADMIN]


class IsWarehouse(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in [ROLE_WAREHOUSE, ROLE_ADMIN, ROLE_SUPER_ADMIN]


class IsScanner(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in [ROLE_SCANNER, ROLE_ADMIN, ROLE_SUPER_ADMIN]


class IsDelivery(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in [ROLE_DELIVERY, ROLE_ADMIN, ROLE_SUPER_ADMIN]


def user_has_module_permission(user, module, action):
    if not user or not user.is_authenticated:
        return False
    if user.role in ADMIN_ROLES:
        return True

    from apps.accounts.models import RolePermission

    return RolePermission.objects.filter(
        role=user.role,
        permission__module=module,
        permission__action=action,
        granted=True,
    ).exists()


class HasModulePermission(BasePermission):
    module = None
    action_map = {
        'list': 'view',
        'retrieve': 'view',
        'create': 'create',
        'update': 'edit',
        'partial_update': 'edit',
        'destroy': 'delete',
    }

    def has_permission(self, request, view):
        module = getattr(view, 'permission_module', None) or self.module
        action_map = getattr(view, 'permission_action_map', None) or self.action_map
        action = action_map.get(getattr(view, 'action', None), 'view')
        return user_has_module_permission(request.user, module, action)
