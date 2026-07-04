import { useEffect } from 'react'
import { useAdminPageHeader } from '@/components/layout/AdminPageHeaderContext'

export default function PageHeader({ title, subtitle, actions }) {
  const adminPageHeader = useAdminPageHeader()
  const setAdminPageHeader = adminPageHeader?.setPageHeader
  const mobileSummary = typeof subtitle === 'string' && /^\s*\d/.test(subtitle) ? subtitle : null

  useEffect(() => {
    if (!setAdminPageHeader) return undefined
    setAdminPageHeader({ title })
    return () => setAdminPageHeader(null)
  }, [setAdminPageHeader, title, subtitle])

  return (
    <div className={`page-header ${actions || subtitle ? '' : 'lg:hidden'}`}>
      {mobileSummary && (
        <p className="min-w-0 text-sm font-semibold text-gray-500 lg:hidden">{mobileSummary}</p>
      )}
      {subtitle && <p className="hidden text-sm font-semibold text-gray-500 lg:block">{subtitle}</p>}
      {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
    </div>
  )
}
