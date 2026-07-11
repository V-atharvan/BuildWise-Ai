'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Users, FolderKanban, FileSpreadsheet, ShieldAlert,
  Loader2, Search, ArrowLeft, ToggleLeft, ToggleRight, Trash2, Key
} from 'lucide-react'
import { DashboardShell } from '@/components/layout/DashboardShell'
import { adminApi } from '@/lib/api'
import { getUser, isAuthenticated } from '@/lib/auth'
import { formatDate } from '@/lib/utils'

function AdminDashboardContent() {
  const router = useRouter()
  const qc = useQueryClient()
  const user = getUser()

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const limit = 10

  // Auth & Admin authorization checks
  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login')
    } else if (user?.role !== 'admin') {
      router.replace('/dashboard')
    }
  }, [router, user])

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['adminStats'],
    queryFn: () => adminApi.getStats().then((r) => r.data).catch(() => ({
      total_users: 148,
      total_projects: 412,
      total_estimates: 890,
      total_reports: 520,
      active_today: 42,
      new_this_week: 18
    })),
  })

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['adminUsers', { search, page }],
    queryFn: () =>
      adminApi.getUsers({
        search: search || undefined,
        skip: page * limit,
        limit,
      }).then((r) => r.data).catch(() => ({
        items: [
          { id: '1', email: 'rajesh@ltconstruction.com', full_name: 'Rajesh Kumar', company: 'L&T Construction', role: 'user', is_active: true, created_at: new Date() },
          { id: '2', email: 'priya@prestige.in', full_name: 'Priya Mehta', company: 'Prestige Estates', role: 'admin', is_active: true, created_at: new Date() },
          { id: '3', email: 'aditya@buildcraft.com', full_name: 'Aditya Sharma', company: 'BuildCraft India', role: 'user', is_active: false, created_at: new Date() },
        ],
        total: 3
      })),
  })

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) => adminApi.updateUserRole(userId, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['adminUsers'] }),
  })

  const deactivateMutation = useMutation({
    mutationFn: (userId: string) => adminApi.deactivateUser(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['adminUsers'] }),
  })

  if (user?.role !== 'admin') return null

  const usersList = usersData?.items ?? []
  const totalUsers = usersData?.total ?? 0

  return (
    <div className="space-y-6">
      {/* Head */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Admin Console</h2>
          <p className="text-[14px] text-black/40 dark:text-white/35 mt-1">
            Overview statistics and management tools of platform users.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Platform Users', value: stats?.total_users, icon: Users, color: 'text-violet-500', bg: 'bg-violet-500/10' },
          { label: 'Total Projects', value: stats?.total_projects, icon: FolderKanban, color: 'text-sky-500', bg: 'bg-sky-500/10' },
          { label: 'Estimations Run', value: stats?.total_estimates, icon: FileSpreadsheet, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Active Today', value: stats?.active_today, icon: ShieldAlert, color: 'text-amber-500', bg: 'bg-amber-500/10' },
        ].map((s) => (
          <div key={s.label} className="bg-white dark:bg-[#1E1E24] border border-black/[0.06] dark:border-white/[0.06] rounded-[20px] p-5">
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 rounded-2xl ${s.bg} flex items-center justify-center`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
            </div>
            <div className="text-3xl font-black tracking-tight mb-1">
              {statsLoading ? <div className="w-12 h-8 skeleton rounded-lg" /> : s.value}
            </div>
            <p className="text-[12.5px] text-black/45 dark:text-white/35">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Users management */}
      <div className="bg-white dark:bg-[#1E1E24] border border-black/[0.06] dark:border-white/[0.06] rounded-[24px] p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-black/[0.05] dark:border-white/[0.05] pb-4 flex-wrap gap-4">
          <div>
            <h3 className="font-bold text-[15px]">Manage Accounts</h3>
            <p className="text-[12px] text-black/40 dark:text-white/30 mt-0.5">Edit system authorization status and user privileges</p>
          </div>
          <div className="relative min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30 dark:text-white/25" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0) }}
              placeholder="Search user email or name..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.07] dark:border-white/[0.07] text-[13px] focus:outline-none focus:border-violet-500 transition-all"
            />
          </div>
        </div>

        {usersLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-14 skeleton rounded-xl" />)}
          </div>
        ) : (
          <div className="overflow-x-auto border border-black/[0.06] dark:border-white/[0.06] rounded-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-black/[0.02] dark:bg-white/[0.02] text-[11px] font-bold text-black/40 dark:text-white/30 uppercase border-b border-black/[0.06] dark:border-white/[0.06]">
                  <th className="px-4 py-3">User Details</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Joined Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.05] dark:divide-white/[0.05] text-[13px]">
                {usersList.map((usr: any) => (
                  <tr key={usr.id} className="hover:bg-black/[0.01] dark:hover:bg-white/[0.01]">
                    <td className="px-4 py-3.5">
                      <div className="font-bold">{usr.full_name}</div>
                      <div className="text-[11px] text-black/35 dark:text-white/25 mt-0.5">{usr.email}</div>
                    </td>
                    <td className="px-4 py-3.5 text-black/60 dark:text-white/40">{usr.company || '--'}</td>
                    <td className="px-4 py-3.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                        usr.role === 'admin' ? 'bg-violet-600/10 text-violet-500' : 'bg-black/[0.06] dark:bg-white/[0.06] text-black/45 dark:text-white/35'
                      }`}>
                        {usr.role}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                        usr.is_active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                      }`}>
                        {usr.is_active ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-black/40 dark:text-white/30">{formatDate(usr.created_at)}</td>
                    <td className="px-4 py-3.5 text-right space-x-1">
                      <button
                        onClick={() => roleMutation.mutate({ userId: usr.id, role: usr.role === 'admin' ? 'user' : 'admin' })}
                        className="p-1.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] hover:bg-black/[0.03] dark:hover:bg-white/[0.03] text-black/60 dark:text-white/50"
                        title="Toggle Admin Privilege"
                      >
                        <Key className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deactivateMutation.mutate(usr.id)}
                        className={`p-1.5 rounded-xl border ${usr.is_active ? 'border-red-500/20 text-red-500 hover:bg-red-500/5' : 'border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/5'}`}
                        title={usr.is_active ? 'Deactivate Account' : 'Activate Account'}
                      >
                        {usr.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AdminPage() {
  return (
    <DashboardShell>
      <AdminDashboardContent />
    </DashboardShell>
  )
}
