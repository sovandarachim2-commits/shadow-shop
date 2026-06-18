import { Link } from 'react-router-dom'
import { Gift, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function LuckyBox() {
  const { t } = useTranslation()

  return (
    <div className="min-h-[calc(100vh-160px)] bg-white">
      <section className="-mx-4 -mt-4 flex min-h-[calc(100vh-160px)] flex-col items-center justify-center bg-gradient-to-br from-pink-50 via-white to-rose-50 px-5 py-12 text-center md:mx-0 md:mt-0 md:rounded-[28px]">
        <div className="relative">
          <div className="flex h-24 w-24 items-center justify-center rounded-[32px] bg-pink-600 text-white shadow-[0_18px_42px_rgba(219,39,119,0.28)]">
            <Gift size={44} />
          </div>
          <span className="absolute -right-2 -top-2 flex h-10 w-10 items-center justify-center rounded-full bg-white text-pink-600 shadow-lg">
            <Sparkles size={20} />
          </span>
        </div>

        <p className="mt-7 text-xs font-black uppercase tracking-[0.22em] text-pink-600">Lucky Box</p>
        <h1 className="mt-2 text-3xl font-black leading-tight text-gray-950 md:text-5xl">
          Coming Soon
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm font-semibold leading-6 text-gray-500 md:text-base">
          We are preparing this feature for customers. You can continue shopping products now.
        </p>

        <Link
          to="/shop"
          className="mt-8 rounded-2xl bg-pink-600 px-8 py-3 text-sm font-black text-white shadow-lg shadow-pink-100 transition active:scale-95 hover:bg-pink-700"
        >
          {t('nav.shop')}
        </Link>
      </section>
    </div>
  )
}
