import type { ElementType } from 'react'

export type BottomNavigationTab = 'home' | 'products' | 'rewards' | 'orders' | 'account'

export type BottomNavigationItem = {
  id: BottomNavigationTab
  label: string
  icon: ElementType
  ariaLabel: string
}
