import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Box,
  ChevronRight,
  Gift,
  RotateCcw,
  Truck,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { ordersApi } from '@/api/orders'
import { useRolePermission } from '@/utils/permissions'

function ScannerAction({ icon: Icon, iconClass, title, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-[112px] w-full items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-purple-300 hover:shadow-md active:bg-purple-50/50 disabled:cursor-not-allowed disabled:opacity-45 sm:min-h-[96px]"
    >
      <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
        <Icon size={28} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-base font-black leading-tight text-gray-950 sm:text-sm">{title}</p>
      </div>
      <ChevronRight size={18} className="shrink-0 text-gray-300" />
    </button>
  )
}

function SummaryTile({ value, label }) {
  return (
    <div className="flex min-h-[72px] min-w-0 flex-col items-center justify-center rounded-lg bg-white/10 px-1.5 py-2 text-center sm:min-h-[82px] sm:px-3">
      <p className="text-2xl font-black leading-none text-white sm:text-3xl">{value}</p>
      <p className="mt-1 max-w-full text-[10px] font-semibold leading-tight text-purple-200 sm:text-xs">
        {label}
      </p>
    </div>
  )
}

export default function Scanner() {
  const navigate = useNavigate()
  const { allowed: canCreateScanner } = useRolePermission('scanner', 'create')

  const { data: summary } = useQuery({
    queryKey: ['scanner-summary'],
    queryFn: () => ordersApi.orders.operationSummary().then((r) => r.data),
    staleTime: 60 * 1000,
  })

  return (
    <div className="mx-auto w-full max-w-[1500px] animate-fade-in">
      <div className="space-y-7">
        <section className="rounded-lg bg-gradient-to-r from-purple-800 to-purple-600 p-3 shadow-sm sm:p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-widest text-purple-100">Today Summary</h2>
            <span className="text-xs font-semibold text-purple-200">Live operations</span>
          </div>
          <div className="grid grid-cols-4 gap-2 sm:gap-3">
            <SummaryTile value={summary?.packed ?? 0} label="Prepare Package" />
            <SummaryTile value={summary?.shipped ?? 0} label="Out Package" />
            <SummaryTile value={summary?.sets ?? 0} label="Set" />
            <SummaryTile value={summary?.returned ?? summary?.cancelled ?? 0} label="Return" />
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-xs font-black uppercase tracking-widest text-purple-700">Main Actions</h2>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <ScannerAction
              icon={Box}
              iconClass="bg-purple-50 text-purple-700"
              title="Prepare Package"
              onClick={() => navigate('/admin/prepare')}
              disabled={!canCreateScanner}
            />
            <ScannerAction
              icon={Truck}
              iconClass="bg-green-50 text-green-600"
              title="Out Package"
              onClick={() => navigate('/admin/out-items')}
              disabled={!canCreateScanner}
            />
            <ScannerAction
              icon={Gift}
              iconClass="bg-orange-50 text-orange-500"
              title="Prepare Set"
              onClick={() => navigate('/admin/prepare-set')}
              disabled={!canCreateScanner}
            />
            <ScannerAction
              icon={RotateCcw}
              iconClass="bg-red-50 text-red-500"
              title="Return Items"
              onClick={() => toast.success('Return item flow coming soon')}
            />
          </div>
        </section>

      </div>

    </div>
  )
}
