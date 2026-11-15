import { Globe, Star, Sparkles } from 'lucide-react'

export const STORE_HOMEPAGE_DEFAULTS = {
  category: '',
  is_published: true,
  is_public_approved: true,
  show_on_homepage: false,
  is_featured: false,
  homepage_display_order: 0,
}

export default function StoreHomepageSettings({ value, onChange, idPrefix }) {
  const flags = [
    {
      key: 'show_on_homepage',
      title: 'Show on Homepage',
      hint: 'Include this store in "Discover Our Stores" carousel on the website homepage.',
      icon: Globe,
      color: 'text-violet-600',
    },
    {
      key: 'is_featured',
      title: 'Featured Store',
      hint: 'Pin with a Featured badge and prioritize placement on the website.',
      icon: Star,
      color: 'text-amber-500 fill-amber-500',
    },
  ]

  return (
    <section className="my-5 rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/50 via-white to-pink-50/30 p-5 shadow-xs" aria-labelledby={`${idPrefix}-homepage-title`}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <h3 id={`${idPrefix}-homepage-title`} className="flex items-center gap-2 text-sm font-bold text-gray-900">
          <Globe size={16} className="text-violet-600" />
          <span>Website & Homepage Visibility</span>
        </h3>
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
          <Sparkles size={11} className="text-emerald-500" />
          Auto-Approved for Active Stores
        </span>
      </div>
      <p className="mb-4 text-xs leading-5 text-gray-500">
        Stores with <strong>Active</strong> status automatically appear on the website. Use the controls below to display this store on the homepage and configure its category.
      </p>

      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1" htmlFor={`${idPrefix}-category`}>
            Store Category
          </label>
          <input
            id={`${idPrefix}-category`}
            value={value.category || ''}
            onChange={(event) => onChange({ category: event.target.value })}
            maxLength={100}
            placeholder="e.g. Beauty & Cosmetics"
            className="input-field text-xs"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1" htmlFor={`${idPrefix}-order`}>
            Homepage Display Order
          </label>
          <input
            id={`${idPrefix}-order`}
            type="number"
            min={0}
            step={1}
            value={value.homepage_display_order ?? 0}
            onChange={(event) => onChange({ homepage_display_order: Number(event.target.value) })}
            className="input-field text-xs"
          />
          <span className="mt-1 block text-[11px] text-gray-400">
            Lower numbers appear first within featured and regular stores.
          </span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {flags.map(({ key, title, hint, icon: Icon, color }) => (
          <label
            key={key}
            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition ${
              value[key]
                ? 'border-violet-300 bg-violet-50/60 shadow-xs'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <input
              type="checkbox"
              checked={Boolean(value[key])}
              onChange={(event) =>
                onChange({
                  [key]: event.target.checked,
                  is_published: true,
                  is_public_approved: true,
                })
              }
              className="mt-0.5 h-4 w-4 rounded text-violet-600 focus:ring-violet-500 border-gray-300"
            />
            <div className="min-w-0">
              <span className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                <Icon size={13} className={color} />
                <span>{title}</span>
              </span>
              <span className="mt-0.5 block text-[11px] leading-4 text-gray-500">{hint}</span>
            </div>
          </label>
        ))}
      </div>
    </section>
  )
}
