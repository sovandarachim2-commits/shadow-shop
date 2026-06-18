import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Mail, Phone, Save, Shield, UserCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { authApi } from '@/api/auth'
import useAuthStore from '@/store/authStore'

export default function AdminProfile() {
  const queryClient = useQueryClient()
  const updateUser = useAuthStore((state) => state.updateUser)
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
  })

  const { data: profile, isLoading } = useQuery({
    queryKey: ['admin-profile'],
    queryFn: () => authApi.me().then((response) => response.data),
  })

  useEffect(() => {
    if (!profile) return
    setForm({
      first_name: profile.first_name || '',
      last_name: profile.last_name || '',
      email: profile.email || '',
      phone: profile.phone || '',
    })
  }, [profile])

  const saveMutation = useMutation({
    mutationFn: () => authApi.updateMe(form),
    onSuccess: (response) => {
      updateUser(response.data)
      queryClient.invalidateQueries({ queryKey: ['admin-profile'] })
      toast.success('Profile updated')
    },
    onError: () => toast.error('Failed to update profile'),
  })

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const displayName = profile?.full_name || profile?.username || 'User'
  const initial = displayName.slice(0, 1).toUpperCase()

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">My Profile</h1>
          <p className="mt-0.5 text-sm text-gray-500">Manage your admin account information</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-card">
          <div className="mx-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-3xl font-black text-white shadow-lg shadow-purple-100">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={displayName} className="h-full w-full object-cover" />
            ) : (
              initial
            )}
          </div>
          <h2 className="mt-4 text-lg font-black text-gray-950">{displayName}</h2>
          <p className="text-sm font-semibold text-gray-400">@{profile?.username || 'user'}</p>
          <div className="mt-5 space-y-2 text-left">
            <div className="flex items-center gap-2 rounded-xl bg-purple-50 px-3 py-2 text-sm font-bold text-purple-700">
              <Shield size={16} />
              <span className="capitalize">{profile?.role?.replace('_', ' ') || 'Role'}</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-600">
              <Mail size={16} />
              <span className="truncate">{profile?.email || 'No email'}</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-600">
              <Phone size={16} />
              <span>{profile?.phone || 'No phone'}</span>
            </div>
          </div>
        </aside>

        <section className="rounded-2xl border border-gray-100 bg-white shadow-card">
          <div className="border-b border-gray-100 px-6 py-4">
            <div className="flex items-center gap-2">
              <UserCircle size={20} className="text-purple-600" />
              <h2 className="text-base font-black text-gray-950">Account Details</h2>
            </div>
          </div>

          <div className="grid gap-4 p-6 md:grid-cols-2">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-20 animate-pulse rounded-xl bg-gray-100" />
              ))
            ) : (
              <>
                <div>
                  <label className="label">First Name</label>
                  <input className="input-field" value={form.first_name} onChange={(event) => set('first_name', event.target.value)} />
                </div>
                <div>
                  <label className="label">Last Name</label>
                  <input className="input-field" value={form.last_name} onChange={(event) => set('last_name', event.target.value)} />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input type="email" className="input-field" value={form.email} onChange={(event) => set('email', event.target.value)} />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input className="input-field" value={form.phone} onChange={(event) => set('phone', event.target.value)} />
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end border-t border-gray-100 px-6 py-4">
            <button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={isLoading || saveMutation.isPending}
              className="btn-primary disabled:opacity-60"
            >
              <Save size={16} />
              {saveMutation.isPending ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
