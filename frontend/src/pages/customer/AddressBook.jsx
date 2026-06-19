import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Bell, ChevronLeft, ChevronDown, ChevronRight, ClipboardList,
  CreditCard, Gift, Heart, HelpCircle, Home, Lock, LogOut, MapPin,
  MoreHorizontal, Package, Pencil, Percent, Plus, Search, Star,
  Trash2, User, X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { authApi } from '@/api/auth'
import useAuthStore from '@/store/authStore'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { cn } from '@/utils/helpers'

// ─── Cambodia administrative data ───────────────────────────────────────────
const KH = {
  provinces: [
    'Banteay Meanchey', 'Battambang', 'Kampong Cham', 'Kampong Chhnang',
    'Kampong Speu', 'Kampong Thom', 'Kampot', 'Kandal', 'Kep', 'Koh Kong',
    'Kratie', 'Mondulkiri', 'Oddar Meanchey', 'Pailin', 'Phnom Penh',
    'Preah Sihanouk', 'Preah Vihear', 'Prey Veng', 'Pursat', 'Ratanakiri',
    'Siem Reap', 'Stung Treng', 'Svay Rieng', 'Takeo', 'Tboung Khmum',
  ],
  districts: {
    'Phnom Penh': ['Boeng Keng Kang', 'Chamkarmon', 'Chbar Ampov', 'Chroy Changvar', 'Dangkao', 'Daun Penh', 'Kamboul', 'Mean Chey', 'Prek Pnov', 'Pur Senchey', 'Russey Keo', 'Saensokh', 'Sen Sok', 'Toul Kork'],
    'Siem Reap': ['Angkor Chum', 'Angkor Thom', 'Banteay Srei', 'Chi Kraeng', 'Kralanh', 'Prasat Bakong', 'Puok', 'Siem Reap', 'Soutr Nikom', 'Srey Snam', 'Svay Leu', 'Varin'],
    'Battambang': ['Banan', 'Battambang', 'Bavel', 'Ek Phnom', 'Kamrieng', 'Koas Krala', 'Maung Russey', 'Phnom Proek', 'Rotanak Mondol', 'Samlout', 'Sampov Lun', 'Sangkae', 'Thma Koul', 'Tiek Chhou'],
    'Kandal': ['Angk Snuol', 'Kien Svay', 'Khsach Kandal', 'Leuk Dek', 'Lvea Em', 'Mok Kampul', 'Ponhea Leu', 'Rokar Thum', 'Sa-ang', 'Takhmao'],
    'Kampot': ['Angkor Chey', 'Banteay Meas', 'Chhuk', 'Chum Kiri', 'Dang Tong', 'Kampong Trach', 'Kampot', 'Toek Chhou'],
    'Preah Sihanouk': ['Prey Nob', 'Sihanoukville', 'Stueng Hav'],
    'Kampong Cham': ['Batheay', 'Chamkar Leu', 'Cheung Prey', 'Dambae', 'Kampong Cham', 'Kampong Siem', 'Kang Meas', 'Koh Sotin', 'Prey Chhor', 'Srey Santhor', 'Stueng Trang'],
    'Takeo': ['Angkor Borei', 'Bati', 'Borei Cholsar', 'Doun Kaev', 'Kampong Roar', 'Kirivong', 'Prey Kabbas', 'Samraong', 'Tram Kak', 'Treang'],
    'Prey Veng': ['Kampong Trabek', 'Kampong Leaeng', 'Kanhchriech', 'Me Sang', 'Peam Chor', 'Peam Ro', 'Prey Veng', 'Svay Antor', 'Svay Teab'],
    'Kampong Speu': ['Aoral', 'Basedth', 'Kampong Speu', 'Kampong Leaeng', 'Odongk', 'Phnom Sruoch', 'Samraong Tong', 'Thpong'],
    'Kampong Thom': ['Baray', 'Kampong Svay', 'Kampong Thom', 'Prasat Ballangk', 'Prasat Sambour', 'Santuk', 'Stoung'],
    'Kampong Chhnang': ['Baribour', 'Chol Kiri', 'Kampong Chhnang', 'Kampong Leaeng', 'Kampong Tralach', 'Kirivong', 'Roleang Cheung', 'Sameakki Mean Chey', 'Tuek Phos'],
    'Kratie': ['Chhloung', 'Kratie', 'Preaek Prasab', 'Sambour', 'Snuol'],
    'Svay Rieng': ['Chantrea', 'Kampong Rou', 'Romeas Hek', 'Svay Chrum', 'Svay Rieng', 'Svay Teab'],
    'Pursat': ['Bakan', 'Kandieng', 'Krakor', 'Phnom Kravanh', 'Pursat', 'Veal Veaeng'],
    'Stung Treng': ['Sesan', 'Siem Bouk', 'Siem Pang', 'Stung Treng', 'Thala Barivat'],
    'Ratanakiri': ['Andoung Meas', 'Ban Lung', 'Bar Kaev', 'Koun Mom', 'Lumphat', 'O Chum', 'O Ya Dav', 'Voen Sai'],
    'Mondulkiri': ['Kaev Seima', 'Koh Nhek', 'Ou Reang', 'Pech Chreada', 'Sen Monorom'],
    'Preah Vihear': ['Chey Saen', 'Chhaeb', 'Choam Ksan', 'Kulen', 'Rovieng', 'Sangkom Thmei', 'Tbeng Meanchey'],
    'Oddar Meanchey': ['Anlong Veng', 'Banteay Ampil', 'Chong Kal', 'Samraong', 'Trapeang Prasat'],
    'Koh Kong': ['Botum Sakor', 'Kiri Sakor', 'Koh Kong', 'Mondol Seima', 'Smach Mean Chey', 'Sre Ambel', 'Thma Bang'],
    'Tboung Khmum': ['Dambae', 'Kroch Chhmar', 'Memot', 'Ou Reang Ov', 'Ponhea Kraek', 'Tboung Khmum'],
    'Banteay Meanchey': ['Mongkol Borei', 'Ou Chrov', 'Paoy Paet', 'Phnum Srok', 'Preah Netr Preah', 'Serey Saophoan', 'Svay Chek', 'Thma Puok'],
    'Kep': ['Damnak Chang Aeur', 'Kep'],
    'Pailin': ['Pailin', 'Sala Krau'],
  },
  communes: {
    // Phnom Penh
    'Russey Keo': ['Chrang Chamreh I', 'Chrang Chamreh II', 'Kilometre Lekh Prammuoy', 'Russei Keo', 'Svay Pak', 'Tuol Sangkae I', 'Tuol Sangkae II'],
    'Chamkarmon': ['Boeung Keng Kang I', 'Boeung Keng Kang II', 'Boeung Keng Kang III', 'Tonle Basak', 'Tumnob Tuek', 'Veal Vong'],
    'Toul Kork': ['Boeung Kak I', 'Boeung Kak II', 'Phnom Penh Thmei', 'Tuk Laak I', 'Tuk Laak II', 'Tuk Laak III'],
    'Daun Penh': ['Chakto Mukh', 'Chey Chumneah', 'Phsar Chas', 'Phsar Kandal I', 'Phsar Kandal II', 'Srah Chak', 'Wat Phnom'],
    'Boeng Keng Kang': ['Boeung Keng Kang I', 'Boeung Keng Kang II', 'Boeung Keng Kang III'],
    'Mean Chey': ['Boeng Tumpun', 'Chak Angrae Kraom', 'Chak Angrae Leu', 'Kakab', 'Nirouth', 'Preaek Pra', 'Steung Meanchey I', 'Steung Meanchey II'],
    'Sen Sok': ['Kakab', 'Krang Thnong', 'Phnom Penh Thmei', 'Toek Thla'],
    'Chroy Changvar': ['Chroy Changvar', 'Kaoh Dach', 'Preaek Lieb', 'Preaek Ta Sek'],
    'Chbar Ampov': ['Chbar Ampov I', 'Chbar Ampov II', 'Nirouth', 'Preaek Pra', 'Steung Meanchey III'],
    'Pur Senchey': ['Chaom Chau I', 'Chaom Chau II', 'Chaom Chau III', 'Kamboul', 'Kouk Roka', 'Preaek Thmei', 'Spean Thma'],
    'Dangkao': ['Cheung Aek', 'Chhbar Ampov', 'Dangkao', 'Prateah Lang', 'Spean Thma'],
    'Saensokh': ['Khmuonh', 'Krang Thnong', 'Phnom Penh Thmei', 'Roka Thum', 'Toek Thla'],
    'Kamboul': ['Cheung Aek', 'Kamboul'],
    'Prek Pnov': ['Chrouy Changvar', 'Preaek Phnov'],
    // Siem Reap
    'Siem Reap': ['Kouk Chak', 'Mondul I', 'Mondul II', 'Mondul III', 'Nokor Thum', 'Sala Kamraeuk', 'Siem Reap', 'Slor Kram', 'Svay Dangkum'],
    'Angkor Thom': ['Banteay Chhmar', 'Leang Dai', 'Nokor Thum', 'Siem Reap'],
    'Angkor Chum': ['Anlong Run', 'Srae Noy', 'Svay Leu'],
    'Puok': ['Lolok Sar', 'Puok', 'Svay Chek'],
    // Battambang
    'Battambang': ['Kampong Kor', 'Kdol Tahen', 'Noyoan', 'Preaek Moha Tel', 'Rattanak', 'Svay Por', 'Tuol Ta Ek'],
    'Banan': ['Banan', 'Kdol', 'O Char', 'Sdam', 'Sla Kram'],
    // Kandal
    'Takhmao': ['Kampong Samnanh', 'Preaek Ho', 'Samraong Kandal', 'Ta Khmau', 'Takhmao'],
    'Kien Svay': ['Kien Svay', 'Koki', 'Preaek Ambel', 'Svay Ampou'],
    // Preah Sihanouk
    'Sihanoukville': ['Buon', 'Ekreach', 'Mit Pheap', 'Pir', 'Prey Nob', 'Stueng Hav'],
    // Kampot
    'Kampot': ['Andoung Khmer', 'Kampot', 'Preaek Thmei', 'Tuk Chhu'],
    // Kratie
    'Kratie': ['Kratie', 'Preaek Prasab', 'Sambok'],
    // Svay Rieng
    'Svay Rieng': ['Prey Krong', 'Svay Rieng', 'Svay Teab'],
  },
}

const emptyForm = {
  label: 'home',
  full_name: '',
  phone: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  postal_code: '',
  country: 'Cambodia',
  is_default: false,
}

// ─── Toggle ──────────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ${checked ? 'bg-pink-600' : 'bg-gray-200'}`}
    >
      <span
        className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0.5'}`}
      />
    </button>
  )
}

// ─── FlatInput ───────────────────────────────────────────────────────────────
function FlatInput({ required, value, onChange, placeholder, type = 'text', prefix, suffix }) {
  return (
    <div className="flex items-center gap-3 border-b border-gray-100 py-4">
      {prefix && <span className="shrink-0 text-sm text-gray-700">{prefix}</span>}
      <div className="flex min-w-0 flex-1 items-center gap-1">
        {required && <span className="mr-0.5 shrink-0 text-sm text-pink-600">*</span>}
        <input
          type={type}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
        />
      </div>
      {suffix}
    </div>
  )
}

// ─── LocationPicker ──────────────────────────────────────────────────────────
function LocationPicker({ onSelect, onClose }) {
  const [level, setLevel] = useState('province')
  const [sel, setSel] = useState({ province: '', district: '', commune: '' })
  const [search, setSearch] = useState('')

  const currentList = useMemo(() => {
    if (level === 'province') return KH.provinces
    if (level === 'district') return KH.districts[sel.province] || []
    return KH.communes[sel.district] || []
  }, [level, sel])

  const filtered = useMemo(() =>
    search ? currentList.filter((i) => i.toLowerCase().includes(search.toLowerCase())) : currentList,
    [currentList, search]
  )

  const grouped = useMemo(() =>
    filtered.reduce((acc, item) => {
      const l = item[0].toUpperCase()
      ;(acc[l] = acc[l] || []).push(item)
      return acc
    }, {}),
    [filtered]
  )

  const titleMap = {
    province: 'Select Province / State',
    district: 'Select District / Khan',
    commune: 'Select Commune / Sangkat',
  }

  const pick = (item) => {
    setSearch('')
    if (level === 'province') {
      const next = { province: item, district: '', commune: '' }
      setSel(next)
      const districts = KH.districts[item] || []
      if (districts.length) { setLevel('district'); return }
      onSelect({ state: item, city: '', address_line2: '' })
      onClose()
    } else if (level === 'district') {
      const next = { ...sel, district: item, commune: '' }
      setSel(next)
      const communes = KH.communes[item] || []
      if (communes.length) { setLevel('commune'); return }
      onSelect({ state: sel.province, city: item, address_line2: '' })
      onClose()
    } else {
      onSelect({ state: sel.province, city: sel.district, address_line2: item })
      onClose()
    }
  }

  const navTo = (toLevel) => {
    setSearch('')
    setLevel(toLevel)
    if (toLevel === 'province') setSel({ province: '', district: '', commune: '' })
    else if (toLevel === 'district') setSel((s) => ({ ...s, district: '', commune: '' }))
    else setSel((s) => ({ ...s, commune: '' }))
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center border-b border-gray-100 px-5 py-4">
        <h3 className="flex-1 text-center text-base font-semibold text-gray-900">{titleMap[level]}</h3>
        <button onClick={onClose} className="flex h-8 w-8 items-center justify-center text-gray-500">
          <X size={20} />
        </button>
      </div>

      {/* Breadcrumb */}
      <div className="border-b border-gray-100 px-5 py-4">
        <div className="relative pl-6">
          <div className="absolute left-[7px] top-2 h-[calc(100%-12px)] w-0.5 bg-pink-100" />

          <button type="button" onClick={() => navTo('province')} className="relative mb-4 flex items-center text-sm text-gray-600 last:mb-0">
            <span className="absolute -left-6 top-0.5 h-3 w-3 rounded-full bg-pink-600 ring-2 ring-white" />
            Cambodia
          </button>

          {sel.province && (
            <button type="button" onClick={() => navTo('district')} className={`relative mb-4 flex items-center text-sm last:mb-0 ${level === 'province' ? 'font-semibold text-pink-600' : 'text-gray-800'}`}>
              <span className="absolute -left-6 top-0.5 h-3 w-3 rounded-full bg-pink-600 ring-2 ring-white" />
              {sel.province}
            </button>
          )}

          {sel.district && (
            <button type="button" onClick={() => navTo('commune')} className={`relative mb-4 flex items-center text-sm last:mb-0 ${level === 'district' ? 'font-semibold text-pink-600' : 'text-gray-800'}`}>
              <span className="absolute -left-6 top-0.5 h-3 w-3 rounded-full bg-pink-600 ring-2 ring-white" />
              {sel.district}
            </button>
          )}

          {sel.commune && (
            <div className="relative flex items-center text-sm font-semibold text-pink-600">
              <span className="absolute -left-6 top-0.5 h-3 w-3 rounded-full bg-pink-600 ring-2 ring-white" />
              {sel.commune}
            </div>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="border-b border-gray-100 px-5 py-3">
        <div className="flex gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-full border border-gray-200 px-4 py-2.5">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="flex-1 bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
            />
          </div>
          <button type="button" className="rounded-full bg-pink-600 px-5 py-2 text-sm font-semibold text-white">
            Search
          </button>
        </div>
      </div>

      {/* Alphabetical list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="py-16 text-center text-sm text-gray-400">No results found</p>
        ) : (
          Object.keys(grouped).sort().map((letter) => (
            <div key={letter} className="flex items-start gap-4 border-b border-gray-50 px-5 py-2">
              <span className="mt-3.5 w-4 shrink-0 text-xs font-bold text-gray-400">{letter}</span>
              <div className="flex-1 divide-y divide-gray-50">
                {grouped[letter].map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => pick(item)}
                    className="flex w-full items-center justify-between py-3 text-left text-sm text-gray-800 hover:text-pink-600"
                  >
                    <span>{item}</span>
                    <ChevronRight size={15} className="shrink-0 text-gray-300" />
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ─── AddressForm ─────────────────────────────────────────────────────────────
function AddressForm({ address, onSave, onClose, isSaving }) {
  const [form, setForm] = useState(() =>
    address
      ? { label: address.label, full_name: address.full_name, phone: address.phone, address_line1: address.address_line1, address_line2: address.address_line2 || '', city: address.city, state: address.state || '', postal_code: address.postal_code || '', country: address.country, is_default: address.is_default }
      : { ...emptyForm, is_default: false }
  )
  const [showPicker, setShowPicker] = useState(false)

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleLocationSelect = ({ state, city, address_line2 }) => {
    setForm((f) => ({ ...f, state, city, address_line2 }))
  }

  const locationSummary = [form.state, form.city, form.address_line2].filter(Boolean).join(' › ')

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
        <div className="flex w-full max-w-lg flex-col rounded-t-3xl bg-white" style={{ height: '88vh' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4">
            <h3 className="flex-1 text-center text-base font-semibold text-gray-900">
              {address ? 'Edit delivery address' : 'Add delivery address'}
            </h3>
            <button onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center text-gray-500">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); onSave(form) }} className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-5">

              {/* Search bar */}
              <div className="mb-3 flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2.5">
                <Search size={16} className="shrink-0 text-gray-400" />
                <span className="text-sm text-gray-400">Search by address keywords</span>
              </div>

              {/* Country */}
              <div className="flex items-center gap-1 border-b border-gray-100 py-4">
                <span className="mr-0.5 text-sm text-pink-600">*</span>
                <select
                  value={form.country}
                  onChange={(e) => { set('country', e.target.value); set('state', ''); set('city', ''); set('address_line2', '') }}
                  className="flex-1 appearance-none bg-transparent text-sm text-gray-800 outline-none"
                >
                  <option>Cambodia</option>
                  <option>Thailand</option>
                  <option>Vietnam</option>
                  <option>Laos</option>
                  <option>Myanmar</option>
                  <option>Other</option>
                </select>
                <ChevronDown size={15} className="shrink-0 text-gray-400" />
              </div>

              {/* Location — cascading picker for Cambodia, free text otherwise */}
              {form.country === 'Cambodia' ? (
                <button
                  type="button"
                  onClick={() => setShowPicker(true)}
                  className="flex w-full items-center gap-1 border-b border-gray-100 py-4 text-left"
                >
                  <span className="mr-0.5 text-sm text-pink-600">*</span>
                  {locationSummary ? (
                    <span className="flex-1 text-sm text-gray-800">{locationSummary}</span>
                  ) : (
                    <span className="flex-1 text-sm text-gray-400">Province › District › Commune</span>
                  )}
                  <ChevronRight size={15} className="shrink-0 text-gray-400" />
                </button>
              ) : (
                <>
                  <FlatInput required value={form.state} onChange={(v) => set('state', v)} placeholder="Province / State" />
                  <FlatInput required value={form.city} onChange={(v) => set('city', v)} placeholder="City / District" />
                </>
              )}

              {/* Street address */}
              <FlatInput
                required
                value={form.address_line1}
                onChange={(v) => set('address_line1', v)}
                placeholder="Street, Number, Apt, Suite, Floor, etc."
              />

              {/* Full name */}
              <FlatInput
                required
                value={form.full_name}
                onChange={(v) => set('full_name', v)}
                placeholder="Full name (first and last)"
              />

              {/* Phone */}
              <div className="flex items-center gap-2 border-b border-gray-100 py-4">
                <div className="flex shrink-0 items-center gap-1 border-r border-gray-200 pr-3 text-sm text-gray-700">
                  +855 <ChevronDown size={13} className="text-gray-400" />
                </div>
                <span className="shrink-0 text-sm text-pink-600">*</span>
                <input
                  required
                  type="tel"
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  placeholder="Enter phone number"
                  className="min-w-0 flex-1 bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
                />
              </div>

            </div>

            {/* Sticky bottom */}
            <div className="border-t border-gray-100 px-5 pb-8 pt-4">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm text-gray-800">Set as default address</span>
                <Toggle checked={form.is_default} onChange={(v) => set('is_default', v)} />
              </div>
              <button
                type="submit"
                disabled={isSaving}
                className="w-full rounded-full bg-pink-600 py-4 text-sm font-semibold text-white transition hover:bg-pink-700 disabled:opacity-70"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {showPicker && (
        <LocationPicker
          onSelect={handleLocationSelect}
          onClose={() => setShowPicker(false)}
        />
      )}
    </>
  )
}

function DesktopAccountSidebar({ onNavigate, onLogout }) {
  return (
    <aside className="w-[240px] shrink-0 border-r border-gray-100 bg-white">
      <nav className="p-3 pt-5">
        {[
          { label: 'Account Overview', icon: Home,          path: '/profile',      active: false },
          { label: 'My Orders',        icon: ClipboardList, path: '/my-orders',    active: false },
          { label: 'Addresses',        icon: MapPin,        path: '/address-book', active: true  },
          { label: 'Wishlist',         icon: Heart,         path: '/wishlist',     active: false },
          { label: 'Rewards',          icon: Gift,          path: '/profile',      active: false },
          { label: 'Coupons',          icon: Percent,       path: '/profile',      active: false },
          { label: 'Reviews',          icon: Star,          path: '/profile',      active: false },
        ].map(({ label, icon: Icon, path, active }) => (
          <button
            key={label}
            onClick={() => onNavigate(path)}
            className={cn(
              'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
              active ? 'bg-pink-50 font-bold text-pink-600' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            )}
          >
            <Icon size={17} className={active ? 'text-pink-600' : ''} />
            <span className="flex-1 text-left">{label}</span>
          </button>
        ))}
      </nav>
      <div className="border-t border-gray-100 p-3 pb-4">
        <p className="px-3 pb-2 pt-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">Account Settings</p>
        {[
          { label: 'Edit Profile',        icon: User,       action: () => onNavigate('/profile') },
          { label: 'Password & Security', icon: Lock,       action: () => onNavigate('/profile') },
          { label: 'Payment Methods',     icon: CreditCard, action: () => onNavigate('/profile') },
          { label: 'Notifications',       icon: Bell,       action: () => onNavigate('/profile') },
          { label: 'Help Center',         icon: HelpCircle, action: () => onNavigate('/profile') },
          { label: 'Logout',              icon: LogOut,     action: onLogout, danger: true },
        ].map(({ label, icon: Icon, action, danger }) => (
          <button
            key={label}
            onClick={action}
            className={cn(
              'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
              danger ? 'text-red-500 hover:bg-red-50' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            )}
          >
            <Icon size={17} />
            {label}
          </button>
        ))}
      </div>
    </aside>
  )
}

function DesktopAddressCard({ addr, onEdit, onDelete, onDefault, defaultPending }) {
  const label = addr.label || 'Other'
  const Icon = label.toLowerCase().includes('home') ? Home : MapPin

  return (
    <article className="rounded-2xl border border-gray-100 bg-white p-5 shadow-card">
      <div className="flex gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-pink-50 text-pink-600">
          <Icon size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-pink-50 px-2.5 py-0.5 text-xs font-black uppercase text-pink-600">{label}</span>
                {addr.is_default && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2.5 py-0.5 text-xs font-black text-green-600">
                    <Star size={11} className="fill-green-600" /> Default
                  </span>
                )}
              </div>
              <h3 className="truncate text-sm font-bold text-gray-950">{addr.address_line1}</h3>
              <p className="mt-0.5 text-sm text-gray-600">{[addr.city, addr.state].filter(Boolean).join(', ')}</p>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                <span className="inline-flex items-center gap-1.5"><User size={13} /> {addr.full_name}</span>
                <span>{addr.phone}</span>
              </div>
            </div>
            <button className="text-gray-400 hover:text-pink-600">
              <MoreHorizontal size={18} />
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <button onClick={() => onEdit(addr)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-pink-500 px-4 py-2 text-sm font-black text-pink-600">
              <Pencil size={14} /> Edit
            </button>
            <button onClick={() => onDelete(addr)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-black text-gray-600">
              <Trash2 size={14} /> Delete
            </button>
            {!addr.is_default && (
              <button
                onClick={() => onDefault(addr.id)}
                disabled={defaultPending}
                className="ml-auto inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-black text-gray-600 hover:border-pink-300 hover:text-pink-600 disabled:opacity-60"
              >
                <Star size={14} /> Set as Default
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}

// ─── AddressBook page ────────────────────────────────────────────────────────
export default function AddressBook() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user, logout } = useAuthStore()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirm, ConfirmDialog] = useConfirm()

  const { data: addresses = [], isLoading } = useQuery({
    queryKey: ['my-addresses'],
    queryFn: () => authApi.addresses.list().then((r) => r.data.results ?? r.data),
  })

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      editing ? authApi.addresses.update(editing.id, payload) : authApi.addresses.create(payload),
    onSuccess: () => {
      qc.invalidateQueries(['my-addresses'])
      toast.success(editing ? 'Address updated' : 'Address saved')
      setShowForm(false)
      setEditing(null)
    },
    onError: () => toast.error('Failed to save address'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => authApi.addresses.delete(id),
    onSuccess: () => { qc.invalidateQueries(['my-addresses']); toast.success('Address removed') },
    onError: () => toast.error('Failed to delete address'),
  })

  const defaultMutation = useMutation({
    mutationFn: (id) => authApi.addresses.setDefault(id),
    onSuccess: () => { qc.invalidateQueries(['my-addresses']); toast.success('Default address updated') },
    onError: () => toast.error('Failed to update default'),
  })

  const openNew = () => { setEditing(null); setShowForm(true) }
  const openEdit = (addr) => { setEditing(addr); setShowForm(true) }
  const removeAddress = async (addr) => {
    if (await confirm('Remove this address?', 'This action cannot be undone.')) deleteMutation.mutate(addr.id)
  }
  const handleLogout = async () => {
    const ok = await confirm('Logout?', 'Are you sure you want to sign out of your account?', {
      confirmText: 'Logout',
      icon: 'logout',
    })
    if (!ok) return
    await logout()
    navigate('/login')
  }

  return (
    <>
      <div className="mx-auto hidden w-full max-w-[1440px] lg:flex">
        <DesktopAccountSidebar onNavigate={navigate} onLogout={handleLogout} />

        <main className="min-w-0 flex-1 p-6">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-gray-950">My Addresses</h1>
              <p className="mt-1 text-sm text-gray-500">Manage your saved addresses for faster checkout.</p>
            </div>
            <button onClick={openNew} className="inline-flex items-center gap-2 rounded-xl bg-pink-600 px-5 py-2.5 text-sm font-black text-white shadow-sm shadow-pink-100 transition hover:bg-pink-700">
              <Plus size={16} /> Add New Address
            </button>
          </div>

          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_330px]">
            <section className="space-y-6">
              {isLoading ? (
                [1, 2, 3].map((i) => <div key={i} className="h-48 animate-pulse rounded-2xl bg-gray-100" />)
              ) : addresses.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-24 text-center">
                  <MapPin size={42} className="mx-auto text-pink-300" />
                  <p className="mt-4 text-lg font-black text-gray-700">No addresses yet</p>
                  <button onClick={openNew} className="mt-5 rounded-xl bg-pink-600 px-6 py-3 text-sm font-black text-white">Add Address</button>
                </div>
              ) : (
                addresses.map((addr) => (
                  <DesktopAddressCard
                    key={addr.id}
                    addr={addr}
                    onEdit={openEdit}
                    onDelete={removeAddress}
                    onDefault={(id) => defaultMutation.mutate(id)}
                    defaultPending={defaultMutation.isPending}
                  />
                ))
              )}
            </section>

            <aside className="h-fit min-h-[270px] rounded-2xl border border-pink-100 bg-gradient-to-br from-white to-pink-50 p-8">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-pink-100 text-pink-600">
                <MapPin size={36} />
              </div>
              <h2 className="mt-8 text-2xl font-black text-pink-600">Need help?</h2>
              <p className="mt-5 text-lg font-semibold leading-8 text-gray-600">You can add up to 10 addresses to your account.</p>
            </aside>
          </div>
        </main>
      </div>

      <div className="mx-auto min-h-screen max-w-lg bg-white lg:hidden">

      {/* Header */}
      <div className="grid min-h-[64px] grid-cols-[44px_1fr_auto] items-center gap-3 border-b border-gray-100 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <button onClick={() => navigate('/profile')} className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-50 text-gray-800 active:scale-95">
          <ChevronLeft size={22} />
        </button>
        <h1 className="min-w-0 truncate text-center text-base font-black text-gray-950">Addresses</h1>
        <div className="flex items-center justify-end gap-2">
          <button className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-50 text-gray-500 active:scale-95"><Search size={19} /></button>
          <button onClick={openNew} className="h-11 rounded-full bg-pink-600 px-4 text-sm font-black text-white shadow-sm shadow-pink-100 active:scale-95">Add</button>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-1 px-4 pt-4">
          {[1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />)}
        </div>
      ) : addresses.length === 0 ? (
        <div className="flex flex-col items-center py-24 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-pink-50">
            <MapPin size={28} className="text-pink-400" />
          </div>
          <p className="font-semibold text-gray-800">No addresses yet</p>
          <p className="mt-1 text-sm text-gray-400">Add a delivery address to speed up checkout.</p>
          <button
            onClick={openNew}
            className="mt-6 rounded-full bg-pink-600 px-8 py-3 text-sm font-semibold text-white hover:bg-pink-700"
          >
            Add Address
          </button>
        </div>
      ) : (
        <div>
          {addresses.map((addr) => (
            <div key={addr.id} className="border-b border-gray-100 px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-xs text-gray-400">
                    {addr.country}{addr.state ? ` · ${addr.state}` : ''}{addr.city ? ` · ${addr.city}` : ''}
                  </p>
                  <p className="text-sm font-bold leading-snug text-gray-900">
                    {addr.address_line1}{addr.address_line2 ? `, ${addr.address_line2}` : ''}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="text-sm text-gray-700">{addr.full_name}</span>
                    <span className="text-sm text-gray-500">{addr.phone}</span>
                    {addr.is_default && (
                      <span className="rounded bg-pink-50 px-1.5 py-0.5 text-[11px] font-semibold text-pink-600">
                        Default
                      </span>
                    )}
                  </div>
                  {!addr.is_default && (
                    <div className="mt-2 flex gap-3">
                      <button
                        onClick={() => defaultMutation.mutate(addr.id)}
                        disabled={defaultMutation.isPending}
                        className="text-xs text-pink-600 underline-offset-2 hover:underline disabled:opacity-50"
                      >
                        Set as default
                      </button>
                      <button
                      onClick={() => removeAddress(addr)}
                        className="text-xs text-gray-400 underline-offset-2 hover:text-red-500 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => openEdit(addr)}
                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:border-pink-300 hover:text-pink-600"
                >
                  <Pencil size={14} />
                </button>
              </div>
            </div>
          ))}
          <p className="py-8 text-center text-sm text-gray-400">You've reached the end</p>
        </div>
      )}

      </div>

      {showForm && (
        <AddressForm
          address={editing}
          onSave={(payload) => saveMutation.mutate(payload)}
          onClose={() => { setShowForm(false); setEditing(null) }}
          isSaving={saveMutation.isPending}
        />
      )}
      {ConfirmDialog}
    </>
  )
}
