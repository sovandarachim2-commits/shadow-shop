import { useQuery } from '@tanstack/react-query'
import { authApi } from '@/api/auth'
import useAuthStore from '@/store/authStore'

export function useRolePermission(module, action = 'view') {
  const { user } = useAuthStore()

  const { data: rolePerms = [], isLoading } = useQuery({
    queryKey: ['role-perms', user?.role],
    queryFn: () => authApi.rolePermissions(user.role).then((r) => r.data),
    enabled: !!user?.role,
    staleTime: 2 * 60 * 1000,
  })

  const isFullAccess = ['super_admin', 'admin'].includes(user?.role)
  const allowed = isFullAccess || rolePerms.some((rp) => (
    rp.permission_detail?.module === module &&
    rp.permission_detail?.action === action
  ))

  return { allowed, isLoading }
}
