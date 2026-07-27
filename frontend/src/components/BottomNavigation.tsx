import { useState } from 'react'
import { Gift, Home, Package, ShoppingBag, User } from 'lucide-react'
import type { BottomNavigationItem, BottomNavigationTab } from '@/types/navigation'

type BottomNavigationProps = {
  activeTab?: BottomNavigationTab
  defaultActiveTab?: BottomNavigationTab
  onChange?: (tab: BottomNavigationTab) => void
  onHomeReselect?: () => void
  showOnDesktop?: boolean
  labels?: Partial<Record<BottomNavigationTab, string>>
  ariaLabels?: Partial<Record<BottomNavigationTab, string>>
}

const PRIMARY_PINK = '#ec2f83'
const INACTIVE_COLOR = '#667085'
const SAFE_BOTTOM = 'max(16px,env(safe-area-inset-bottom))'

const NAVIGATION_ITEMS: BottomNavigationItem[] = [
  { id: 'home', label: 'Home', icon: Home, ariaLabel: 'Open Home tab' },
  { id: 'products', label: 'Products', icon: ShoppingBag, ariaLabel: 'Open Products tab' },
  { id: 'rewards', label: 'Rewards', icon: Gift, ariaLabel: 'Open Rewards tab' },
  { id: 'orders', label: 'Orders', icon: Package, ariaLabel: 'Open Orders tab' },
  { id: 'account', label: 'Account', icon: User, ariaLabel: 'Open Account tab' },
]

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export default function BottomNavigation({
  activeTab,
  defaultActiveTab = 'home',
  onChange,
  onHomeReselect,
  showOnDesktop = false,
  labels = {},
  ariaLabels = {},
}: BottomNavigationProps) {
  const [internalActiveTab, setInternalActiveTab] = useState<BottomNavigationTab>(defaultActiveTab)
  const selectedTab = activeTab ?? internalActiveTab
  const isControlled = activeTab !== undefined

  const selectTab = (tab: BottomNavigationTab) => {
    if (tab === 'home' && selectedTab === 'home') {
      if (typeof window !== 'undefined' && window.scrollY > 4) {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } else {
        onHomeReselect?.()
      }
      return
    }
    if (!isControlled) setInternalActiveTab(tab)
    onChange?.(tab)
  }

  return (
    <div
      className={cx(
        'fixed inset-x-0 bottom-0 z-50 flex justify-center px-2 font-sans pointer-events-none',
        showOnDesktop ? '' : 'md:hidden',
      )}
      aria-label="Mobile primary navigation"
    >
      <div className="relative h-[calc(104px+max(16px,env(safe-area-inset-bottom)))] w-full max-w-[480px] pointer-events-auto">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 rounded-b-[22px] border-b-2 border-[rgba(236,47,131,0.28)] bg-white"
          style={{ height: SAFE_BOTTOM }}
        />
        <svg
          aria-hidden="true"
          className="absolute inset-x-0 h-[104px] w-full overflow-visible drop-shadow-[0_-8px_24px_rgba(15,23,42,0.08)]"
          style={{ bottom: SAFE_BOTTOM }}
          viewBox="0 0 390 104"
          preserveAspectRatio="none"
        >
          <path
            d="M24 28H126C150 28 156 62 195 62C234 62 240 28 264 28H366C379.255 28 390 38.745 390 52V104H0V52C0 38.745 10.745 28 24 28Z"
            fill="#ffffff"
          />
          <path
            d="M24 28H126C150 28 156 62 195 62C234 62 240 28 264 28H366C379.255 28 390 38.745 390 52"
            fill="none"
            stroke="rgba(236,47,131,0.28)"
            strokeWidth="1.5"
          />
        </svg>

        <nav
          className="absolute inset-x-0 bottom-0 grid h-[calc(76px+max(16px,env(safe-area-inset-bottom)))] grid-cols-5 px-2"
          style={{ paddingBottom: SAFE_BOTTOM }}
        >
          {NAVIGATION_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = selectedTab === item.id
            const isRewards = item.id === 'rewards'

            return (
              <button
                key={item.id}
                type="button"
                aria-label={ariaLabels[item.id] || item.ariaLabel}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => selectTab(item.id)}
                className={cx(
                  'relative flex min-h-[44px] flex-col items-center justify-end rounded-2xl pb-2 text-xs font-medium transition duration-200',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ec2f83] focus-visible:ring-offset-2 focus-visible:ring-offset-white',
                  'hover:text-[#EC2F83] active:scale-95',
                  isRewards ? 'pt-7' : 'pt-2 hover:-translate-y-0.5',
                )}
              >
                {isRewards ? (
                  <>
                    <span
                      className={cx(
                        'absolute -top-7 flex h-[58px] w-[58px] items-center justify-center rounded-full border-[5px] border-white',
                        'bg-gradient-to-br from-[#F24792] to-[#D629D7]',
                        'shadow-[0_12px_30px_rgba(236,47,131,0.18),0_0_0_9px_rgba(236,47,131,0.08)]',
                        'transition duration-200',
                        isActive ? 'scale-100' : 'scale-[0.97]',
                      )}
                    >
                      <Icon size={26} strokeWidth={2.35} className="text-white" />
                    </span>
                    <span className={cx('mt-auto max-w-full truncate text-[11px] leading-none', isActive ? 'font-semibold text-[#EC2F83]' : 'font-medium text-[#667085]')}>
                      {labels[item.id] || item.label}
                    </span>
                    <span
                      className={cx(
                        'mt-1.5 h-[3px] rounded-[3px] transition-all',
                        isActive ? 'w-5 bg-[#EC2F83]' : 'w-0 bg-transparent',
                      )}
                    />
                  </>
                ) : (
                  <>
                    <Icon
                      size={24}
                      strokeWidth={2.2}
                      color={isActive ? PRIMARY_PINK : INACTIVE_COLOR}
                      className="mb-1 transition-transform duration-200"
                    />
                    <span className={isActive ? 'font-semibold text-[#EC2F83]' : 'font-medium text-[#667085]'}>
                      {labels[item.id] || item.label}
                    </span>
                    <span
                      className={cx(
                        'mt-2 h-[3px] rounded-[3px] transition-all',
                        isActive ? 'w-5 bg-[#EC2F83]' : 'w-0 bg-transparent',
                      )}
                    />
                  </>
                )}
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}

export type { BottomNavigationProps }
