import { useState, useEffect, useRef } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import { COUNTRY_DATA, detectUserCountry, formatPhoneNumber, toE164 } from '@/utils/phoneUtils'
import { cn } from '@/utils/helpers'

export default function PhoneInput({ value, onChange, error, label, placeholder, name, required }) {
  const [isOpen, setIsOpen] = useState(false)
  const [country, setCountry] = useState(COUNTRY_DATA[0])
  const [search, setSearch] = useState('')
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handlePhoneChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value, country)
    onChange({
      target: {
        name,
        value: formatted,
        e164: toE164(formatted, country)
      }
    })
  }

  const selectCountry = (c) => {
    setCountry(c)
    setIsOpen(false)
    setSearch('')
    // Trigger re-formatting with new country mask
    const formatted = formatPhoneNumber(value, c)
    onChange({
      target: {
        name,
        value: formatted,
        e164: toE164(formatted, c)
      }
    })
  }

  const filteredCountries = COUNTRY_DATA.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.dialCode.includes(search)
  )

  return (
    <div className="w-full">
      {label && (
        <label className="mb-2.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
          {label} {required && <span className="text-pink-600 font-bold">*</span>}
        </label>
      )}
      
      <div className={cn(
        "group relative flex h-14 w-full items-center rounded-[20px] border transition-all duration-300",
        error ? "border-red-500 ring-4 ring-red-50" : "border-slate-200 bg-slate-50/50 focus-within:border-pink-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-pink-50"
      )}>
        {/* Country Selector */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex h-full items-center gap-2 border-r border-slate-200 px-4 hover:bg-slate-100/50 transition-colors rounded-l-[20px]"
        >
          <img 
            src={`https://flagcdn.com/w40/${country.code.toLowerCase()}.png`} 
            alt={country.name} 
            className="w-6 h-4 object-cover rounded-[2px] shadow-[0_1px_3px_rgba(0,0,0,0.1)]"
          />
          <span className="text-[15px] font-semibold text-slate-700">{country.dialCode}</span>
          <ChevronDown size={16} className={cn("text-slate-400 transition-transform", isOpen && "rotate-180")} />
        </button>

        {/* Phone Input */}
        <input
          type="tel"
          value={value}
          onChange={handlePhoneChange}
          placeholder={placeholder || country.mask}
          className="h-full min-w-0 flex-1 bg-transparent px-5 text-[15px] font-semibold text-slate-800 outline-none placeholder:text-slate-400"
        />

        {/* Country Dropdown */}
        {isOpen && (
          <div 
            ref={dropdownRef}
            className="absolute left-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-[24px] border border-slate-100 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] animate-in fade-in slide-in-from-top-2 duration-200"
          >
            <div className="p-3 border-b border-slate-50">
              <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                <Search size={16} className="text-slate-400" />
                <input 
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search country..."
                  className="w-full bg-transparent text-sm font-medium outline-none"
                />
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto py-1 custom-scrollbar">
              {filteredCountries.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => selectCountry(c)}
                  className="flex w-full items-center gap-3 px-4 py-3 hover:bg-pink-50 transition-colors"
                >
                  <img 
                    src={`https://flagcdn.com/w40/${c.code.toLowerCase()}.png`} 
                    alt={c.name} 
                    className="w-6 h-4 object-cover rounded-[2px] shadow-[0_1px_3px_rgba(0,0,0,0.1)]"
                  />
                  <span className="flex-1 text-left text-sm font-bold text-slate-700">{c.name}</span>
                  <span className="text-xs font-semibold text-slate-400">{c.dialCode}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1.5 px-2 text-[12px] font-semibold text-red-500 animate-fade-in">
          {error}
        </p>
      )}
    </div>
  )
}
