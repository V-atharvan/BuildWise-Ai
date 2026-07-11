'use client'

import { useQuery } from '@tanstack/react-query'
import { FileText, Download, Share2, Calendar, AlertTriangle } from 'lucide-react'
import { reportsApi } from '@/lib/api'
import { formatDate } from '@/lib/utils'

export default function ReportsPage() {
  const { data: reportsData, isLoading, error } = useQuery({
    queryKey: ['reports'],
    queryFn: () => reportsApi.list().then((r) => r.data),
  })

  const reports = reportsData?.items ?? []

  const handleDownload = async (reportId: string, filename: string) => {
    try {
      const res = await reportsApi.download(reportId)
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', filename || 'BOQ_Report.pdf')
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (err) {
      alert('Failed to download report PDF file.')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black tracking-tight">Saved Reports</h2>
        <p className="text-[14px] text-black/40 dark:text-white/35 mt-1">
          Access your generated Bill of Quantities (BOQ) PDF documents.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 skeleton rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-16 bg-white dark:bg-[#1E1E24] border border-black/[0.06] dark:border-white/[0.06] rounded-[24px]">
          <AlertTriangle className="w-12 h-12 mx-auto text-red-500 mb-3" />
          <p className="text-sm font-semibold text-black/60 dark:text-white/40">Failed to load reports</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-[#1E1E24] border border-black/[0.06] dark:border-white/[0.06] rounded-[24px]">
          <FileText className="w-14 h-14 mx-auto text-black/15 dark:text-white/10 mb-4" />
          <h3 className="text-lg font-bold mb-2">No Reports Generated</h3>
          <p className="text-sm text-black/40 dark:text-white/30">
            Generate and save reports directly from your project estimation results views.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#1E1E24] border border-black/[0.06] dark:border-white/[0.06] rounded-[24px] overflow-hidden divide-y divide-black/[0.05] dark:divide-white/[0.05]">
          {reports.map((report: any) => (
            <div
              key={report.id}
              className="flex items-center justify-between px-6 py-4 hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-all flex-wrap gap-4"
            >
              <div className="flex items-center gap-3.5 min-w-[200px]">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500">
                  <FileText className="w-5.5 h-5.5 w-[22px] h-[22px]" />
                </div>
                <div>
                  <p className="text-[13.5px] font-bold truncate max-w-[320px]">{report.title}</p>
                  <p className="text-[11.5px] text-black/35 dark:text-white/25 mt-0.5 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Generated {formatDate(report.created_at)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${window.location.origin}/estimate/${report.project_id}?estimation_id=${report.estimation_id}`
                    )
                    alert('Estimation reference report link copied to clipboard!')
                  }}
                  className="p-2 rounded-xl border border-black/[0.08] dark:border-white/[0.08] hover:bg-black/[0.03] dark:hover:bg-white/[0.03] text-black/60 dark:text-white/50 transition-all"
                  title="Share"
                >
                  <Share2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDownload(report.id, `${report.title.replace(/\s+/g, '_')}.pdf`)}
                  className="flex items-center gap-1 px-4.5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-[13px] font-semibold transition-all shadow-md shadow-violet-600/10"
                >
                  <Download className="w-4 h-4" /> Download PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
