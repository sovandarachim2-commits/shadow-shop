import { useState, useMemo, useEffect } from 'react'
import { Trash2, Camera, Image as ImageIcon, X } from 'lucide-react'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { variantKey } from '@/utils/productVariants'
import { getColorHex } from '@/utils/colorMap'

const clothingFieldConfigs = [
  {
    key: 'clothing_gender',
    label: 'Gender / ភេទ',
    placeholder: 'Select Gender / ជ្រើសរើសភេទ',
    options: [
      { value: 'men', label: 'Men / បុរស' },
      { value: 'women', label: 'Women / នារី' },
      { value: 'unisex', label: 'Unisex / ទូទៅ' },
      { value: 'kids', label: 'Kids / កុមារ' },
    ],
  },
  {
    key: 'clothing_type',
    label: 'Item Type / ប្រភេទផលិតផល',
    placeholder: 'Select Item Type / ជ្រើសរើសប្រភេទផលិតផល',
    options: [
      {
        group: '👕 Tops & Clothing / សម្លៀកបំពាក់ផ្នែកលើ',
        items: [
          { value: 't-shirt', label: 'T-Shirt / អាវយឺត' },
          { value: 'shirt', label: 'Shirt / អាវសាច់ក្រណាត់' },
          { value: 'polo', label: 'Polo / អាវប៉ូឡូ' },
          { value: 'hoodie', label: 'Hoodie / អាវរងាមានមួក' },
          { value: 'sweater', label: 'Sweater / អាវរងា' },
          { value: 'jacket', label: 'Jacket / អាវធំ-អាវក្រៅ' },
          { value: 'coat', label: 'Coat / អាវក្រៅវែង' },
          { value: 'dress', label: 'Dress / រ៉ូប' },
        ],
      },
      {
        group: '👖 Bottoms / សម្លៀកបំពាក់ផ្នែកក្រោម',
        items: [
          { value: 'jeans', label: 'Jeans / ខោខូវប៊យ' },
          { value: 'trousers', label: 'Trousers / ខោជើងវែងសាច់ក្រណាត់' },
          { value: 'pants', label: 'Pants / ខោជើងវែង' },
          { value: 'shorts', label: 'Shorts / ខោខ្លី' },
          { value: 'skirt', label: 'Skirt / សំពត់' },
        ],
      },
      {
        group: '👟 Shoes & Footwear / ស្បែកជើង',
        items: [
          { value: 'shoes', label: 'Shoes / ស្បែកជើង' },
          { value: 'sneakers', label: 'Sneakers / ស្បែកជើងប៉ាតា' },
          { value: 'running-shoes', label: 'Running Shoes / ស្បែកជើងកីឡា' },
          { value: 'boots', label: 'Boots / ស្បែកជើងកវែង' },
          { value: 'sandals', label: 'Sandals / ស្បែកជើងកន្ត្រក' },
          { value: 'heels', label: 'Heels / ស្បែកជើងកែង' },
          { value: 'loafers', label: 'Loafers / ស្បែកជើងស្បែក' },
          { value: 'slippers', label: 'Slippers / Slides / ស្បែកជើងផ្ទាត់' },
          { value: 'flats', label: 'Flats / ស្បែកជើងបាតរាប' },
        ],
      },
      {
        group: '🧢 Accessories / គ្រឿងតុបតែង',
        items: [
          { value: 'cap-hat', label: 'Cap / Hat / មួក' },
          { value: 'socks', label: 'Socks / ស្រោមជើង' },
          { value: 'belt', label: 'Belt / ខ្សែក្រវាត់' },
          { value: 'bag', label: 'Bag / កាបូប' },
        ],
      },
    ],
  },
  {
    key: 'clothing_material',
    label: 'Material / សាច់ក្រណាត់ និងសម្ភារៈ',
    placeholder: 'Select Material / ជ្រើសរើសសាច់ក្រណាត់ ឬសម្ភារៈ',
    options: [
      {
        group: 'Fabric & Textiles / សាច់ក្រណាត់',
        items: [
          { value: 'cotton', label: 'Cotton / សាច់កប្បាស' },
          { value: 'polyester', label: 'Polyester / ប៉ូលីអែស្ទ័រ' },
          { value: 'denim', label: 'Denim / ខូវប៊យ' },
          { value: 'linen', label: 'Linen / សរសៃអំបោះ' },
          { value: 'silk', label: 'Silk / សូត្រ' },
          { value: 'wool', label: 'Wool / រោមចៀម' },
          { value: 'fleece', label: 'Fleece / សាច់កម្ញី' },
        ],
      },
      {
        group: 'Footwear & Leather / ស្បែក និងសម្ភារៈស្បែកជើង',
        items: [
          { value: 'leather', label: 'Leather / ស្បែកសុទ្ធ' },
          { value: 'suede', label: 'Suede / ស្បែកកម្ញី' },
          { value: 'canvas', label: 'Canvas / ក្រណាត់ផ្ទាំងក្រាស់' },
          { value: 'mesh', label: 'Mesh / សំណាញ់' },
          { value: 'rubber', label: 'Rubber / កៅស៊ូ' },
          { value: 'synthetic', label: 'Synthetic / ស្បែកសំយោគ' },
        ],
      },
    ],
  },
  {
    key: 'clothing_fit',
    label: 'Fit & Width / ទម្រង់ និងទទឹង',
    placeholder: 'Select Fit / ជ្រើសរើសទម្រង់',
    options: [
      {
        group: 'Clothing Fit / ទម្រង់សម្លៀកបំពាក់',
        items: [
          { value: 'regular', label: 'Regular / ទម្រង់ធម្មតា' },
          { value: 'slim', label: 'Slim / រាងរឹប' },
          { value: 'oversized', label: 'Oversized / រាងធំទូលាយ' },
          { value: 'loose', label: 'Loose / រលុង' },
        ],
      },
      {
        group: 'Shoe Width & Fit / ទម្រង់ និងទទឹងស្បែកជើង',
        items: [
          { value: 'standard', label: 'Standard / ស្តង់ដារ' },
          { value: 'wide', label: 'Wide Fit / ទម្រង់ទូលាយ' },
          { value: 'narrow', label: 'Narrow Fit / ទម្រង់តូច' },
          { value: 'extra-wide', label: 'Extra Wide / ទម្រង់ធំពិសេស' },
        ],
      },
    ],
  },
]

const sizePresets = [
  { id: 'clothing', label: 'Clothing / សម្លៀកបំពាក់ (XS - 3XL)', sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', 'One Size'] },
  { id: 'shoes_eu', label: 'Shoes EU / ស្បែកជើង EU (36 - 46)', sizes: ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46'] },
  { id: 'shoes_us', label: 'Shoes US / ស្បែកជើង US (5 - 12)', sizes: ['5', '6', '7', '8', '9', '10', '11', '12'] },
]

const suggestedColors = [
  'Black / ខ្មៅ',
  'White / ស',
  'Blue / ខៀវ',
  'Red / ក្រហម',
  'Green / បៃតង',
  'Gray / ប្រផេះ',
  'Pink / ផ្កាឈូក',
  'Beige / បន៍ត្នោតខ្ចី',
  'Brown / ត្នោត',
  'Navy / ទឹកប៊ិច',
]

function parseOptions(value) {
  const options = new Map()
  for (const item of (value || '').split(',')) {
    const label = item.trim().replace(/\s+/g, ' ')
    if (label) options.set(label.toLowerCase(), label)
  }
  return [...options.values()]
}

function SelectOrCustomInput({ label, placeholder, name, value, onChange, options }) {
  const flatOptionList = useMemo(() => {
    return options.flatMap((opt) => (typeof opt === 'object' && opt.items ? opt.items : [opt]))
  }, [options])

  const matchesPreset = useMemo(() => {
    if (!value || value === '__custom__') return false
    const valLower = String(value).toLowerCase().trim()
    return flatOptionList.some((opt) => {
      const optVal = typeof opt === 'object' ? opt.value : opt
      const optLabel = typeof opt === 'object' ? opt.label : opt
      return optVal.toLowerCase() === valLower || optLabel.toLowerCase() === valLower
    })
  }, [value, flatOptionList])

  const [isCustomMode, setIsCustomMode] = useState(() => Boolean(value && !matchesPreset))

  useEffect(() => {
    if (value && !matchesPreset) {
      setIsCustomMode(true)
    }
  }, [value, matchesPreset])

  const selectedValue = useMemo(() => {
    if (!value || isCustomMode) return ''
    const valLower = String(value).toLowerCase().trim()
    const found = flatOptionList.find((opt) => {
      const optVal = typeof opt === 'object' ? opt.value : opt
      const optLabel = typeof opt === 'object' ? opt.label : opt
      return optVal.toLowerCase() === valLower || optLabel.toLowerCase() === valLower
    })
    return found ? (typeof found === 'object' ? found.value : found) : ''
  }, [value, flatOptionList, isCustomMode])

  const handleSelectChange = (e) => {
    const val = e.target.value
    if (val === '__custom__') {
      setIsCustomMode(true)
      if (matchesPreset) {
        onChange(name, '')
      }
    } else {
      setIsCustomMode(false)
      onChange(name, val)
    }
  }

  const selectCurrentValue = isCustomMode ? '__custom__' : selectedValue.toLowerCase()

  return (
    <div className="space-y-1.5">
      <label className="label !mb-0">{label}</label>

      <select
        className="select-field appearance-auto bg-white"
        value={selectCurrentValue}
        onChange={handleSelectChange}
      >
        <option value="">{placeholder || `Select ${label}`}</option>
        {options.map((opt) => {
          if (typeof opt === 'object' && opt.group) {
            return (
              <optgroup key={opt.group} label={opt.group}>
                {opt.items.map((item) => (
                  <option key={item.value || item} value={item.value || item}>
                    {item.label || item}
                  </option>
                ))}
              </optgroup>
            )
          }
          const val = typeof opt === 'object' ? opt.value : opt
          const lbl = typeof opt === 'object' ? opt.label : opt
          return (
            <option key={val} value={val}>
              {lbl}
            </option>
          )
        })}
        <option value="__custom__" className="font-semibold text-purple-700">
          + Other (Add custom) / ផ្សេងៗ (បន្ថែមថ្មី)...
        </option>
      </select>

      {isCustomMode && (
        <div className="relative flex items-center">
          <input
            type="text"
            autoFocus
            maxLength={80}
            className="input-field pr-9 text-sm"
            value={value === '__custom__' ? '' : (value || '')}
            placeholder={`Enter custom ${label.toLowerCase()} / បញ្ចូលផ្ទាល់ខ្លួន...`}
            onChange={(e) => onChange(name, e.target.value)}
          />
          <button
            type="button"
            title="Cancel custom / បោះបង់"
            onClick={() => {
              setIsCustomMode(false)
              onChange(name, '')
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}

function VariantOptions({ label, value, onChange, options }) {
  const selected = parseOptions(value)

  const toggle = (option) => {
    const isOption = (item) => item.toLowerCase() === option.toLowerCase()
    const next = selected.some(isOption) ? selected.filter((item) => !isOption(item)) : [...selected, option]
    onChange(next.join(', '))
  }

  return (
    <fieldset className="space-y-2">
      <legend className="label">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const pressed = selected.some((item) => item.toLowerCase() === option.toLowerCase())
          const hex = getColorHex(option)
          return (
            <button
              key={option}
              type="button"
              aria-pressed={pressed}
              onClick={() => toggle(option)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs transition ${
                pressed ? 'border-purple-500 bg-purple-50 font-bold text-purple-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {hex && (
                <span
                  className="h-3 w-3 shrink-0 rounded-full border border-black/15 shadow-2xs"
                  style={{ backgroundColor: hex }}
                  aria-hidden="true"
                />
              )}
              <span>{option}</span>
            </button>
          )
        })}
      </div>
      <input
        className="input-field"
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={options.slice(0, 3).join(', ')}
      />
    </fieldset>
  )
}

export default function ClothingFields({ form, set, isClothing, error }) {
  const [confirm, ConfirmDialog] = useConfirm()
  const [sizes, setSizes] = useState(() => [...new Set(form.variants.map((row) => row.size))].join(', '))
  const [colors, setColors] = useState(() => [...new Set(form.variants.map((row) => row.color))].join(', '))
  const [activeSizePreset, setActiveSizePreset] = useState('clothing')
  const [generatorError, setGeneratorError] = useState('')

  const activeSizesList = useMemo(() => {
    return sizePresets.find((p) => p.id === activeSizePreset)?.sizes || sizePresets[0].sizes
  }, [activeSizePreset])

  const generate = () => {
    const sizeOptions = parseOptions(sizes)
    const colorOptions = parseOptions(colors)
    if (!sizeOptions.length || !colorOptions.length) {
      setGeneratorError('Enter at least one size and one color. / សូមបញ្ចូលយ៉ាងហោចណាស់ទំហំមួយ និងពណ៌មួយ។')
      return
    }
    if (sizeOptions.length * colorOptions.length > 100) {
      setGeneratorError('A product can have up to 100 variants. / ផលិតផលអាចមានវ៉ារ្យ៉ង់អតិបរមា ១០០។')
      return
    }
    const combinations = new Map(form.variants.map((row) => [variantKey(row.size, row.color), row]))
    for (const size of sizeOptions) {
      for (const color of colorOptions) {
        const key = variantKey(size, color)
        if (!combinations.has(key)) {
          combinations.set(key, { size, color, sku: '', retail_price: '', cost_price: '', initial_stock: '', is_active: true })
        }
      }
    }
    if (combinations.size > 100) {
      setGeneratorError('A product can have up to 100 variants. / ផលិតផលអាចមានវ៉ារ្យ៉ង់អតិបរមា ១០០។')
      return
    }
    set('variants', [...combinations.values()])
    setGeneratorError('')
  }

  const changeVariant = (index, changes) => {
    set('variants', form.variants.map((row, i) => (i === index ? { ...row, ...changes } : row)))
  }

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      {isClothing && (
        <>
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Clothing & Footwear Information / ព័ត៌មានសម្លៀកបំពាក់ និងស្បែកជើង</h3>
              <p className="text-xs text-gray-500">Preset options & custom entry / ជម្រើសកំណត់ជាមុន និងការបញ្ចូលផ្ទាល់ខ្លួន</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {clothingFieldConfigs.map((cfg) => (
              <SelectOrCustomInput
                key={cfg.key}
                label={cfg.label}
                placeholder={cfg.placeholder}
                name={cfg.key}
                value={form[cfg.key]}
                options={cfg.options}
                onChange={set}
              />
            ))}
          </div>
        </>
      )}

      <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-800">
        <span>Enable Variants (Sizes & Colors) / បើកដំណើរការវ៉ារ្យ៉ង់ (ទំហំ និងពណ៌)</span>
        <input
          type="checkbox"
          name="variants"
          checked={form.variants_enabled}
          onChange={(event) => set('variants_enabled', event.target.checked)}
          className="h-4 w-4 accent-purple-600"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'product-form-variants-error' : undefined}
        />
      </label>
      {error && <p id="product-form-variants-error" role="alert" className="text-xs font-medium text-red-600">{error}</p>}
      {form.variants_enabled && (
        <>
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-xs font-bold text-gray-600 mr-1">Quick Size Presets / ជម្រើសទំហំរហ័ស:</span>
            {sizePresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setActiveSizePreset(preset.id)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  activeSizePreset === preset.id
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="grid items-start gap-3 sm:grid-cols-2">
            <VariantOptions label="Sizes / ទំហំ" value={sizes} onChange={setSizes} options={activeSizesList} />
            <VariantOptions label="Colors / ពណ៌" value={colors} onChange={setColors} options={suggestedColors} />
          </div>
          <button type="button" className="btn-secondary" onClick={generate}>
            Generate Variants / បង្កើតវ៉ារ្យ៉ង់
          </button>
          <p className="text-xs text-gray-500">
            Separate custom sizes and colors with commas. Leave prices blank to use product prices. / បំបែកទំហំ និងពណ៌ដោយសញ្ញាក្បៀស (,)។
          </p>
          {generatorError && <p role="alert" className="text-sm text-red-600">{generatorError}</p>}
          {form.variants.map((row, index) => {
            const previewSrc = row.previewUrl || row.image_url
            return (
              <fieldset key={variantKey(row.size, row.color)} className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-2xs">
                <legend className="px-1 text-sm font-bold text-gray-800">
                  {row.size} / {row.color}
                </legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label>
                    <span className="label">SKU</span>
                    <input
                      maxLength={50}
                      className="input-field"
                      value={row.sku}
                      placeholder="Auto-generated if empty"
                      onChange={(event) => changeVariant(index, { sku: event.target.value })}
                    />
                  </label>
                  {row.id ? (
                    <div>
                      <span className="label">Current Stock / ស្តុកបច្ចុប្បន្ន</span>
                      <span className="text-sm font-semibold text-gray-900">{row.current_stock} in Inventory</span>
                    </div>
                  ) : (
                    <label>
                      <span className="label">Initial Stock / ស្តុកដំបូង</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        className="input-field"
                        value={row.initial_stock}
                        placeholder="0"
                        onChange={(event) => changeVariant(index, { initial_stock: event.target.value })}
                      />
                    </label>
                  )}
                  <label>
                    <span className="label">Retail Price ($) / តម្លៃលក់រាយ</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="input-field"
                      value={row.retail_price}
                      placeholder={form.retail_price || 'Product price'}
                      onChange={(event) => changeVariant(index, { retail_price: event.target.value })}
                    />
                  </label>
                  <label>
                    <span className="label">Cost Price ($) / តម្លៃដើម</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="input-field"
                      value={row.cost_price}
                      placeholder={form.cost_price || 'Product cost'}
                      onChange={(event) => changeVariant(index, { cost_price: event.target.value })}
                    />
                  </label>
                </div>

                <div className="mt-3.5 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-3">
                  {/* Variant Image preview & upload */}
                  <div className="flex items-center gap-2">
                    {previewSrc ? (
                      <div className="group relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 shadow-2xs">
                        <img
                          src={previewSrc}
                          alt={`${row.color} / ${row.size}`}
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          title="Remove image / លុបរូបភាព"
                          onClick={() => changeVariant(index, { imageFile: null, previewUrl: null, image_url: '' })}
                          className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 transition group-hover:opacity-100"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 text-gray-400">
                        <ImageIcon size={18} />
                      </div>
                    )}

                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-3 py-2 text-xs font-semibold text-purple-700 shadow-2xs transition hover:bg-purple-100">
                      <Camera size={14} />
                      <span>{previewSrc ? 'Change / ប្តូររូប' : 'Upload Image / ជ្រើសរូបភាព'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0]
                          if (file) {
                            changeVariant(index, {
                              imageFile: file,
                              previewUrl: URL.createObjectURL(file),
                            })
                          }
                        }}
                      />
                    </label>
                  </div>

                  {/* Active status */}
                  <label className="inline-flex cursor-pointer items-center gap-2 select-none rounded-xl border border-gray-200 bg-gray-50/80 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-100">
                    <input
                      type="checkbox"
                      checked={row.is_active}
                      onChange={(event) => changeVariant(index, { is_active: event.target.checked })}
                      className="h-4 w-4 rounded accent-purple-600 cursor-pointer"
                    />
                    <span>Active / សកម្ម</span>
                  </label>

                  {/* Delete Icon Button with Confirmation */}
                  <button
                    type="button"
                    title="Delete Variant / លុបវ៉ារ្យ៉ង់"
                    aria-label="Delete variant"
                    onClick={async () => {
                      const ok = await confirm(
                        'Delete Variant / លុបវ៉ារ្យ៉ង់?',
                        `Are you sure you want to delete variant "${row.size} / ${row.color}"? This cannot be undone.`
                      )
                      if (ok) {
                        set('variants', form.variants.filter((_, i) => i !== index))
                      }
                    }}
                    className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600 shadow-2xs transition hover:border-red-300 hover:bg-red-100 hover:text-red-700"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </fieldset>
            )
          })}
          {ConfirmDialog}
        </>
      )}
    </section>
  )
}
