import { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/utils/helpers'

export function Modal({ isOpen, onClose, title, children, size = 'md', className }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-6xl',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={cn(
        'relative bg-white rounded-2xl shadow-2xl w-full animate-fade-in',
        sizes[size], className
      )}>
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
            >
              <X size={16} />
            </button>
          </div>
        )}
        <div className="max-h-[85vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}
