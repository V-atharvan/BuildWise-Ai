'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  FolderOpen, CheckCircle, TrendingUp, FileText,
  Upload, ArrowRight, Clock, Plus, BarChart3,
} from 'lucide-react'
import { projectsApi, reportsApi } from '@/lib/api'
import { formatDate, formatRelativeTime, formatCurrency } from '@/lib/utils'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4 } }),
}

const activityData = [
  { day: 'Mon', estimates: 3 },
  { day: 'Tue', estimates: 7 },
  { day: 'Wed', estimates: 5 },
  { day: 'Thu', estimates: 9 },
  { day: 'Fri', estimates: 6 },
  { day: 'Sat', estimates: 2 },
  { day: 'Sun', estimates: 4 },
]

export default function DashboardPage() {
  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects', { limit: 5 }],
    queryFn: () => projectsApi.list({ limit: 5 }).then((r) => r.data).catch(() => ({ items: [], total: 0 })),
    retry: false,
  })

  const { data: reportsData } = useQuery({
    queryKey: ['reports', { limit: 3 }],
    queryFn: () => reportsApi.list({ limit: 3 }).then((r) => r.data).catch(() => ({ items: [], total: 0 })),
    retry: false,
  })

  const projects = projectsData?.items ?? []
  const reports = reportsData?.items ?? []
  const totalProjects = projectsData?.total ?? 0
  const completedEstimates = projects.filter((p: any) => p.status === 'completed').length
  const savedReports = reportsData?.total ?? 0

  const stats = [
    { label: 'Total Projects', value: totalProjects, icon: FolderOpen, color: 'text-violet-500', bg: 'bg-violet-500/10', delta: '+3 this week' },
    { label: 'Completed Estimates', value: completedEstimates, icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10', delta: 'All up to date' },
    { label: "Today's Estimates", value: 2, icon: TrendingUp, color: 'text-amber-500', bg: 'bg-amber-500/10', delta: '+1 from yesterday' },
    { label: 'Saved Reports', value: savedReports, icon: FileText, color: 'text-sky-500', bg: 'bg-sky-500/10', delta: 'Ready to download' },
  ]

  return (
    <div className="space-y-7">
      {/* Welcome */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
        <h2 className="text-2xl font-black tracking-tight">Good morning 👋</h2>
        <p className="text-[14px] text-black/40 dark:text-white/35 mt-1">
          Here&apos;s what&apos;s happening with your projects today.
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            custom={i}
            initial="hidden"
            animate="visible"
            variants={cardVariants}
            className="bg-white dark:bg-[#1E1E24] rounded-[20px] p-5 border border-black/[0.06] dark:border-white/[0.06] hover:border-violet-500/20 transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 rounded-2xl ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </div>
            <div className="text-3xl font-black tracking-tight mb-1">
              {projectsLoading ? <div className="w-12 h-8 skeleton rounded-lg" /> : stat.value}
            </div>
            <p className="text-[12.5px] text-black/45 dark:text-white/35">{stat.label}</p>
            <p className="text-[11.5px] text-emerald-500 mt-1 font-medium">{stat.delta}</p>
          </motion.div>
        ))}
      </div>

      {/* Main grid */}
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
              <p className="text-[12.5px] text-black/30 dark:text-white/20 mb-4">Upload your first building plan to get started</p>
              <Link href="/upload" className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white text-[13px] font-semibold transition-all">
                <Upload className="w-3.5 h-3.5" /> Upload Drawing
              </Link>
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

        {/* Right column */}
        <div className="space-y-5">
          {/* Quick Upload */}
          <div className="bg-violet-600 rounded-[20px] p-5 text-white relative overflow-hidden">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full" />
            <div className="absolute -right-2 top-8 w-14 h-14 bg-white/5 rounded-full" />
            <Upload className="w-7 h-7 mb-4 relative z-10" />
            <h3 className="font-bold text-[15px] mb-1 relative z-10">Quick Upload</h3>
            <p className="text-[13px] text-white/70 mb-4 relative z-10">
              Drop a plan and get an instant estimate in minutes.
            </p>
            <Link
              href="/upload"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-violet-600 text-[13px] font-bold hover:bg-white/90 transition-all relative z-10"
            >
              Upload Now <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Weekly Activity */}
          <div className="bg-white dark:bg-[#1E1E24] rounded-[20px] border border-black/[0.06] dark:border-white/[0.06] p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-black/40 dark:text-white/30" />
              <h3 className="font-bold text-[14px]">Weekly Activity</h3>
            </div>
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={activityData} barSize={8}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'rgba(0,0,0,0.35)' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: '#1E1E24', border: 'none', borderRadius: 12, fontSize: 12 }}
                  cursor={{ fill: 'rgba(124,58,237,0.05)' }}
                />
                <Bar dataKey="estimates" radius={[4, 4, 0, 0]}>
                  {activityData.map((_, i) => (
                    <Cell key={i} fill={i === 3 ? '#7C3AED' : 'rgba(124,58,237,0.2)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Recent Reports */}
          <div className="bg-white dark:bg-[#1E1E24] rounded-[20px] border border-black/[0.06] dark:border-white/[0.06] p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-[14px]">Recent Reports</h3>
              <Link href="/reports" className="text-[12px] text-violet-500 hover:underline">All</Link>
            </div>
            {reports.length === 0 ? (
              <p className="text-[12.5px] text-black/30 dark:text-white/20 py-4 text-center">No reports yet</p>
            ) : (
              <div className="space-y-2">
                {reports.map((r: any) => (
                  <div key={r.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-all cursor-pointer">
                    <FileText className="w-4 h-4 text-violet-500 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] font-medium truncate">{r.title}</p>
                      <p className="text-[11px] text-black/30 dark:text-white/20">{formatDate(r.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
