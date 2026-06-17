import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart3,
  Bell,
  Box,
  ChevronRight,
  Gift,
  RotateCcw,
  Search,
  Truck,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { ordersApi } from '@/api/orders'

function ScannerAction({ icon: Icon, iconClass, title, subtitle, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 text-left shadow-sm transition hover:border-purple-200 hover:bg-purple-50/40"
    >
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
        <Icon size={24} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-gray-900">{title}</p>
        <p className="mt-0.5 text-xs font-medium text-gray-400">{subtitle}</p>
      </div>
      <ChevronRight size={18} className="shrink-0 text-gray-300" />
    </button>
  )
}

function SummaryTile({ value, label }) {
  return (
    <div className="flex min-h-[76px] min-w-0 flex-col items-center justify-center rounded-xl bg-white/10 px-1.5 py-2 text-center sm:min-h-[112px] sm:px-3 sm:py-4">
      <p className="text-2xl font-black leading-none text-white sm:text-3xl">{value}</p>
      <p className="mt-1 max-w-full text-[10px] font-semibold leading-tight text-purple-200 sm:text-xs">
        {label}
      </p>
    </div>
  )
}

export default function Scanner() {
  const navigate = useNavigate()

  const { data: summary } = useQuery({
    queryKey: ['scanner-summary'],
    queryFn: () => ordersApi.orders.operationSummary().then((r) => r.data),
    staleTime: 60 * 1000,
  })

  return (
    <div className="mx-auto w-full max-w-[1500px] animate-fade-in">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Scanner Dashboard</h1>
          <p className="text-sm text-gray-400">Operations overview & quick actions</p>
        </div>
        <button
          type="button"
          className="relative flex h-10 w-10 items-center justify-center rounded-xl text-gray-600 hover:bg-gray-100"
        >
          <Bell size={20} />
          <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-purple-600" />
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Summary card */}
        <div className="lg:col-span-1">
          <div className="h-full rounded-2xl bg-gradient-to-br from-purple-700 to-purple-900 p-3 shadow-lg shadow-purple-200/60 sm:p-5">
            <h2 className="mb-3 text-[11px] font-black uppercase tracking-widest text-purple-200 sm:mb-4 sm:text-xs">Today Summary</h2>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-2 sm:gap-3">
              <SummaryTile value={summary?.packed ?? 0} label="Prepare Package" />
              <SummaryTile value={summary?.shipped ?? 0} label="Out Package" />
              <SummaryTile value={summary?.sets ?? 0} label="Set" />
              <SummaryTile value={summary?.returned ?? summary?.cancelled ?? 0} label="Return" />
            </div>
          </div>
        </div>

        {/* Action panels */}
        <div className="space-y-5 lg:col-span-2">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-card">
            <h2 className="mb-4 text-xs font-black uppercase tracking-widest text-purple-700">Main Actions</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <ScannerAction
                icon={Box}
                iconClass="bg-purple-50 text-purple-700"
                title="Prepare Package"
                subtitle="Pack & take photos"
                onClick={() => navigate('/admin/prepare')}
              />
              <ScannerAction
                icon={Truck}
                iconClass="bg-green-50 text-green-600"
                title="Out Package"
                subtitle="Hand over to delivery"
                onClick={() => navigate('/admin/out-items')}
              />
              <ScannerAction
                icon={Gift}
                iconClass="bg-orange-50 text-orange-500"
                title="Prepare Set"
                subtitle="Scan INV & select set"
                onClick={() => navigate('/admin/prepare-set')}
              />
              <ScannerAction
                icon={RotateCcw}
                iconClass="bg-red-50 text-red-500"
                title="Return Items"
                subtitle="If items returned"
                onClick={() => toast.success('Return item flow coming soon')}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-card">
            <h2 className="mb-4 text-xs font-black uppercase tracking-widest text-purple-700">Reports & Data</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <ScannerAction
                icon={Search}
                iconClass="bg-blue-50 text-blue-500"
                title="Source Data"
                subtitle="View all out packages"
                onClick={() => navigate('/admin/inventory/movements')}
              />
              <ScannerAction
                icon={BarChart3}
                iconClass="bg-blue-50 text-blue-500"
                title="Report Menu"
                subtitle="View reports & send"
                onClick={() => navigate('/admin/reports/sales')}
              />
              <ScannerAction
                icon={Search}
                iconClass="bg-blue-50 text-blue-500"
                title="Search Items"
                subtitle="Browse product inventory"
                onClick={() => navigate('/admin/products')}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
