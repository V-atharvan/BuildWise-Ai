'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Search, Filter, Grid3X3, List, Star, Archive,
  Trash2, Copy, FolderOpen, ArrowRight, MoreHorizontal, X,
  Building, CheckCircle, Clock, AlertCircle, Loader2
} from 'lucide-react'
import { projectsApi } from '@/lib/api'
import { formatRelativeTime, BUILDING_TYPES } from '@/lib/utils'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(2, 'Project name must be at least 2 characters'),
  description: z.string().optional(),
  building_type: z.string().min(1, 'Select a building type'),
  client_name: z.string().optional(),
  contractor_name: z.string().optional(),
  architect_name: z.string().optional(),
  engineer_name: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  prepared_by: z.string().optional(),
})
type CreateForm = z.infer<typeof createSchema>

const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-emerald-500/10 text-emerald-500',
  analyzing: 'bg-amber-500/10 text-amber-500',
  failed: 'bg-red-500/10 text-red-500',
  draft: 'bg-black/[0.06] dark:bg-white/[0.06] text-black/40 dark:text-white/30',
}

const STATUS_ICONS: Record<string, React.ElementType> = {
  completed: CheckCircle,
  analyzing: Loader2,
  failed: AlertCircle,
  draft: Clock,
}

export default function ProjectsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [demoProjects, setDemoProjects] = useState<any[]>([])
  const limit = 12
  const router = useRouter()

  function createDemoProject(name: string, buildingType: string, description?: string, metadata?: any) {
    const p = {
      id: `demo_proj_${Date.now()}`,
      name,
      building_type: buildingType,
      description: description || '',
      status: 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...metadata,
    }
    try {
      const existing = JSON.parse(localStorage.getItem('bw_demo_projects') || '[]')
      localStorage.setItem('bw_demo_projects', JSON.stringify([...existing, p]))
    } catch { /* ignore */ }
    return p
  }

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('bw_demo_projects') || '[]')
      setDemoProjects(stored)
    } catch { /* ignore */ }
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ['projects', { search, filterType, filterStatus, page }],
    queryFn: () =>
      projectsApi.list({
        search: search || undefined,
        building_type: filterType || undefined,
        status: filterStatus || undefined,
        skip: page * limit,
        limit,
      }).then((r) => r.data).catch(() => ({ items: [], total: 0 })),
    retry: false,
  })

  const createMutation = useMutation({
    mutationFn: async (d: CreateForm) => {
      try {
        const res = await projectsApi.create(d)
        return { id: res.data.id }
      } catch (err) {
        const { name, building_type, description, ...meta } = d
        const p = createDemoProject(name, building_type, description, meta)
        return { id: p.id }
      }
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      setShowCreate(false)
      reset()
      router.push(`/upload?project_id=${result.id}`)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => projectsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })

  const dupMutation = useMutation({
    mutationFn: (id: string) => projectsApi.duplicate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })

  const favMutation = useMutation({
    mutationFn: ({ id, val }: { id: string; val: boolean }) => projectsApi.update(id, { is_favorite: val }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { building_type: 'house' },
  })

  const backendProjects: any[] = data?.items ?? []
  const projects = [
    ...backendProjects,
    ...demoProjects.filter((dp) => !backendProjects.find((bp) => bp.id === dp.id)),
  ].filter((p) => {
    if (search && !p.name?.toLowerCase().includes(search.toLowerCase())) return false
    if (filterType && p.building_type !== filterType) return false
    if (filterStatus && p.status !== filterStatus) return false
    return true
  })
  const total = projects.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Projects</h2>
          <p className="text-[14px] text-black/40 dark:text-white/35 mt-1">
            {total} project{total !== 1 ? 's' : ''} total
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white text-[13.5px] font-semibold transition-all shadow-lg shadow-violet-600/20"
        >
          <Plus className="w-4 h-4" /> New Project
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30 dark:text-white/25" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
            placeholder="Search projects…"
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-[#1E1E24] border border-black/[0.07] dark:border-white/[0.07] text-[13.5px] focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15 transition-all"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => { setFilterType(e.target.value); setPage(0) }}
          className="px-3 py-2.5 rounded-2xl bg-white dark:bg-[#1E1E24] border border-black/[0.07] dark:border-white/[0.07] text-[13.5px] focus:outline-none focus:border-violet-500 transition-all"
        >
          <option value="">All Types</option>
          {BUILDING_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(0) }}
          className="px-3 py-2.5 rounded-2xl bg-white dark:bg-[#1E1E24] border border-black/[0.07] dark:border-white/[0.07] text-[13.5px] focus:outline-none focus:border-violet-500 transition-all"
        >
          <option value="">All Status</option>
          {['draft','analyzing','completed','failed'].map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
        </select>
        <div className="flex items-center rounded-2xl bg-white dark:bg-[#1E1E24] border border-black/[0.07] dark:border-white/[0.07] p-1">
          <button onClick={() => setView('grid')} className={`p-2 rounded-xl transition-all ${view === 'grid' ? 'bg-violet-600 text-white' : 'text-black/40 dark:text-white/30 hover:text-black dark:hover:text-white'}`}>
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button onClick={() => setView('list')} className={`p-2 rounded-xl transition-all ${view === 'list' ? 'bg-violet-600 text-white' : 'text-black/40 dark:text-white/30 hover:text-black dark:hover:text-white'}`}>
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Projects */}
      {isLoading ? (
        <div className={view === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4' : 'space-y-3'}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`skeleton rounded-[20px] ${view === 'grid' ? 'h-44' : 'h-16'}`} />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-20">
          <FolderOpen className="w-14 h-14 mx-auto text-black/10 dark:text-white/10 mb-4" />
          <h3 className="text-[16px] font-bold text-black/40 dark:text-white/30 mb-2">No projects found</h3>
          <p className="text-[13.5px] text-black/25 dark:text-white/20 mb-5">
            {search || filterType || filterStatus ? 'Try adjusting your filters' : 'Create your first project to get started'}
          </p>
          {!search && !filterType && !filterStatus && (
            <button onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white text-[13.5px] font-semibold transition-all">
              <Plus className="w-4 h-4" /> Create Project
            </button>
          )}
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence>
            {projects.map((project: any, i: number) => {
              const StatusIcon = (STATUS_ICONS[project.status] ?? Clock) as any
              return (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.04 }}
                  className="group bg-white dark:bg-[#1E1E24] rounded-[20px] border border-black/[0.06] dark:border-white/[0.06] p-5 hover:border-violet-500/25 hover:shadow-lg hover:shadow-violet-600/5 transition-all relative"
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-11 h-11 rounded-2xl bg-violet-500/10 flex items-center justify-center">
                      <Building className="w-5.5 h-5.5 w-[22px] h-[22px] text-violet-500" />
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => favMutation.mutate({ id: project.id, val: !project.is_favorite })}
                        className={`p-1.5 rounded-xl transition-colors ${project.is_favorite ? 'text-amber-400' : 'text-black/25 dark:text-white/20 hover:text-amber-400'}`}>
                        <Star className="w-4 h-4" fill={project.is_favorite ? 'currentColor' : 'none'} />
                      </button>
                      <div className="relative">
                        <button onClick={() => setMenuOpen(menuOpen === project.id ? null : project.id)}
                          className="p-1.5 rounded-xl text-black/25 dark:text-white/20 hover:text-black dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-all">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                        {menuOpen === project.id && (
                          <div className="absolute right-0 top-full mt-1 bg-white dark:bg-[#252530] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl shadow-xl z-20 w-40 py-1.5 overflow-hidden">
                            <button onClick={() => { dupMutation.mutate(project.id); setMenuOpen(null) }}
                              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors text-left">
                              <Copy className="w-3.5 h-3.5" /> Duplicate
                            </button>
                            <button onClick={() => { projectsApi.update(project.id, { is_archived: true }); setMenuOpen(null); qc.invalidateQueries({ queryKey: ['projects'] }) }}
                              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors text-left">
                              <Archive className="w-3.5 h-3.5" /> Archive
                            </button>
                            <button onClick={() => { deleteMutation.mutate(project.id); setMenuOpen(null) }}
                              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-red-500 hover:bg-red-500/5 transition-colors text-left">
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <Link href={`/projects/${project.id}`}>
                    <h3 className="font-bold text-[14.5px] mb-1 group-hover:text-violet-500 transition-colors truncate">
                      {project.name}
                    </h3>
                    <p className="text-[12px] text-black/35 dark:text-white/25 mb-4 capitalize">
                      {project.building_type?.replace('_', ' ')} · {formatRelativeTime(project.updated_at)}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className={`flex items-center gap-1.5 text-[11.5px] font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[project.status]}`}>
                        <StatusIcon className={`w-3 h-3 ${project.status === 'analyzing' ? 'animate-spin' : ''}`} />
                        {project.status}
                      </span>
                      <ArrowRight className="w-4 h-4 text-black/20 dark:text-white/15 group-hover:text-violet-500 transition-colors" />
                    </div>
                  </Link>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#1E1E24] rounded-[20px] border border-black/[0.06] dark:border-white/[0.06] divide-y divide-black/[0.05] dark:divide-white/[0.05] overflow-hidden">
          {projects.map((project: any) => {
            const StatusIcon = (STATUS_ICONS[project.status] ?? Clock) as any
            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-all group"
              >
                <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                  <Building className="w-4.5 h-4.5 w-[18px] h-[18px] text-violet-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] font-semibold truncate group-hover:text-violet-500 transition-colors">{project.name}</p>
                  <p className="text-[12px] text-black/35 dark:text-white/25 capitalize">{project.building_type} · {formatRelativeTime(project.updated_at)}</p>
                </div>
                <span className={`flex items-center gap-1.5 text-[11.5px] font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[project.status]}`}>
                  <StatusIcon className={`w-3 h-3 ${project.status === 'analyzing' ? 'animate-spin' : ''}`} />
                  {project.status}
                </span>
                <ArrowRight className="w-4 h-4 text-black/20 dark:text-white/15 group-hover:text-violet-500 transition-colors" />
              </Link>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
            className="px-4 py-2 rounded-xl text-[13px] font-semibold border border-black/[0.08] dark:border-white/[0.08] disabled:opacity-40 hover:border-violet-500/30 transition-all">
            Previous
          </button>
          <span className="text-[13px] text-black/40 dark:text-white/30 px-3">
            {page + 1} / {Math.ceil(total / limit)}
          </span>
          <button disabled={(page + 1) * limit >= total} onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 rounded-xl text-[13px] font-semibold border border-black/[0.08] dark:border-white/[0.08] disabled:opacity-40 hover:border-violet-500/30 transition-all">
            Next
          </button>
        </div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={(e) => e.target === e.currentTarget && setShowCreate(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-[640px] max-h-[85vh] overflow-y-auto bg-white dark:bg-[#1E1E24] rounded-[24px] border border-black/[0.07] dark:border-white/[0.07] shadow-2xl p-7"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-black">New Project</h3>
                  <p className="text-[13px] text-black/40 dark:text-white/30 mt-0.5">Fill in the details to create your project</p>
                </div>
                <button onClick={() => setShowCreate(false)} className="p-2 rounded-xl hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[13px] font-semibold text-black/60 dark:text-white/50 mb-1.5">Project Name *</label>
                    <input {...register('name')} placeholder="e.g. Shinde Residence - G+2"
                      className="w-full px-4 py-3 rounded-2xl bg-[#FAFAFC] dark:bg-[#252530] border border-black/[0.07] dark:border-white/[0.07] text-[14px] focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15 transition-all" />
                    {errors.name && <p className="mt-1 text-[12px] text-red-500">{errors.name.message}</p>}
                  </div>
                  <div>
                    <label className="block text-[13px] font-semibold text-black/60 dark:text-white/50 mb-1.5">Building Type *</label>
                    <select {...register('building_type')}
                      className="w-full px-4 py-3 rounded-2xl bg-[#FAFAFC] dark:bg-[#252530] border border-black/[0.07] dark:border-white/[0.07] text-[14px] focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15 transition-all">
                      {BUILDING_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    {errors.building_type && <p className="mt-1 text-[12px] text-red-500">{errors.building_type.message}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-black/60 dark:text-white/50 mb-1.5">Description</label>
                  <textarea {...register('description')} rows={2} placeholder="Optional notes about this project"
                    className="w-full px-4 py-3 rounded-2xl bg-[#FAFAFC] dark:bg-[#252530] border border-black/[0.07] dark:border-white/[0.07] text-[14px] focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15 transition-all resize-none" />
                </div>

                <div className="border-t border-black/[0.06] dark:border-white/[0.06] pt-4 mt-2">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-black/40 dark:text-white/30 mb-3">Project Metadata (for BOQ Report)</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[12.5px] font-semibold text-black/60 dark:text-white/50 mb-1">Client Name</label>
                      <input {...register('client_name')} placeholder="e.g. Omkar Koli"
                        className="w-full px-4 py-2.5 rounded-xl bg-[#FAFAFC] dark:bg-[#252530] border border-black/[0.07] dark:border-white/[0.07] text-[13px] focus:outline-none focus:border-violet-500 transition-all" />
                    </div>
                    <div>
                      <label className="block text-[12.5px] font-semibold text-black/60 dark:text-white/50 mb-1">Contractor Name</label>
                      <input {...register('contractor_name')} placeholder="e.g. BuildWise Infrastructure Ltd."
                        className="w-full px-4 py-2.5 rounded-xl bg-[#FAFAFC] dark:bg-[#252530] border border-black/[0.07] dark:border-white/[0.07] text-[13px] focus:outline-none focus:border-violet-500 transition-all" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                    <div>
                      <label className="block text-[12.5px] font-semibold text-black/60 dark:text-white/50 mb-1">Architect Name</label>
                      <input {...register('architect_name')} placeholder="e.g. Ar. Rajesh Mehta (AIA)"
                        className="w-full px-4 py-2.5 rounded-xl bg-[#FAFAFC] dark:bg-[#252530] border border-black/[0.07] dark:border-white/[0.07] text-[13px] focus:outline-none focus:border-violet-500 transition-all" />
                    </div>
                    <div>
                      <label className="block text-[12.5px] font-semibold text-black/60 dark:text-white/50 mb-1">Engineer Name</label>
                      <input {...register('engineer_name')} placeholder="e.g. Er. Sachin Patil (FIV)"
                        className="w-full px-4 py-2.5 rounded-xl bg-[#FAFAFC] dark:bg-[#252530] border border-black/[0.07] dark:border-white/[0.07] text-[13px] focus:outline-none focus:border-violet-500 transition-all" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                    <div>
                      <label className="block text-[12.5px] font-semibold text-black/60 dark:text-white/50 mb-1">Project Address</label>
                      <input {...register('address')} placeholder="e.g. Plot No. 45, Sector 4, Hinjewadi"
                        className="w-full px-4 py-2.5 rounded-xl bg-[#FAFAFC] dark:bg-[#252530] border border-black/[0.07] dark:border-white/[0.07] text-[13px] focus:outline-none focus:border-violet-500 transition-all" />
                    </div>
                    <div>
                      <label className="block text-[12.5px] font-semibold text-black/60 dark:text-white/50 mb-1">Prepared By</label>
                      <input {...register('prepared_by')} placeholder="e.g. Quantity Surveyor (BuildWise AI)"
                        className="w-full px-4 py-2.5 rounded-xl bg-[#FAFAFC] dark:bg-[#252530] border border-black/[0.07] dark:border-white/[0.07] text-[13px] focus:outline-none focus:border-violet-500 transition-all" />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-3">
                    <div>
                      <label className="block text-[12.5px] font-semibold text-black/60 dark:text-white/50 mb-1">City</label>
                      <input {...register('city')} placeholder="Pune"
                        className="w-full px-3 py-2.5 rounded-xl bg-[#FAFAFC] dark:bg-[#252530] border border-black/[0.07] dark:border-white/[0.07] text-[13px] focus:outline-none focus:border-violet-500 transition-all" />
                    </div>
                    <div>
                      <label className="block text-[12.5px] font-semibold text-black/60 dark:text-white/50 mb-1">State</label>
                      <input {...register('state')} placeholder="Maharashtra"
                        className="w-full px-3 py-2.5 rounded-xl bg-[#FAFAFC] dark:bg-[#252530] border border-black/[0.07] dark:border-white/[0.07] text-[13px] focus:outline-none focus:border-violet-500 transition-all" />
                    </div>
                    <div>
                      <label className="block text-[12.5px] font-semibold text-black/60 dark:text-white/50 mb-1">Country</label>
                      <input {...register('country')} placeholder="India"
                        className="w-full px-3 py-2.5 rounded-xl bg-[#FAFAFC] dark:bg-[#252530] border border-black/[0.07] dark:border-white/[0.07] text-[13px] focus:outline-none focus:border-violet-500 transition-all" />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 mt-2">
                  <button type="button" onClick={() => setShowCreate(false)}
                    className="flex-1 py-3 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] text-[14px] font-semibold hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-all">
                    Cancel
                  </button>
                  <button type="submit" disabled={isSubmitting || createMutation.isPending}
                    className="flex-1 py-3 rounded-2xl bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-[14px] font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-600/25">
                    {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Project'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
