import { useState } from 'react'
import { Heart, Search, ShoppingCart, Sparkles, Star } from 'lucide-react'
import MobilePageShell from '@/components/MobilePageShell'
import type { BottomNavigationTab } from '@/types/navigation'

const products = [
  { name: 'Rose Glow Serum', price: '$18.00', tag: 'Best Seller', tone: 'from-pink-100 to-rose-50' },
  { name: 'Velvet Lip Tint', price: '$9.50', tag: 'New Shade', tone: 'from-fuchsia-100 to-pink-50' },
  { name: 'Hydra Cushion', price: '$22.00', tag: 'SPF 40', tone: 'from-sky-100 to-pink-50' },
  { name: 'Peony Hand Cream', price: '$6.90', tag: 'Soft Care', tone: 'from-amber-100 to-rose-50' },
  { name: 'Glass Skin Toner', price: '$15.00', tag: 'Trending', tone: 'from-emerald-100 to-pink-50' },
  { name: 'Cherry Balm Duo', price: '$11.00', tag: 'Reward Pick', tone: 'from-red-100 to-pink-50' },
  { name: 'Cloud Milk Cleanser', price: '$13.00', tag: 'Gentle', tone: 'from-purple-100 to-pink-50' },
  { name: 'Peach Blush Stick', price: '$8.90', tag: 'Popular', tone: 'from-orange-100 to-rose-50' },
]

const tabLabels: Record<BottomNavigationTab, string> = {
  home: 'Home',
  products: 'Products',
  rewards: 'Rewards',
  orders: 'Orders',
  account: 'Account',
}

export default function DemoBottomNavigation() {
  const [activeTab, setActiveTab] = useState<BottomNavigationTab>('home')
  const [installedMode, setInstalledMode] = useState(false)
  const [homeRefreshes, setHomeRefreshes] = useState(0)

  return (
    <MobilePageShell
      activeTab={activeTab}
      installedMode={installedMode}
      onChange={setActiveTab}
      onHomeReselect={() => setHomeRefreshes((count) => count + 1)}
    >
      <header className="rounded-[28px] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#EC2F83]">Shadow Beauty</p>
            <h1 className="mt-2 text-2xl font-semibold leading-tight">Mobile bottom nav preview</h1>
          </div>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pink-50 text-[#EC2F83] transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EC2F83]"
            aria-label="Open cart"
          >
            <ShoppingCart size={20} />
          </button>
        </div>
        <div className="mt-5 grid grid-cols-[auto_1fr] items-center gap-3 rounded-2xl bg-gray-50 px-4 py-3">
          <Search size={18} className="text-gray-400" />
          <input
            className="bg-transparent text-sm font-medium outline-none placeholder:text-gray-400"
            placeholder="Search skincare, makeup..."
            aria-label="Search products"
          />
        </div>
      </header>

      <section className="mt-5 rounded-[28px] bg-gradient-to-br from-[#F24792] to-[#D629D7] p-5 text-white shadow-[0_18px_40px_rgba(236,47,131,0.22)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-white/80">Current active tab</p>
            <h2 className="mt-1 text-3xl font-semibold">{tabLabels[activeTab]}</h2>
            <p className="mt-3 text-sm font-medium leading-6 text-white/85">
              Tap Home again at the top to trigger refresh. Refresh count: {homeRefreshes}
            </p>
          </div>
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
            <Sparkles size={24} />
          </span>
        </div>
        <button
          type="button"
          onClick={() => setInstalledMode((value) => !value)}
          className="mt-5 rounded-2xl bg-white/95 px-4 py-3 text-sm font-semibold text-[#EC2F83] shadow-sm transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          {installedMode ? 'Disable' : 'Simulate'} installed PWA mode
        </button>
      </section>

      <section className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Recommended Products</h2>
            <p className="mt-1 text-xs font-medium text-gray-500">Scroll to verify fixed safe-area spacing</p>
          </div>
          <button type="button" className="text-sm font-semibold text-[#EC2F83]">View All</button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {products.map((product) => (
            <article key={product.name} className="overflow-hidden rounded-3xl bg-white shadow-[0_14px_40px_rgba(15,23,42,0.07)]">
              <div className={`relative h-36 bg-gradient-to-br ${product.tone}`}>
                <button
                  type="button"
                  className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[#EC2F83] shadow-sm transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EC2F83]"
                  aria-label={`Add ${product.name} to wishlist`}
                >
                  <Heart size={17} />
                </button>
                <div className="absolute inset-x-5 bottom-5 h-16 rounded-full bg-white/50 blur-xl" />
                <div className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-[28px] bg-white/70 shadow-inner" />
              </div>
              <div className="p-3">
                <span className="rounded-full bg-pink-50 px-2 py-1 text-[10px] font-semibold text-[#EC2F83]">{product.tag}</span>
                <h3 className="mt-2 min-h-10 text-sm font-semibold leading-5">{product.name}</h3>
                <div className="mt-3 flex items-center justify-between">
                  <p className="font-semibold text-gray-950">{product.price}</p>
                  <span className="flex items-center gap-1 text-xs font-medium text-amber-500">
                    <Star size={13} fill="currentColor" /> 4.9
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </MobilePageShell>
  )
}
