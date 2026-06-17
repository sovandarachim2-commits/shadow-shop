import { cn } from '@/utils/helpers'

export function Card({ children, className, ...props }) {
  return (
    <div className={cn('bg-white rounded-2xl shadow-card border border-gray-100', className)} {...props}>
      {children}
    </div>
  )
}

export function CardHeader({ children, className }) {
  return (
    <div className={cn('px-6 py-4 border-b border-gray-100', className)}>
      {children}
    </div>
  )
}

export function CardBody({ children, className }) {
  return <div className={cn('px-6 py-4', className)}>{children}</div>
}

export function KpiCard({ title, value, subtitle, icon: Icon, trend, color = 'purple', loading }) {
  const colorMap = {
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', icon: 'bg-purple-100' },
    pink: { bg: 'bg-pink-50', text: 'text-pink-600', icon: 'bg-pink-100' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', icon: 'bg-blue-100' },
    green: { bg: 'bg-green-50', text: 'text-green-600', icon: 'bg-green-100' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-600', icon: 'bg-orange-100' },
    yellow: { bg: 'bg-yellow-50', text: 'text-yellow-600', icon: 'bg-yellow-100' },
  }
  const c = colorMap[color] || colorMap.purple

  return (
    <div className="kpi-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          {loading ? (
            <div className="h-8 w-24 bg-gray-200 rounded-lg animate-pulse mt-1" />
          ) : (
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          )}
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
          {trend !== undefined && (
            <div className={cn('flex items-center gap-1 mt-2 text-xs font-medium', trend >= 0 ? 'text-green-600' : 'text-red-600')}>
              <span>{trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%</span>
              <span className="text-gray-400">vs last week</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={cn('w-11 h-11 rounded-2xl flex items-center justify-center', c.icon)}>
            <Icon size={22} className={c.text} />
          </div>
        )}
      </div>
    </div>
  )
}
