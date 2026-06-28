import { useEffect } from 'react'
import { useAdminPageHeader } from '@/components/layout/AdminPageHeaderContext'

export default function PageHeader({ title, subtitle, actions }) {
  const adminPageHeader = useAdminPageHeader()
  const setAdminPageHeader = adminPageHeader?.setPageHeader

  useEffect(() => {
    if (!setAdminPageHeader) return undefined
    setAdminPageHeader({ title })
    return () => setAdminPageHeader(null)
  }, [setAdminPageHeader, title, subtitle])

  return (
    <div className={`page-header ${actions || subtitle ? '' : 'lg:hidden'}`}>
      <div className="lg:hidden">
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {subtitle && <p className="hidden text-sm font-semibold text-gray-500 lg:block">{subtitle}</p>}
      {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
    </div>
  )
}
