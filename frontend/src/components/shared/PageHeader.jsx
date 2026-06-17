import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function PageHeader({ title, subtitle, actions, breadcrumbs }) {
  return (
    <div className="page-header">
      <div>
        {breadcrumbs && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
            {breadcrumbs.map((b, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <ChevronRight size={12} />}
                {b.path ? (
                  <Link to={b.path} className="hover:text-purple-600 transition-colors">{b.label}</Link>
                ) : (
                  <span className="text-gray-600 font-medium">{b.label}</span>
                )}
              </span>
            ))}
          </div>
        )}
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
