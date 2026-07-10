import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Eye, EyeOff, Loader2, Lock, Send, Phone, Mail,
  ChevronLeft, ChevronRight, Globe, Headphones,
  Sparkles, Droplets, ShieldCheck, Leaf, User,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import useAuthStore from '@/store/authStore'
import { authApi } from '@/api/auth'

/* ──────────────────────────────────────────────────
   CROWN SVG
────────────────────────────────────────────────── */
function Crown({ size = 26 }) {
  return (
    <svg width={size} height={size * 0.72} viewBox="0 0 40 29" fill="none">
      <path d="M2 25 L10 6 L20 17 L30 6 L38 25 Z" fill="#E91E63" />
      <circle cx="2"  cy="25" r="2.5" fill="#E91E63" />
      <circle cx="20" cy="3.5" r="2.5" fill="#E91E63" />
      <circle cx="38" cy="25" r="2.5" fill="#E91E63" />
      <rect x="2" y="25" width="36" height="3" rx="1.5" fill="#E91E63" opacity="0.45" />
    </svg>
  )
}

function GoogleMark({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.33-1.58-5.04-3.7H.94v2.34A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.96 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.28-1.72V4.94H.94A9 9 0 0 0 0 9c0 1.45.34 2.82.94 4.06l3.02-2.34z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58A8.65 8.65 0 0 0 9 0 9 9 0 0 0 .94 4.94l3.02 2.34C4.67 5.16 6.66 3.58 9 3.58z" />
    </svg>
  )
}

/* ──────────────────────────────────────────────────
   SHOP LOGO  (mountain icon + SHADOW / SHOP)
────────────────────────────────────────────────── */
function ShopLogo({ storeName = 'Shadow Shop', scale = 1 }) {
  const words = (storeName || 'Shadow Shop').split(' ')
  const main = words[0].toUpperCase()
  const sub = words.slice(1).join(' ').toUpperCase() || 'SHOP'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: Math.round(5 * scale) }}>
      <svg width={Math.round(54 * scale)} height={Math.round(44 * scale)} viewBox="0 0 54 44" fill="none">
        <path d="M0 44 C2 44,6 24,14 16 C20 10,22 22,24 28 C26 22,32 8,38 8 C44 8,50 26,54 44 Z" fill="#E91E63" />
        <circle cx="38" cy="5" r="3.5" fill="#E91E63" />
      </svg>
      <p style={{ fontFamily: 'Georgia,serif', fontWeight: 900, letterSpacing: '0.18em', color: '#0f172a', fontSize: Math.round(26 * scale), lineHeight: 1, margin: 0 }}>{main}</p>
      <p style={{ fontWeight: 800, letterSpacing: '0.42em', color: '#E91E63', fontSize: Math.round(10 * scale), lineHeight: 1, margin: 0 }}>{sub}</p>
    </div>
  )
}

/* ──────────────────────────────────────────────────
   LANGUAGE PICKER
────────────────────────────────────────────────── */
const LANGS = [
  { code: 'en', label: 'English', short: 'EN', flag: '🇺🇸' },
  { code: 'km', label: 'Khmer',   short: 'KM', flag: '🇰🇭' },
]

function LanguagePicker() {
  const { i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const current = i18n.language?.startsWith('km') ? 'km' : 'en'
  const cur = LANGS.find((l) => l.code === current) || LANGS[0]

  const select = (code) => {
    i18n.changeLanguage(code)
    setOpen(false)
  }

  return (
    <div className="relative">
      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative z-50 flex items-center gap-2 rounded-full bg-gray-100 px-3.5 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-200"
      >
        <span className="text-base leading-none">{cur.flag}</span>
        <span>{cur.label}</span>
        <ChevronRight size={13} className={`transition-transform duration-200 ${open ? '-rotate-90' : 'rotate-90'}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-50 min-w-[170px] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
          {LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => select(l.code)}
              className={`flex w-full items-center gap-3 px-4 py-3 text-sm transition hover:bg-gray-50 ${l.code === current ? 'bg-pink-50/40' : ''}`}
            >
              <span className="text-base leading-none">{l.flag}</span>
              <span className={`flex-1 text-left font-bold ${l.code === current ? 'text-[#E91E63]' : 'text-gray-800'}`}>{l.label}</span>
              <span className={`text-xs font-bold ${l.code === current ? 'text-[#E91E63]' : 'text-gray-300'}`}>{l.short}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ──────────────────────────────────────────────────
   CHERRY BLOSSOM SCENE  (renders inside <svg>)
────────────────────────────────────────────────── */
function Flower({ cx, cy, r, rotate = 0, opacity = 1, light = false }) {
  const id = `f${Math.abs(cx)}${Math.abs(cy)}`
  const c1 = light ? '#ffdde9' : '#ffb3c6'
  const c2 = light ? '#ffcbda' : '#ff92af'
  const angles = [0, 72, 144, 216, 288]
  return (
    <g transform={`translate(${cx},${cy}) rotate(${rotate})`} opacity={opacity}>
      <defs>
        <radialGradient id={id} cx="50%" cy="35%" r="65%">
          <stop offset="0%" stopColor={c1} />
          <stop offset="100%" stopColor={c2} />
        </radialGradient>
      </defs>
      {angles.map((a) => (
        <ellipse
          key={a}
          cx={Math.sin((a * Math.PI) / 180) * r * 0.42}
          cy={-Math.cos((a * Math.PI) / 180) * r * 0.42}
          rx={r * 0.27}
          ry={r * 0.5}
          fill={`url(#${id})`}
          transform={`rotate(${a}, ${Math.sin((a * Math.PI) / 180) * r * 0.42}, ${-Math.cos((a * Math.PI) / 180) * r * 0.42})`}
        />
      ))}
      <circle cx={0} cy={0} r={r * 0.14} fill="#fff9f2" />
      {[0, 51, 103, 154, 206, 257, 309].map((a) => (
        <circle key={a}
          cx={Math.cos((a * Math.PI) / 180) * r * 0.23}
          cy={Math.sin((a * Math.PI) / 180) * r * 0.23}
          r={r * 0.023} fill="#ffd700" opacity={0.85}
        />
      ))}
    </g>
  )
}

function Petal({ cx, cy, rw, rh, rotate, opacity = 0.75, light = false }) {
  return (
    <ellipse cx={cx} cy={cy} rx={rw} ry={rh}
      fill={light ? '#ffdde9' : '#ffb3c6'}
      transform={`rotate(${rotate},${cx},${cy})`}
      opacity={opacity}
    />
  )
}

function BlossomScene() {
  return (
    <svg
      viewBox="0 0 720 600"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <radialGradient id="bgpink" cx="65%" cy="52%" r="48%">
          <stop offset="0%" stopColor="#ffe8ef" stopOpacity="0.9" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="720" height="600" fill="url(#bgpink)" />

      {/* Large flowers */}
      <Flower cx={430} cy={265} r={95}  rotate={18}  opacity={1}    />
      <Flower cx={555} cy={360} r={80}  rotate={-25} opacity={0.88} light />
      <Flower cx={508} cy={105} r={68}  rotate={35}  opacity={0.82} light />
      <Flower cx={52}  cy={320} r={52}  rotate={-12} opacity={0.72} light />
      <Flower cx={85}  cy={468} r={40}  rotate={22}  opacity={0.65} light />

      {/* Scattered petals */}
      <Petal cx={48}  cy={530} rw={18} rh={28} rotate={-35} opacity={0.62} />
      <Petal cx={155} cy={488} rw={14} rh={22} rotate={20}  opacity={0.55} light />
      <Petal cx={625} cy={175} rw={12} rh={18} rotate={50}  opacity={0.65} light />
      <Petal cx={668} cy={415} rw={16} rh={24} rotate={-18} opacity={0.58} light />
      <Petal cx={300} cy={72}  rw={10} rh={15} rotate={38}  opacity={0.48} light />
      <Petal cx={582} cy={510} rw={13} rh={20} rotate={-42} opacity={0.6}  />
      <Petal cx={210} cy={540} rw={9}  rh={14} rotate={15}  opacity={0.45} light />
      <Petal cx={470} cy={535} rw={11} rh={17} rotate={-28} opacity={0.55} light />
      <Petal cx={690} cy={280} rw={10} rh={16} rotate={30}  opacity={0.52} />
      <Petal cx={18}  cy={200} rw={8}  rh={13} rotate={-10} opacity={0.42} light />
    </svg>
  )
}

/* ──────────────────────────────────────────────────
   CSS SERUM BOTTLE
────────────────────────────────────────────────── */
function SerumBottle() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', filter: 'drop-shadow(0 28px 44px rgba(233,30,99,0.22))' }}>
      {/* Rubber bulb */}
      <div style={{ width: 44, height: 32, borderRadius: '52% 52% 36% 36%', background: 'linear-gradient(160deg,#f2f0f0 0%,#d6d4d4 45%,#b6b4b4 100%)', boxShadow: '0 3px 10px rgba(0,0,0,0.13)' }} />
      {/* Metal collar */}
      <div style={{ width: 54, height: 16, marginTop: -3, borderRadius: 8, background: 'linear-gradient(180deg,#e4e4e4 0%,#b2b2b2 55%,#8e8e8e 100%)', boxShadow: '0 3px 9px rgba(0,0,0,0.2)' }} />
      {/* Glass dropper stem */}
      <div style={{ width: 10, height: 28, background: 'linear-gradient(90deg,#ccc 0%,#f0f0f0 45%,#bbb 100%)', borderRadius: '0 0 4px 4px' }} />
      {/* Neck */}
      <div style={{ width: 32, height: 24, background: 'linear-gradient(135deg,rgba(255,192,214,0.78) 0%,rgba(240,122,162,0.63) 50%,rgba(255,192,214,0.72) 100%)', borderTop: '1px solid rgba(255,255,255,0.75)', boxShadow: 'inset 0 0 8px rgba(255,255,255,0.28)' }} />
      {/* Shoulder */}
      <div style={{ width: 120, height: 20, borderRadius: '60% 60% 0 0 / 100% 100% 0 0', background: 'linear-gradient(135deg,rgba(255,205,222,0.82) 0%,rgba(240,132,168,0.68) 52%,rgba(255,205,222,0.78) 100%)' }} />
      {/* Body */}
      <div style={{ position: 'relative', width: 140, height: 218, overflow: 'hidden', background: 'linear-gradient(140deg,rgba(255,218,232,0.88) 0%,rgba(248,155,188,0.78) 35%,rgba(222,98,142,0.66) 65%,rgba(255,212,228,0.84) 100%)', boxShadow: '0 24px 56px rgba(233,30,99,0.18),inset 0 0 32px rgba(255,255,255,0.22)', border: '1px solid rgba(255,255,255,0.44)' }}>
        {/* Left shine */}
        <div style={{ position: 'absolute', left: 15, top: 8, width: 14, height: 135, borderRadius: 20, background: 'linear-gradient(180deg,rgba(255,255,255,0.78),transparent)', filter: 'blur(5px)' }} />
        {/* Right accent */}
        <div style={{ position: 'absolute', right: 18, top: 22, width: 5, height: 70, borderRadius: 10, background: 'rgba(255,255,255,0.32)', filter: 'blur(2px)' }} />
        {/* Label */}
        <div style={{ position: 'absolute', left: 9, right: 9, top: 14, bottom: 10, background: 'rgba(255,255,255,0.94)', borderRadius: 10, backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10px 6px', boxShadow: 'inset 0 0 0 1px rgba(233,30,99,0.1)' }}>
          <svg width="18" height="13" viewBox="0 0 40 29" fill="none"><path d="M2 25 L10 6 L20 17 L30 6 L38 25 Z" fill="#E91E63" /><circle cx="2" cy="25" r="2.5" fill="#E91E63" /><circle cx="20" cy="3.5" r="2.5" fill="#E91E63" /><circle cx="38" cy="25" r="2.5" fill="#E91E63" /></svg>
          <p style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.14em', color: '#E91E63', fontFamily: 'Georgia,serif', marginTop: 1, lineHeight: 1 }}>SHADOW</p>
          <p style={{ fontSize: 6.5, fontWeight: 700, letterSpacing: '0.28em', color: 'rgba(233,30,99,0.65)', lineHeight: 1 }}>— BEAUTY —</p>
          <div style={{ height: 1, background: 'rgba(233,30,99,0.15)', width: '82%', margin: '5px 0' }} />
          <p style={{ fontSize: 9, fontWeight: 900, color: '#2c2c2c', letterSpacing: '0.08em', textAlign: 'center', lineHeight: 1.4 }}>WHITENING</p>
          <p style={{ fontSize: 9, fontWeight: 900, color: '#2c2c2c', letterSpacing: '0.08em', textAlign: 'center', lineHeight: 1.4 }}>SERUM</p>
          <p style={{ fontSize: 6.5, color: '#555', textAlign: 'center', marginTop: 4, lineHeight: 1.5 }}>NIACINAMIDE</p>
          <p style={{ fontSize: 6.5, color: '#555', textAlign: 'center', lineHeight: 1.5 }}>+ ALPHA ARBUTIN</p>
          <div style={{ height: 1, background: 'rgba(233,30,99,0.1)', width: '72%', margin: '5px 0' }} />
          <p style={{ fontSize: 6, color: '#aaa' }}>15ml / 0.5 fl.oz</p>
        </div>
      </div>
      {/* Body bottom curve */}
      <div style={{ width: 140, height: 18, borderRadius: '0 0 40% 40% / 0 0 80% 80%', background: 'linear-gradient(135deg,rgba(255,200,220,0.82) 0%,rgba(222,108,152,0.62) 52%,rgba(255,200,220,0.78) 100%)' }} />
      {/* Marble platform */}
      <div style={{ width: 174, height: 40, marginTop: 4, borderRadius: '50%', background: 'linear-gradient(180deg,#f8f4f3 0%,#ece6e6 62%,#e1d6d6 100%)', boxShadow: '0 6px 22px rgba(0,0,0,0.09)' }} />
      <div style={{ width: 154, height: 22, borderRadius: '50%', background: 'linear-gradient(180deg,#ece6e6 0%,#ddd0d0 100%)', boxShadow: '0 4px 12px rgba(0,0,0,0.07)' }} />
      {/* Reflection */}
      <div style={{ width: 134, height: 14, marginTop: 2, background: 'radial-gradient(ellipse,rgba(233,30,99,0.09),transparent 70%)', filter: 'blur(6px)' }} />
    </div>
  )
}

/* ──────────────────────────────────────────────────
   FEATURE STRIP
────────────────────────────────────────────────── */
const FEATURES = [
  { icon: Leaf,        label: 'Brightening',  sub: 'Skin Tone' },
  { icon: Droplets,    label: 'Deep',         sub: 'Hydration' },
  { icon: ShieldCheck, label: 'Protect Skin', sub: 'Barrier' },
  { icon: Sparkles,    label: 'For All',      sub: 'Skin Types' },
]

/* ──────────────────────────────────────────────────
   LEFT PANEL
────────────────────────────────────────────────── */
function LeftPanel({ storeName }) {
  const name0 = (storeName || 'Shadow').split(' ')[0].toUpperCase()
  const name1 = ((storeName || 'Shadow Shop').split(' ').slice(1).join(' ') || 'BEAUTY').toUpperCase()
  return (
    <div className="relative hidden lg:flex flex-col h-screen overflow-hidden bg-white select-none">
      <BlossomScene />

      {/* Logo — top left */}
      <div className="relative z-10 flex items-center gap-3 px-10 pt-8">
        <Crown size={22} />
        <div className="flex flex-col leading-none gap-0.5">
          <span className="text-xl font-black tracking-[0.15em] text-gray-900" style={{ fontFamily: 'Georgia,serif' }}>{name0}</span>
          <span className="text-[8.5px] font-bold tracking-[0.42em] text-[#E91E63]">{name1}</span>
        </div>
      </div>

      {/* Hero content */}
      <div className="relative z-10 flex flex-1 items-center px-10">
        <div className="flex w-full items-center gap-2">
          <div className="max-w-[250px] shrink-0">
            <h1 className="text-[2.15rem] font-black leading-[1.22] text-gray-900 tracking-tight">
              Love <span className="text-[#E91E63]">Your</span> Skin,<br />
              Love <span className="text-[#E91E63]">Yourself</span>
            </h1>
            <div className="mt-3 w-9 h-[3px] rounded-full bg-[#E91E63]" />
            <p className="mt-4 text-[13px] text-gray-500 leading-relaxed">
              Premium Korean Skincare<br />for Healthy, Glowing Skin
            </p>
          </div>
          <div className="flex-1 flex justify-center pb-4">
            <SerumBottle />
          </div>
        </div>
      </div>

      {/* Feature strip */}
      <div className="relative z-10 grid grid-cols-4 border-t border-gray-100 bg-white/85 backdrop-blur-sm">
        {FEATURES.map((f, i) => (
          <div key={f.label} className={`flex flex-col items-center gap-2 py-5 ${i < 3 ? 'border-r border-gray-100' : ''}`}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-pink-50">
              <f.icon size={18} color="#E91E63" strokeWidth={1.5} />
            </div>
            <div className="text-center">
              <p className="text-[11px] font-bold text-gray-800">{f.label}</p>
              <p className="text-[10px] text-gray-400">{f.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="relative z-10 flex items-center justify-center py-3 border-t border-gray-100 bg-white text-[11px] text-gray-400">
        <span>© {new Date().getFullYear()} {storeName}. All Rights Reserved.</span>
        {['Privacy Policy', 'Terms of Service', 'Help Center'].map((item) => (
          <span key={item} className="flex items-center">
            <span className="mx-3 w-px h-3 bg-gray-200 inline-block" />
            <button className="hover:text-[#E91E63] transition">{item}</button>
          </span>
        ))}
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────
   MOBILE HERO
────────────────────────────────────────────────── */
function MobileHero({ storeName, logoUrl }) {
  return (
    <div className="flex flex-col items-center pt-12 pb-3 px-6 bg-white lg:hidden">
      {logoUrl
        ? <img src={logoUrl} alt={storeName} className="h-36 w-36 object-contain" />
        : <ShopLogo storeName={storeName} scale={1.35} />
      }
    </div>
  )
}

/* ──────────────────────────────────────────────────
   FORM INPUT
────────────────────────────────────────────────── */
function Field({ label, icon: Icon, type = 'text', placeholder, value, onChange, right }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-800 mb-1.5">{label}</label>
      <div className="flex items-center h-12 rounded-xl border border-gray-200 bg-white px-4 gap-3 transition focus-within:border-[#E91E63]/40 focus-within:ring-2 focus-within:ring-[#E91E63]/10"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <Icon size={17} color="#E91E63" strokeWidth={1.8} className="shrink-0" />
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-300" />
        {right}
      </div>
    </div>
  )
}

function AuthIllustration({ mode = 'login' }) {
  const isRegister = mode === 'register'

  return (
    <div className="mx-auto mb-5 h-28 w-full max-w-[210px] sm:h-32">
      <svg viewBox="0 0 260 160" className="h-full w-full" role="img" aria-label={isRegister ? 'Sign up' : 'Login'}>
        <defs>
          <linearGradient id={`authCard-${mode}`} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#fff1f7" />
            <stop offset="100%" stopColor="#ffe4ef" />
          </linearGradient>
          <linearGradient id={`authPink-${mode}`} x1="0" x2="1">
            <stop offset="0%" stopColor="#ec4899" />
            <stop offset="100%" stopColor="#db2777" />
          </linearGradient>
        </defs>
        <ellipse cx="130" cy="143" rx="84" ry="8" fill="#fce7f3" />
        <rect x="56" y="26" width="96" height="104" rx="14" fill={`url(#authCard-${mode})`} />
        <rect x="72" y="44" width="58" height="8" rx="4" fill="#f9a8d4" />
        <rect x="72" y="62" width="64" height="12" rx="6" fill="white" />
        <rect x="72" y="84" width="64" height="12" rx="6" fill="white" />
        {isRegister && <rect x="72" y="106" width="64" height="12" rx="6" fill="white" />}
        <rect x="82" y={isRegister ? 128 : 106} width="44" height="8" rx="4" fill={`url(#authPink-${mode})`} />
        <circle cx="186" cy="52" r="18" fill="#fce7f3" />
        <circle cx="186" cy="48" r="7" fill="#ec4899" />
        <path d="M171 73c4-12 27-12 31 0" fill="#ec4899" opacity=".9" />
        <path d="M185 77v56" stroke="#111827" strokeWidth="5" strokeLinecap="round" />
        <path d="M185 92l-24 16" stroke="#db2777" strokeWidth="5" strokeLinecap="round" />
        <path d="M185 92l24 17" stroke="#db2777" strokeWidth="5" strokeLinecap="round" />
        <path d="M184 132l-13 12" stroke="#111827" strokeWidth="5" strokeLinecap="round" />
        <path d="M187 132l17 12" stroke="#111827" strokeWidth="5" strokeLinecap="round" />
        <circle cx="158" cy="22" r="7" fill="#f472b6" opacity=".5" />
        <circle cx="42" cy="94" r="5" fill="#f9a8d4" opacity=".8" />
        <path d="M43 47c17-12 28-12 42 0" stroke="#fbcfe8" strokeWidth="7" strokeLinecap="round" opacity=".65" />
      </svg>
    </div>
  )
}

function CompactField({ icon: Icon, type = 'text', placeholder, value, onChange, right, autoComplete }) {
  return (
    <div className="flex h-11 items-center gap-2.5 rounded-lg border border-gray-200 bg-white px-3 transition focus-within:border-pink-300 focus-within:ring-2 focus-within:ring-pink-100">
      <Icon size={15} className="shrink-0 text-gray-400" strokeWidth={2} />
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="min-w-0 flex-1 bg-transparent text-sm font-medium text-gray-900 outline-none placeholder:text-gray-400"
      />
      {right}
    </div>
  )
}

function AuthDivider({ label }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="h-px flex-1 bg-white/10" />
      <span className="text-xs font-semibold text-gray-400">{label}</span>
      <div className="h-px flex-1 bg-white/10" />
    </div>
  )
}

function LoginBrand({ storeName, logoUrl }) {
  return (
    <div className="flex flex-col items-center">
      {logoUrl ? (
        <img src={logoUrl} alt={storeName} className="h-24 w-24 object-contain drop-shadow-[0_0_22px_rgba(233,30,99,0.32)]" />
      ) : (
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-pink-500/30 bg-pink-500/10 text-4xl font-black text-[#E91E63] shadow-[0_0_34px_rgba(233,30,99,0.24)]">
          S
        </div>
      )}
      <div className="mt-2 text-center">
        <p className="text-2xl font-black uppercase tracking-[0.12em] text-white">{(storeName || 'Shadow Shop').split(' ')[0]}</p>
        <p className="text-xs font-black uppercase tracking-[0.42em] text-[#E91E63]">{(storeName || 'Shadow Shop').split(' ').slice(1).join(' ') || 'SHOP'}</p>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────
   MAIN
────────────────────────────────────────────────── */
export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, register, googleLogin, telegramLogin, isAuthenticated, user } = useAuthStore()
  const { t } = useTranslation()
  const [mode, setMode] = useState('login')
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [telegramOpen, setTelegramOpen] = useState(false)
  const [telegramLoading, setTelegramLoading] = useState(false)
  const [googleOpen, setGoogleOpen] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [lf, setLf] = useState({ username: '', password: '' })
  const [rf, setRf] = useState({ full_name: '', phone: '', email: '', password: '', confirm_password: '' })
  const telegramWidgetRef = useRef(null)
  const googleButtonRef = useRef(null)
  const sl = (k, v) => setLf((f) => ({ ...f, [k]: v }))
  const sr = (k, v) => setRf((f) => ({ ...f, [k]: v }))

  const { data: siteSettings } = useQuery({
    queryKey: ['site-settings'],
    queryFn: () => authApi.siteSettings.get().then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  })

  const { data: telegramConfig } = useQuery({
    queryKey: ['telegram-login-config'],
    queryFn: () => authApi.telegramConfig().then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  })

  const { data: googleConfig } = useQuery({
    queryKey: ['google-login-config'],
    queryFn: () => authApi.googleConfig().then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  })

  const storeName = siteSettings?.store_name || 'Shadow Shop'
  const loginLogoUrl = siteSettings?.login_logo_url || siteSettings?.logo_url || ''
  const name0 = (storeName || 'Shadow').split(' ')[0].toUpperCase()
  const name1 = ((storeName || 'Shadow Shop').split(' ').slice(1).join(' ') || 'BEAUTY').toUpperCase()
  const telegramBotUsername = telegramConfig?.bot_username || ''
  const telegramLoginEnabled = Boolean(telegramConfig?.configured && telegramBotUsername)
  const googleClientId = googleConfig?.client_id || ''
  const googleLoginEnabled = Boolean(googleConfig?.configured && googleClientId)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('signout') === '1') {
      toast.success('You have been signed out.')
      window.history.replaceState({}, '', '/login')
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return
    const from = location.state?.from
    if (user?.role === 'customer') navigate(from || '/', { replace: true })
    else navigate(from?.startsWith('/admin') ? from : '/admin', { replace: true })
  }, [isAuthenticated, user, navigate, location.state?.from])

  useEffect(() => {
    if (!telegramOpen || !telegramLoginEnabled || !telegramWidgetRef.current) return

    const callbackName = 'shadowShopTelegramAuth'
    window[callbackName] = async (telegramUser) => {
      setTelegramLoading(true)
      try {
        const loggedInUser = await telegramLogin(telegramUser)
        toast.success(`Welcome, ${loggedInUser.first_name || loggedInUser.username}!`)
        setTelegramOpen(false)
      } catch (err) {
        toast.error(err.response?.data?.detail || 'Telegram login failed')
      } finally {
        setTelegramLoading(false)
      }
    }

    telegramWidgetRef.current.innerHTML = ''
    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.async = true
    script.setAttribute('data-telegram-login', telegramBotUsername)
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-radius', '10')
    script.setAttribute('data-request-access', 'write')
    script.setAttribute('data-onauth', `${callbackName}(user)`)
    telegramWidgetRef.current.appendChild(script)

    return () => {
      if (window[callbackName]) delete window[callbackName]
    }
  }, [telegramOpen, telegramLoginEnabled, telegramBotUsername, telegramLogin])

  useEffect(() => {
    if (!googleOpen || !googleLoginEnabled || !googleButtonRef.current) return

    let cancelled = false

    const loadGoogleScript = () => new Promise((resolve, reject) => {
      if (window.google?.accounts?.id) {
        resolve()
        return
      }

      const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]')
      if (existing) {
        existing.addEventListener('load', resolve, { once: true })
        existing.addEventListener('error', reject, { once: true })
        return
      }

      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.onload = resolve
      script.onerror = reject
      document.head.appendChild(script)
    })

    loadGoogleScript()
      .then(() => {
        if (cancelled || !googleButtonRef.current) return

        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async ({ credential }) => {
            if (!credential) {
              toast.error('Google login did not return a credential.')
              return
            }

            setGoogleLoading(true)
            try {
              const loggedInUser = await googleLogin({ credential })
              toast.success(`Welcome, ${loggedInUser.first_name || loggedInUser.username}!`)
              setGoogleOpen(false)
            } catch (err) {
              toast.error(err.response?.data?.detail || 'Google login failed')
            } finally {
              setGoogleLoading(false)
            }
          },
        })

        googleButtonRef.current.innerHTML = ''
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: 'outline',
          size: 'large',
          shape: 'rectangular',
          text: mode === 'register' ? 'signup_with' : 'signin_with',
          width: 320,
        })
      })
      .catch(() => toast.error('Could not load Google login.'))

    return () => {
      cancelled = true
    }
  }, [googleOpen, googleLoginEnabled, googleClientId, googleLogin, mode])

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!lf.username || !lf.password) return toast.error('Please fill in all fields')
    setLoading(true)
    try {
      const u = await login(lf)
      toast.success(`Welcome back, ${u.first_name || u.username}!`)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Invalid credentials')
    } finally { setLoading(false) }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    const { full_name, phone, email, password, confirm_password } = rf
    if (!full_name || !phone || !password || !confirm_password) return toast.error('Please fill in all required fields')
    if (password !== confirm_password) return toast.error('Passwords do not match')
    const [firstName, ...rest] = full_name.trim().split(/\s+/)
    setLoading(true)
    try {
      const u = await register({ username: phone, email: email || undefined, phone, first_name: firstName || '', last_name: rest.join(' '), password, confirm_password })
      toast.success(`Welcome, ${u.first_name || u.username}!`)
      navigate(location.state?.from || '/')
    } catch (err) {
      const d = err.response?.data
      const firstError = d && typeof d === 'object'
        ? Object.values(d).flat().filter(Boolean)[0]
        : null
      toast.error(d?.detail || firstError || 'Registration failed')
    } finally { setLoading(false) }
  }

  const openTelegramLogin = () => {
    if (!telegramLoginEnabled) {
      toast.error('Telegram login is not configured yet.')
      return
    }
    setTelegramOpen(true)
  }

  const openGoogleLogin = () => {
    if (!googleLoginEnabled) {
      toast.error('Google login is not configured yet.')
      return
    }
    setGoogleOpen(true)
  }

  const EyeToggle = ({ show, toggle }) => (
    <button type="button" onClick={toggle} className="shrink-0 text-gray-300 hover:text-gray-500 transition">
      {show ? <Eye size={17} /> : <EyeOff size={17} />}
    </button>
  )

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">

      {/* ── Left ── */}
      <div className="hidden lg:block lg:w-[58%] lg:h-screen lg:sticky lg:top-0">
        <LeftPanel storeName={storeName} />
      </div>

      {/* ── Right ── */}
      <div className="lg:w-[42%] flex flex-col lg:min-h-screen bg-white">

        {/* Top bar — all screens */}
        <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))] sm:px-5 lg:px-10 lg:py-5 lg:pt-5">
          <button onClick={() => navigate('/')} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 lg:hidden">
            <ChevronLeft size={24} strokeWidth={2.4} />
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="hidden h-11 shrink-0 items-center gap-2 rounded-full border border-gray-200 bg-white px-5 text-sm font-black text-gray-700 shadow-sm transition hover:border-[#E91E63]/30 hover:bg-[#E91E63]/5 hover:text-[#E91E63] lg:flex"
          >
            Continue as guest
            <ChevronRight size={16} strokeWidth={2.5} />
          </button>
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <LanguagePicker />
            <button className="hidden items-center gap-1.5 border border-[#E91E63]/40 text-[#E91E63] rounded-full px-4 py-1.5 text-sm font-bold hover:bg-[#E91E63]/5 transition sm:flex">
              <Headphones size={14} /> Contact Us
            </button>
          </div>
        </div>

        {/* Form area */}
        <div className="flex flex-1 items-center justify-center px-5 py-6 lg:py-8 lg:px-12">
          <div className="w-full max-w-[420px]">
            {/* Card */}
            <div className="bg-white rounded-3xl border border-gray-100 px-6 py-8 shadow-[0_4px_24px_rgba(0,0,0,0.07)] lg:rounded-2xl lg:px-8 lg:py-9 lg:shadow-[0_8px_40px_rgba(0,0,0,0.07),0_2px_10px_rgba(233,30,99,0.04)]">
              {mode === 'login' ? (
                <form onSubmit={handleLogin}>
                  <div className="flex flex-col items-center mb-5">
                    {loginLogoUrl ? (
                      <img src={loginLogoUrl} alt={storeName} className="h-20 w-20 object-contain sm:h-24 sm:w-24" />
                    ) : (
                      <ShopLogo storeName={storeName} scale={0.9} />
                    )}
                  </div>

                  <div className="text-center mb-6">
                    <h2 className="text-[1.6rem] font-black text-gray-900 tracking-tight">{t('auth.welcome')}</h2>
                    <p className="text-sm text-gray-400 mt-1">{t('auth.loginSubtitle')}</p>
                  </div>

                  <div className="space-y-4">
                    {/* Email */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-1.5">{t('auth.email')}</label>
                      <div className="flex items-center h-12 rounded-xl border border-gray-200 bg-white px-4 gap-3 transition focus-within:border-[#E91E63]/40 focus-within:ring-2 focus-within:ring-[#E91E63]/10">
                        <Mail size={17} color="#E91E63" strokeWidth={1.8} className="shrink-0" />
                        <input type="text" value={lf.username} onChange={(e) => sl('username', e.target.value)}
                          placeholder={t('auth.emailPlaceholder')}
                          className="flex-1 bg-transparent text-[15px] text-gray-800 outline-none placeholder:text-gray-400" />
                      </div>
                    </div>

                    {/* Password */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-1.5">{t('auth.password')}</label>
                      <div className="flex items-center h-12 rounded-xl border border-gray-200 bg-white px-4 gap-3 transition focus-within:border-[#E91E63]/40 focus-within:ring-2 focus-within:ring-[#E91E63]/10">
                        <Lock size={17} color="#E91E63" strokeWidth={1.8} className="shrink-0" />
                        <input type={showPass ? 'text' : 'password'} value={lf.password}
                          onChange={(e) => sl('password', e.target.value)}
                          placeholder={t('auth.passwordPlaceholder')}
                          className="flex-1 bg-transparent text-[15px] text-gray-800 outline-none placeholder:text-gray-400" />
                        <EyeToggle show={showPass} toggle={() => setShowPass((s) => !s)} />
                      </div>
                      <div className="flex justify-end mt-2">
                        <button type="button" className="text-xs font-semibold text-[#E91E63] hover:opacity-75 transition">
                          {t('auth.forgotPassword')}
                        </button>
                      </div>
                    </div>

                    {/* Login button */}
                    <button type="submit" disabled={loading}
                      className="w-full h-12 rounded-xl text-white font-bold text-[15px] flex items-center justify-center gap-2 transition hover:opacity-90 disabled:opacity-60 mt-2"
                      style={{ background: '#E91E63', boxShadow: '0 4px 18px rgba(233,30,99,0.3)' }}>
                      {loading ? <Loader2 size={18} className="animate-spin" /> : <>{t('auth.login')} <ChevronRight size={17} strokeWidth={2.5} /></>}
                    </button>

                    {/* OR divider */}
                    <div className="flex items-center gap-3 py-0.5">
                      <div className="flex-1 h-px bg-gray-200" />
                      <span className="text-sm lg:text-xs font-bold text-gray-300 tracking-widest">{t('common.or')}</span>
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <button type="button"
                        onClick={openGoogleLogin}
                        disabled={googleLoading}
                        className="flex h-12 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60">
                        {googleLoading ? <Loader2 size={18} className="animate-spin text-gray-500" /> : <GoogleMark size={18} />}
                        Google
                      </button>

                      <button type="button"
                        onClick={openTelegramLogin}
                        disabled={telegramLoading}
                        className="flex h-12 items-center justify-center gap-2 rounded-xl border border-sky-100 bg-white text-sm font-bold text-gray-700 transition hover:bg-sky-50/40 disabled:opacity-60">
                        {telegramLoading ? <Loader2 size={18} className="animate-spin text-sky-500" /> : <Send size={18} color="#2AABEE" fill="#2AABEE" />}
                        Telegram
                      </button>
                    </div>

                    <p className="pt-2 text-center text-sm text-gray-400">
                      Don&apos;t have an account?{' '}
                      <button type="button" onClick={() => setMode('register')}
                        className="font-black text-[#E91E63] hover:opacity-75 transition">
                        Sign up
                      </button>
                    </p>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleRegister}>
                  <div className="mb-6">
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">{t('auth.createAccount')}</h2>
                    <p className="text-sm text-gray-400 mt-0.5">{t('auth.createAccountSubtitle')}</p>
                  </div>

                  <div className="space-y-4">
                    {/* Full Name */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-1.5">{t('auth.fullName')} *</label>
                      <div className="flex items-center h-13 rounded-xl border border-gray-200 bg-white px-4 gap-3 transition focus-within:border-[#E91E63]/50 focus-within:ring-2 focus-within:ring-[#E91E63]/10" style={{ height: 52 }}>
                        <User size={16} color="#E91E63" strokeWidth={1.8} className="shrink-0" />
                        <input type="text" value={rf.full_name} onChange={(e) => sr('full_name', e.target.value)}
                          placeholder={t('auth.fullName')}
                          className="flex-1 bg-transparent text-[15px] text-gray-800 outline-none placeholder:text-gray-300" />
                      </div>
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-1.5">{t('auth.phoneNumber')} *</label>
                      <div className="flex rounded-xl border border-gray-200 bg-white overflow-hidden transition focus-within:border-[#E91E63]/50 focus-within:ring-2 focus-within:ring-[#E91E63]/10"
                        style={{ height: 52 }}>
                        <div className="flex items-center gap-1.5 px-3 bg-gray-50 border-r border-gray-200 text-sm font-semibold text-gray-600 shrink-0">
                          🇰🇭 +855
                        </div>
                        <div className="flex items-center gap-3 flex-1 px-4">
                          <Phone size={16} color="#E91E63" strokeWidth={1.8} className="shrink-0" />
                          <input type="tel" value={rf.phone} onChange={(e) => sr('phone', e.target.value)}
                            placeholder={t('auth.phoneNumber')}
                            className="flex-1 bg-transparent text-[15px] text-gray-800 outline-none placeholder:text-gray-300" />
                        </div>
                      </div>
                    </div>

                    {/* Email */}
                    <div className="hidden">
                      <label className="block text-sm font-semibold text-gray-800 mb-1.5">{t('auth.emailOptional')}</label>
                      <div className="flex items-center rounded-xl border border-gray-200 bg-white px-4 gap-3 transition focus-within:border-[#E91E63]/50 focus-within:ring-2 focus-within:ring-[#E91E63]/10"
                        style={{ height: 52 }}>
                        <Mail size={16} color="#E91E63" strokeWidth={1.8} className="shrink-0" />
                        <input type="email" value={rf.email} onChange={(e) => sr('email', e.target.value)}
                          placeholder={t('auth.emailPlaceholder')}
                          className="flex-1 bg-transparent text-[15px] text-gray-800 outline-none placeholder:text-gray-300" />
                      </div>
                    </div>

                    {/* Password */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-1.5">{t('auth.password')} *</label>
                      <div className="flex items-center rounded-xl border border-gray-200 bg-white px-4 gap-3 focus-within:border-[#E91E63]/50 focus-within:ring-2 focus-within:ring-[#E91E63]/10 transition" style={{ height: 52 }}>
                        <Lock size={16} color="#E91E63" strokeWidth={1.8} className="shrink-0" />
                        <input type={showPass ? 'text' : 'password'} value={rf.password}
                          onChange={(e) => sr('password', e.target.value)} placeholder={t('auth.passwordPlaceholder')}
                          className="flex-1 bg-transparent text-[15px] text-gray-800 outline-none placeholder:text-gray-300" />
                        <EyeToggle show={showPass} toggle={() => setShowPass((s) => !s)} />
                      </div>
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-1.5">{t('auth.confirmPassword')} *</label>
                      <div className="flex items-center rounded-xl border border-gray-200 bg-white px-4 gap-3 focus-within:border-[#E91E63]/50 focus-within:ring-2 focus-within:ring-[#E91E63]/10 transition" style={{ height: 52 }}>
                        <Lock size={16} color="#E91E63" strokeWidth={1.8} className="shrink-0" />
                        <input type={showConfirm ? 'text' : 'password'} value={rf.confirm_password}
                          onChange={(e) => sr('confirm_password', e.target.value)} placeholder={t('auth.confirmPassword')}
                          className="flex-1 bg-transparent text-[15px] text-gray-800 outline-none placeholder:text-gray-300" />
                        <EyeToggle show={showConfirm} toggle={() => setShowConfirm((s) => !s)} />
                      </div>
                    </div>

                    <label className="hidden items-center gap-3 cursor-pointer pt-1">
                      <input type="checkbox" defaultChecked className="h-4 w-4 rounded accent-[#E91E63] shrink-0 cursor-pointer" />
                      <span className="text-xs text-gray-400 leading-relaxed">
                        {t('auth.termsAgreement', { terms: t('auth.termsConditions'), privacy: t('auth.privacyPolicy') })}
                      </span>
                    </label>

                    <button type="submit" disabled={loading}
                      className="w-full rounded-xl text-white font-bold text-[15px] flex items-center justify-center gap-2 transition hover:opacity-90 disabled:opacity-60"
                      style={{ height: 52, background: '#E91E63', boxShadow: '0 4px 18px rgba(233,30,99,0.32)' }}>
                      {loading ? <Loader2 size={18} className="animate-spin" /> : <>{t('auth.createAccount')} <ChevronRight size={17} strokeWidth={2.5} /></>}
                    </button>

                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-gray-150" style={{ background: '#e8e8e8' }} />
                      <span className="text-xs font-bold text-gray-300 tracking-widest">{t('common.or')}</span>
                      <div className="flex-1 h-px" style={{ background: '#e8e8e8' }} />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <button type="button"
                        onClick={openGoogleLogin}
                        disabled={googleLoading}
                        className="flex h-12 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60">
                        {googleLoading ? <Loader2 size={18} className="animate-spin text-gray-500" /> : <GoogleMark size={18} />}
                        Google
                      </button>

                      <button type="button"
                        onClick={openTelegramLogin}
                        disabled={telegramLoading}
                        className="flex h-12 items-center justify-center gap-2 rounded-xl border border-sky-100 bg-white text-sm font-bold text-gray-700 transition hover:bg-sky-50/40 disabled:opacity-60">
                        {telegramLoading ? <Loader2 size={18} className="animate-spin text-sky-500" /> : <Send size={18} color="#2AABEE" fill="#2AABEE" />}
                        Telegram
                      </button>
                    </div>

                    <p className="text-center text-sm text-gray-400 pt-2">
                      Already have an account?{' '}
                      <button type="button" onClick={() => setMode('login')}
                        className="font-black text-[#E91E63] hover:opacity-75 transition">Log in</button>
                    </p>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      {googleOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/45 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50">
              <GoogleMark size={26} />
            </div>
            <h3 className="mt-4 text-xl font-black text-gray-950">Continue with Google</h3>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              Choose your Google account to continue.
            </p>
            <div className="mt-5 flex min-h-[48px] items-center justify-center rounded-2xl border border-gray-100 bg-gray-50 px-3 py-4">
              {googleLoginEnabled ? (
                <div ref={googleButtonRef} className="flex justify-center" />
              ) : (
                <p className="text-sm font-bold text-red-500">Google login is not configured.</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setGoogleOpen(false)}
              className="mt-4 h-11 w-full rounded-xl border border-gray-200 bg-white text-sm font-black text-gray-600 transition hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {telegramOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/45 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-500">
              <Send size={24} fill="#2AABEE" />
            </div>
            <h3 className="mt-4 text-xl font-black text-gray-950">Continue with Telegram</h3>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              Approve Telegram login to continue. We will create your customer account automatically if this is your first time.
            </p>
            <div className="mt-5 flex min-h-[48px] items-center justify-center rounded-2xl border border-gray-100 bg-gray-50 px-3 py-4">
              {telegramLoginEnabled ? (
                <div ref={telegramWidgetRef} className="flex justify-center" />
              ) : (
                <p className="text-sm font-bold text-red-500">Telegram login is not configured.</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setTelegramOpen(false)}
              className="mt-4 h-11 w-full rounded-xl border border-gray-200 bg-white text-sm font-black text-gray-600 transition hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
