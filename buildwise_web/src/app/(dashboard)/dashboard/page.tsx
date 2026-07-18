'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import {
  FolderOpen, CheckCircle, TrendingUp, FileText,
  Upload, ArrowRight, Clock, Plus,
} from 'lucide-react'
import { projectsApi, reportsApi } from '@/lib/api'
import { formatDate, formatRelativeTime, formatCurrency, getRecentlyOpenedReports } from '@/lib/utils'

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4 } }),
}

// ── Load demo data from localStorage ──────────────────────────────────────────
function getDemoProjects() {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem('bw_demo_projects') || '[]') } catch { return [] }
}

function getDemoReports() {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem('bw_demo_reports') || '[]') } catch { return [] }
}

export default function DashboardPage() {
  const router = useRouter()
  const [demoProjects, setDemoProjects] = useState<any[]>([])
  const [demoReports, setDemoReports] = useState<any[]>([])
  const [recentlyOpened, setRecentlyOpened] = useState<any[]>([])

  useEffect(() => {
    setDemoProjects(getDemoProjects())
    setDemoReports(getDemoReports())
    setRecentlyOpened(getRecentlyOpenedReports())
  }, [])

  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects', { limit: 5 }],
    queryFn: () => projectsApi.list({ limit: 5 }).then((r) => r.data).catch(() => ({ items: [], total: 0 })),
    retry: false,
  })

  const { data: reportsData } = useQuery({
    queryKey: ['reports', { limit: 10 }], // Fetch more to allow filtering
    queryFn: () => reportsApi.list({ limit: 10 }).then((r) => r.data).catch(() => ({ items: [], total: 0 })),
    retry: false,
  })

  // Merge backend + demo data
  const backendProjects: any[] = projectsData?.items ?? []
  const projects = [
    ...backendProjects,
    ...demoProjects.filter((dp) => !backendProjects.find((bp) => bp.id === dp.id)),
  ].slice(0, 5)

  const allProjects = [
    ...backendProjects,
    ...demoProjects.filter((dp) => !backendProjects.find((bp) => bp.id === dp.id)),
  ]
  const projectIds = new Set(allProjects.map(p => p.id))

  const backendReports: any[] = reportsData?.items ?? []
  
  // Filter reports to only keep those associated with active projects
  const filteredBackendReports = backendReports.filter(r => r.project_id && projectIds.has(r.project_id))
  const filteredDemoReports = demoReports.filter(r => r.project_id && projectIds.has(r.project_id))

  const fallbackReports = [
    ...filteredBackendReports,
    ...filteredDemoReports.filter((dr) => !filteredBackendReports.find((br) => br.id === dr.id)),
  ].slice(0, 3)

  const filteredRecentlyOpened = recentlyOpened.filter(r => r.project_id && projectIds.has(r.project_id))
  const reports = filteredRecentlyOpened.length > 0 ? filteredRecentlyOpened.slice(0, 3) : fallbackReports

  const totalProjects = projects.length
  const completedEstimates = projects.filter((p: any) => p.status === 'completed').length
  const savedReports = [
    ...filteredBackendReports,
    ...filteredDemoReports.filter((dr) => !filteredBackendReports.find((br) => br.id === dr.id)),
  ].length

  const stats = [
    {
      label: 'Total Projects', value: totalProjects,
      icon: FolderOpen, color: 'text-violet-500', bg: 'bg-violet-500/10',
      delta: `${totalProjects} total`, href: '/projects',
    },
    {
      label: 'Completed Estimates', value: completedEstimates,
      icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10',
      delta: 'All up to date', href: '/projects',
    },
    {
      label: "Today's Estimates", value: 2,
      icon: TrendingUp, color: 'text-amber-500', bg: 'bg-amber-500/10',
      delta: '+1 from yesterday', href: '/projects',
    },
    {
      label: 'Saved Reports', value: savedReports,
      icon: FileText, color: 'text-sky-500', bg: 'bg-sky-500/10',
      delta: 'Ready to download', href: '/reports',
    },
  ]

  return (
    <div className="space-y-7 pt-4">

      {/* Stats Grid — each card is clickable and routes to the right tab */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.button
            key={stat.label}
            custom={i}
            initial="hidden"
            animate="visible"
            variants={cardVariants}
            onClick={() => router.push(stat.href)}
            className="text-left bg-white dark:bg-[#1E1E24] rounded-[20px] p-5 border border-black/[0.06] dark:border-white/[0.06] hover:border-violet-500/30 hover:shadow-lg hover:shadow-violet-500/5 transition-all cursor-pointer group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 rounded-2xl ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <ArrowRight className="w-4 h-4 text-black/15 dark:text-white/10 group-hover:text-violet-500 transition-colors" />
            </div>
            <div className="text-3xl font-black tracking-tight mb-1">
              {projectsLoading ? <div className="w-12 h-8 skeleton rounded-lg" /> : stat.value}
            </div>
            <p className="text-[12.5px] text-black/45 dark:text-white/35">{stat.label}</p>
            <p className="text-[11.5px] text-emerald-500 mt-1 font-medium">{stat.delta}</p>
          </motion.button>
        ))}
      </div>

      {/* Main grid — 2 columns: Recent Projects + Recent Reports */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Projects */}
        <div className="xl:col-span-2 bg-white dark:bg-[#1E1E24] rounded-[20px] border border-black/[0.06] dark:border-white/[0.06] p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-[15px]">Recent Projects</h3>
              <p className="text-[12px] text-black/40 dark:text-white/30 mt-0.5">Your latest estimation projects</p>
            </div>
            <Link href="/projects" className="text-[12.5px] text-violet-500 font-semibold hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {projectsLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-14 skeleton rounded-2xl" />)}
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="w-10 h-10 text-black/15 dark:text-white/10 mx-auto mb-3" />
              <p className="text-[14px] font-semibold text-black/40 dark:text-white/30">No projects yet</p>
              <p className="text-[12.5px] text-black/30 dark:text-white/20">Create a project in the Projects tab to get started</p>
            </div>
          ) : (
            <div className="space-y-2">
              {projects.map((project: any) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="flex items-center gap-4 p-3.5 rounded-2xl hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                    <FolderOpen className="w-5 h-5 text-violet-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13.5px] font-semibold truncate group-hover:text-violet-500 transition-colors">
                      {project.name}
                    </p>
                    <p className="text-[12px] text-black/35 dark:text-white/25 mt-0.5">
                      {project.building_type} · {formatRelativeTime(project.updated_at)}
                    </p>
                  </div>
                  <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize ${
                    project.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' :
                    project.status === 'analyzing' ? 'bg-amber-500/10 text-amber-500' :
                    project.status === 'failed' ? 'bg-red-500/10 text-red-500' :
                    'bg-black/[0.06] dark:bg-white/[0.06] text-black/40 dark:text-white/30'
                  }`}>
                    {project.status}
                  </span>
                  <ArrowRight className="w-4 h-4 text-black/20 dark:text-white/20 group-hover:text-violet-500 transition-colors flex-shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Reports */}
        <div className="bg-white dark:bg-[#1E1E24] rounded-[20px] border border-black/[0.06] dark:border-white/[0.06] p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-[15px]">Recent Reports</h3>
            <Link href="/reports" className="text-[12px] text-violet-500 font-semibold hover:underline">
              View all
            </Link>
          </div>

          {reports.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
              <FileText className="w-10 h-10 text-black/12 dark:text-white/10 mb-3" />
              <p className="text-[13px] font-semibold text-black/35 dark:text-white/25">No reports yet</p>
              <p className="text-[12px] text-black/25 dark:text-white/15 mt-1">
                Generate a report from an estimation result
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {reports.map((r: any) => (
                <Link
                  key={r.id}
                  href="/reports"
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-all"
                >
                  <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-violet-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-semibold truncate">{r.title}</p>
                    <p className="text-[11px] text-black/30 dark:text-white/20">{formatDate(r.created_at)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
