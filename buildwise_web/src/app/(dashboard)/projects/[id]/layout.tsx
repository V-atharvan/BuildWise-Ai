'use client'

import { useParams, useRouter, usePathname } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Trash2, Calendar, CheckCircle2, Clock, AlertTriangle,
  RefreshCw, BarChart2, FolderOpen, Building, Eye, LayoutDashboard,
  Map, Box, Package, FileSpreadsheet, Sparkles, Upload, FileText
} from 'lucide-react'
import { projectsApi } from '@/lib/api'
import { formatDate } from '@/lib/utils'

// Load a single demo project from localStorage
function getDemoProject(id: string) {
  if (typeof window === 'undefined') return null
  try {
    const all = JSON.parse(localStorage.getItem('bw_demo_projects') || '[]')
    return all.find((p: any) => p.id === id) ?? null
  } catch { return null }
}

// Delete a demo project from localStorage
function deleteDemoProject(id: string) {
  try {
    const all = JSON.parse(localStorage.getItem('bw_demo_projects') || '[]')
    localStorage.setItem('bw_demo_projects', JSON.stringify(all.filter((p: any) => p.id !== id)))
  } catch { /* ignore */ }
}

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const pathname = usePathname()
  const qc = useQueryClient()
  const isDemo = id.startsWith('demo_proj_')

  const [demoProject, setDemoProject] = useState<any>(null)

  useEffect(() => {
    if (isDemo) {
      setDemoProject(getDemoProject(id))
    }
  }, [id, isDemo])

  // Real backend fetch
  const { data: backendProject, isLoading, error } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.get(id).then((r) => r.data),
    enabled: !isDemo,
    retry: false,
  })

  const deleteMutation = useMutation({
    mutationFn: () => projectsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      router.push('/projects')
    },
  })

  const handleDelete = () => {
    if (!confirm('Delete this project? This cannot be undone.')) return
    if (isDemo) {
      deleteDemoProject(id)
      router.push('/projects')
    } else {
      deleteMutation.mutate()
    }
  }

  const project = isDemo ? demoProject : backendProject
  const loading = isDemo ? false : isLoading
  const hasError = isDemo ? !demoProject : !!error

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-32 skeleton rounded-md" />
        <div className="h-24 skeleton rounded-3xl" />
        <div className="h-10 w-full skeleton rounded-md" />
        <div className="h-[400px] skeleton rounded-3xl" />
      </div>
    )
  }

  if (hasError || !project) {
    return (
      <div className="text-center py-20">
        <AlertTriangle className="w-14 h-14 mx-auto text-red-500 mb-4" />
        <h3 className="text-lg font-bold mb-2">Project Not Found</h3>
        <p className="text-sm text-black/40 dark:text-white/30 mb-6">
          The project may have been deleted or you don&apos;t have access to it.
        </p>
        <Link
          href="/projects"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white text-[13.5px] font-semibold transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Projects
        </Link>
      </div>
    )
  }

  const tabs = [
    { label: 'Overview', href: `/projects/${project.id}`, icon: LayoutDashboard },
    { label: 'Floor Plans (AI)', href: `/projects/${project.id}/floor-plans`, icon: Map },
    { label: '3D Building', href: `/projects/${project.id}/3d-building`, icon: Box },
    { label: 'Material Config', href: `/projects/${project.id}/material-config`, icon: Package },
    { label: 'BOQ', href: `/projects/${project.id}/boq`, icon: FileSpreadsheet },
    { label: 'AI Suggestions', href: `/projects/${project.id}/ai-suggestions`, icon: Sparkles },
  ]

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-80px)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap flex-shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href="/projects"
            className="p-2 rounded-xl border border-black/[0.08] dark:border-white/[0.08] hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h2 className="text-2xl font-black tracking-tight">{project.name}</h2>
            <p className="text-xs text-black/40 dark:text-white/35 mt-1 capitalize flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5" />
              {project.building_type?.replace('_', ' ')} · Created {formatDate(project.created_at)}
              {isDemo && (
                <span className="ml-2 px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-semibold">
                  Demo
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDelete}
            className="p-2.5 rounded-xl border border-red-500/20 text-red-500 hover:bg-red-500/5 transition-all"
            title="Delete Project"
          >
            <Trash2 className="w-[18px] h-[18px]" />
          </button>
          <Link
            href={`/upload?project_id=${project.id}`}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-[13.5px] font-semibold transition-all shadow-lg shadow-violet-600/20"
          >
            <Upload className="w-4 h-4" /> Upload Drawing
          </Link>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-black/[0.08] dark:border-white/[0.08] flex-shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 text-[13.5px] font-semibold transition-all duration-150 relative ${
                  isActive
                    ? 'border-violet-600 text-violet-600 dark:text-violet-400'
                    : 'border-transparent text-black/50 dark:text-white/40 hover:text-black/80 dark:hover:text-white/80'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Tab content area */}
      <div className="flex-grow overflow-y-auto no-scrollbar">
        {children}
      </div>
    </div>
  )
}
