import { useState } from 'react'
import { Trash2, AlertTriangle } from 'lucide-react'

function ConfirmDialogUI({ message, description, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
            <Trash2 size={24} className="text-red-500" />
          </div>
          <h3 className="text-base font-black text-gray-950">{message}</h3>
          {description && (
            <p className="mt-1.5 text-sm text-gray-500">{description}</p>
          )}
          <div className="mt-5 flex w-full gap-3">
            <button
              onClick={onCancel}
              className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-50 active:scale-[0.98]"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-red-600 active:scale-[0.98]"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function useConfirm() {
  const [state, setState] = useState(null)

  const confirm = (message, description) =>
    new Promise((resolve) => {
      setState({ message, description, resolve })
    })

  const handleConfirm = () => {
    state?.resolve(true)
    setState(null)
  }

  const handleCancel = () => {
    state?.resolve(false)
    setState(null)
  }

  const dialog = state ? (
    <ConfirmDialogUI
      message={state.message}
      description={state.description}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  ) : null

  return [confirm, dialog]
}
