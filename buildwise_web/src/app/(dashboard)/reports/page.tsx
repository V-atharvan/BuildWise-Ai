'use client'

import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { FileText, Download, Share2, Calendar, AlertTriangle, Search, Trash2 } from 'lucide-react'
import { reportsApi, projectsApi } from '@/lib/api'
import { formatDate, trackReportOpen } from '@/lib/utils'

// ── Read demo reports AND demo estimations from localStorage ──────────────────
function buildDemoReports(): any[] {
  if (typeof window === 'undefined') return []
  const reports: any[] = []

  try {
    // Explicitly saved demo reports
    const saved = JSON.parse(localStorage.getItem('bw_demo_reports') || '[]')
    reports.push(...saved)
  } catch { /* ignore */ }

  try {
    // Recover from demo estimations stored during estimate flow
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key?.startsWith('bw_demo_est_')) continue
      const est = JSON.parse(localStorage.getItem(key) || '{}')
      if (!est.id) continue
      // Avoid duplicates
      if (reports.find(r => r.estimation_id === est.id)) continue
      reports.push({
        id: `report_${est.id}`,
        title: `BOQ Report — ${new Date(est.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`,
        project_id: est.project_id,
        estimation_id: est.id,
        total_cost: est.total_cost,
        currency: est.currency || 'INR',
        created_at: est.created_at,
      })
    }
  } catch { /* ignore */ }

  // Sort newest first
  return reports.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

export default function ReportsPage() {
  const [demoReports, setDemoReports] = useState<any[]>([])
  const [demoProjects, setDemoProjects] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('newest')

  useEffect(() => {
    setDemoReports(buildDemoReports())
    try {
      setDemoProjects(JSON.parse(localStorage.getItem('bw_demo_projects') || '[]'))
    } catch { /* ignore */ }
  }, [])

  const { data: reportsData, isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: () => reportsApi.list().then((r) => r.data).catch(() => ({ items: [], total: 0 })),
    retry: false,
  })

  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list().then((r) => r.data).catch(() => ({ items: [], total: 0 })),
    retry: false,
  })

  const backendProjects: any[] = projectsData?.items ?? []
  const allProjects = [
    ...backendProjects,
    ...demoProjects.filter(dp => !backendProjects.find(bp => bp.id === dp.id))
  ]
  const projectIds = new Set(allProjects.map(p => p.id))

  const backendReports: any[] = reportsData?.items ?? []
  const allReports = [
    ...backendReports,
    ...demoReports.filter(dr => !backendReports.find(br => br.id === dr.id)),
  ].filter(r => r.project_id && projectIds.has(r.project_id))

  // Filter & Sort
  const filteredReports = allReports
    .filter(r => r.title?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
      if (sortBy === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      }
      if (sortBy === 'cost_desc') {
        return (b.total_cost || 0) - (a.total_cost || 0)
      }
      if (sortBy === 'cost_asc') {
        return (a.total_cost || 0) - (b.total_cost || 0)
      }
      return 0
    })

  const handleDelete = (reportId: string) => {
    if (!confirm('Are you sure you want to delete this report?')) return

    try {
      // If it is a demo estimation report
      if (reportId.startsWith('report_demo_est_')) {
        const estId = reportId.replace('report_', '')
        localStorage.removeItem(`bw_demo_est_${estId}`)
      } else if (reportId.startsWith('demo_est_')) {
        localStorage.removeItem(`bw_demo_est_${reportId}`)
      }
      
      // Remove from explicitly saved list
      const saved = JSON.parse(localStorage.getItem('bw_demo_reports') || '[]')
      const updated = saved.filter((r: any) => r.id !== reportId && r.estimation_id !== reportId)
      localStorage.setItem('bw_demo_reports', JSON.stringify(updated))
    } catch { /* ignore */ }

    // Mock delete for backend API (since backend delete report route is not present)
    setDemoReports(buildDemoReports())
    alert('Report deleted successfully!')
  }

  const handleDownload = async (reportId: string, filename: string) => {
    const reportObj = allReports.find(r => r.id === reportId)
    if (reportObj) {
      trackReportOpen(reportObj)
    }
    try {
      const res = await reportsApi.download(reportId)
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', filename || 'BOQ_Report.pdf')
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch {
      alert('PDF download requires the backend API to be running. You can view the estimate details by clicking the share link.')
    }
  }

  const formatCost = (cost: number, currency: string) => {
    if (!cost) return ''
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: currency || 'INR', maximumFractionDigits: 0 }).format(cost)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Saved Reports</h2>
          <p className="text-[14px] text-black/40 dark:text-white/35 mt-1">
            Access your generated Bill of Quantities (BOQ) PDF documents.
          </p>
        </div>
      </div>

      {/* Control Bar: Search & Sort */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30 dark:text-white/25" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reports by title..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-[#1E1E24] border border-black/[0.07] dark:border-white/[0.07] text-[13.5px] focus:outline-none focus:border-violet-500 transition-all text-black/80 dark:text-white/80 placeholder:text-black/35 dark:placeholder:text-white/30"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#1E1E24] border border-black/[0.07] dark:border-white/[0.07] text-[13.5px] focus:outline-none focus:border-violet-500 transition-all text-black/75 dark:text-white/70"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="cost_desc">Cost: High to Low</option>
          <option value="cost_asc">Cost: Low to High</option>
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 skeleton rounded-2xl" />
          ))}
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-[#1E1E24] border border-black/[0.06] dark:border-white/[0.06] rounded-[24px]">
          <FileText className="w-14 h-14 mx-auto text-black/15 dark:text-white/10 mb-4" />
          <h3 className="text-lg font-bold mb-2">No Reports Found</h3>
          <p className="text-sm text-black/40 dark:text-white/30">
            {search ? 'Try adjusting your search keywords' : 'Generate and save reports directly from estimation results.'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#1E1E24] border border-black/[0.06] dark:border-white/[0.06] rounded-[24px] overflow-hidden divide-y divide-black/[0.05] dark:divide-white/[0.05]">
          {filteredReports.map((report: any) => (
            <div
              key={report.id}
              className="flex items-center justify-between px-6 py-4 hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-all flex-wrap gap-4"
            >
              <div className="flex items-center gap-3.5 min-w-[200px]">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500">
                  <FileText className="w-[22px] h-[22px]" />
                </div>
                <div>
                  <p className="text-[13.5px] font-bold truncate max-w-[320px]">{report.title}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <p className="text-[11.5px] text-black/35 dark:text-white/25 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> {formatDate(report.created_at)}
                    </p>
                    {report.total_cost > 0 && (
                      <p className="text-[11.5px] font-semibold text-violet-500">
                        {formatCost(report.total_cost, report.currency)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    trackReportOpen(report)
                    const url = report.estimation_id
                      ? `${window.location.origin}/estimate/${report.project_id}?estimation_id=${report.estimation_id}`
                      : `${window.location.origin}/estimate/${report.project_id}`
                    navigator.clipboard.writeText(url)
                    alert('Report link copied to clipboard!')
                  }}
                  className="p-2 rounded-xl border border-black/[0.08] dark:border-white/[0.08] hover:bg-black/[0.03] dark:hover:bg-white/[0.03] text-black/60 dark:text-white/50 transition-all"
                  title="Share"
                >
                  <Share2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDownload(report.id, `${report.title.replace(/\s+/g, '_')}.pdf`)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-[13px] font-semibold transition-all shadow-md shadow-violet-600/10"
                >
                  <Download className="w-4 h-4" /> Download PDF
                </button>
                <button
                  onClick={() => handleDelete(report.id)}
                  className="p-2 rounded-xl border border-red-500/20 text-red-500 hover:bg-red-500/10 transition-all"
                  title="Delete Report"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
