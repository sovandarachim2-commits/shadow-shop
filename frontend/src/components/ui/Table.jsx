import { cn } from '@/utils/helpers'

export function Table({ children, className }) {
  return (
    <div className="overflow-x-auto">
      <table className={cn('w-full text-sm', className)}>
        {children}
      </table>
    </div>
  )
}

export function Thead({ children }) {
  return (
    <thead className="bg-gray-50 border-b border-gray-200">
      {children}
    </thead>
  )
}

export function Th({ children, className }) {
  return (
    <th className={cn('text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3', className)}>
      {children}
    </th>
  )
}

export function Tbody({ children }) {
  return <tbody className="divide-y divide-gray-100">{children}</tbody>
}

export function Tr({ children, className, onClick }) {
  return (
    <tr
      className={cn('data-table-row', onClick ? 'cursor-pointer' : '', className)}
      onClick={onClick}
    >
      {children}
    </tr>
  )
}

export function Td({ children, className }) {
  return (
    <td className={cn('px-4 py-3 text-gray-700', className)}>
      {children}
    </td>
  )
}

export function EmptyState({ message = 'No data found', icon: Icon }) {
  return (
    <div className="py-16 text-center">
      {Icon && <Icon size={40} className="mx-auto text-gray-300 mb-3" />}
      <p className="text-gray-400 text-sm">{message}</p>
    </div>
  )
}

export function LoadingRows({ cols = 6, rows = 5 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-gray-100">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-4 bg-gray-200 rounded animate-pulse" />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}
