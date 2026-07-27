import type { ReactNode } from 'react'
import BottomNavigation from '@/components/BottomNavigation'
import type { BottomNavigationTab } from '@/types/navigation'

type MobilePageShellProps = {
  activeTab: BottomNavigationTab
  children: ReactNode
  installedMode?: boolean
  onChange: (tab: BottomNavigationTab) => void
  onHomeReselect?: () => void
}

export default function MobilePageShell({
  activeTab,
  children,
  installedMode = false,
  onChange,
  onHomeReselect,
}: MobilePageShellProps) {
  return (
    <div className="min-h-screen bg-[#f8f9fc] font-sans text-gray-950">
      <div
        className={[
          'mx-auto min-h-screen max-w-[480px] px-4 pt-4',
          'pb-[calc(104px+max(16px,env(safe-area-inset-bottom)))]',
          installedMode ? 'pt-[max(20px,env(safe-area-inset-top))]' : '',
        ].join(' ')}
      >
        {children}
      </div>
      <BottomNavigation
        activeTab={activeTab}
        onChange={onChange}
        onHomeReselect={onHomeReselect}
        showOnDesktop
      />
    </div>
  )
}

export type { MobilePageShellProps }
