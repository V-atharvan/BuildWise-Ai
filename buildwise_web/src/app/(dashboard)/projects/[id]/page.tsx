'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import {
  ArrowLeft, FileText, Upload, Plus, Trash2, Calendar, HardDrive,
  CheckCircle2, Clock, AlertTriangle, Eye, RefreshCw, BarChart2
} from 'lucide-react'
import { projectsApi, reportsApi } from '@/lib/api'
import { formatDate, formatRelativeTime } from '@/lib/utils'

export default function ProjectDetailPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const qc = useQueryClient()

  const { data: project, isLoading, error } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.get(id).then((r) => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: () => projectsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      router.push('/projects')
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-32 skeleton rounded-md" />
        <div className="h-24 skeleton rounded-3xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-48 skeleton rounded-3xl" />
          </div>
          <div className="space-y-4">
            <div className="h-48 skeleton rounded-3xl" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="text-center py-20">
        <AlertTriangle className="w-14 h-14 mx-auto text-red-500 mb-4" />
        <h3 className="text-lg font-bold mb-2">Project Not Found</h3>
        <p className="text-sm text-black/40 dark:text-white/30 mb-6">
          The project may have been deleted or you don&apos;t have access to it.
        </p>
        <Link href="/projects" className="btn btn-primary">
          <ArrowLeft className="w-4 h-4" /> Back to Projects
        </Link>
      </div>
    )
  }

  const plans = project.plans ?? []
  const estimations = project.estimations ?? []

  return (
    <div className="space-y-6">
      {/* Back button & Title */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Link
            href="/projects"
            className="p-2 rounded-xl border border-black/[0.08] dark:border-white/[0.08] hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h2 className="text-2xl font-black tracking-tight">{project.name}</h2>
            <p className="text-xs text-black/40 dark:text-white/35 mt-1 capitalize">
              {project.building_type.replace('_', ' ')} · Created {formatDate(project.created_at)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (confirm('Are you sure you want to delete this project?')) {
                deleteMutation.mutate()
              }
            }}
            className="p-2.5 rounded-xl border border-red-500/20 text-red-500 hover:bg-red-500/5 transition-all"
            title="Delete Project"
          >
            <Trash2 className="w-4.5 h-4.5 w-[18px] h-[18px]" />
          </button>
          <Link
            href={`/upload?project_id=${project.id}`}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-[13.5px] font-semibold transition-all shadow-lg shadow-violet-600/20"
          >
            <Upload className="w-4 h-4" /> Upload Drawing
          </Link>
        </div>
      </div>

      {project.description && (
        <div className="bg-white dark:bg-[#1E1E24] rounded-3xl border border-black/[0.06] dark:border-white/[0.06] p-5">
          <h3 className="text-xs font-semibold text-black/40 dark:text-white/30 uppercase tracking-widest mb-1.5">Description</h3>
          <p className="text-[13.5px] text-black/70 dark:text-white/70 leading-relaxed">{project.description}</p>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Drawings Section */}
        <div className="lg:col-span-2 bg-white dark:bg-[#1E1E24] rounded-3xl border border-black/[0.06] dark:border-white/[0.06] p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-black/[0.05] dark:border-white/[0.05] pb-4">
            <div>
              <h3 className="font-bold text-[15px]">Uploaded Drawings</h3>
              <p className="text-[12px] text-black/40 dark:text-white/30 mt-0.5">Plans uploaded for structural AI takeoff</p>
            </div>
            <span className="text-[12px] bg-violet-600/10 text-violet-500 font-semibold px-2 py-0.5 rounded-full">
              {plans.length} total
            </span>
          </div>

          {plans.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-black/[0.06] dark:border-white/[0.06] rounded-2xl">
              <Upload className="w-10 h-10 mx-auto text-black/15 dark:text-white/10 mb-3" />
              <p className="text-[14px] font-semibold text-black/40 dark:text-white/30">No drawings uploaded yet</p>
              <p className="text-[12px] text-black/30 dark:text-white/20 mb-5">Upload blueprints to trigger AI estimation engine</p>
              <Link
                href={`/upload?project_id=${project.id}`}
                className="btn btn-secondary btn-sm"
              >
                Upload Drawing
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {plans.map((plan: any) => (
                <div
                  key={plan.id}
                  className="flex items-center justify-between p-4 rounded-2xl border border-black/[0.06] dark:border-white/[0.06] bg-black/[0.01] dark:bg-white/[0.01] hover:border-violet-500/20 transition-all flex-wrap gap-4"
                >
                  <div className="flex items-center gap-3.5 min-w-[200px]">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[13.5px] font-bold max-w-[240px] truncate">{plan.filename}</p>
                      <p className="text-[11.5px] text-black/35 dark:text-white/25 mt-0.5">
                        Uploaded {formatRelativeTime(plan.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 capitalize ${
                      plan.status === 'done' ? 'bg-emerald-500/10 text-emerald-500' :
                      plan.status === 'processing' ? 'bg-amber-500/10 text-amber-500' :
                      'bg-red-500/10 text-red-500'
                    }`}>
                      {plan.status === 'done' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                      {plan.status}
                    </span>
                    {plan.status === 'done' ? (
                      <Link
                        href={`/estimate/${project.id}?plan_id=${plan.id}`}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-[12px] font-semibold transition-all"
                      >
                        <BarChart2 className="w-3.5 h-3.5" /> Estimate
                      </Link>
                    ) : plan.status === 'processing' ? (
                      <Link
                        href={`/analysis/${plan.id}`}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] hover:bg-black/[0.03] dark:hover:bg-white/[0.03] text-[12px] font-semibold transition-all"
                      >
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> View AI
                      </Link>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Estimates Section */}
        <div className="bg-white dark:bg-[#1E1E24] rounded-3xl border border-black/[0.06] dark:border-white/[0.06] p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-black/[0.05] dark:border-white/[0.05] pb-4">
            <div>
              <h3 className="font-bold text-[15px]">Estimations</h3>
              <p className="text-[12px] text-black/40 dark:text-white/30 mt-0.5">Calculated quantity takeoffs</p>
            </div>
          </div>

          {estimations.length === 0 ? (
            <div className="text-center py-12">
              <BarChart2 className="w-10 h-10 mx-auto text-black/15 dark:text-white/10 mb-3" />
              <p className="text-[13.5px] font-semibold text-black/40 dark:text-white/30">No estimates generated</p>
              <p className="text-[11.5px] text-black/30 dark:text-white/20">
                Run estimator from drawings list once analysis completes.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {estimations.map((est: any) => (
                <Link
                  key={est.id}
                  href={`/estimate/${project.id}?estimation_id=${est.id}`}
                  className="flex items-center justify-between p-3.5 rounded-2xl border border-black/[0.06] dark:border-white/[0.06] hover:border-violet-500/20 transition-all bg-black/[0.01] dark:bg-white/[0.01] group"
                >
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-black/80 dark:text-white/80 group-hover:text-violet-500 transition-colors">
                      Estimate Run
                    </p>
                    <p className="text-[11px] text-black/40 dark:text-white/25 mt-0.5">
                      {formatDate(est.created_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[13.5px] font-black text-violet-500">
                      ₹ {est.total_cost.toLocaleString('en-IN')}
                    </p>
                    <p className="text-[10px] text-black/35 dark:text-white/25 mt-0.5">Grand Total</p>
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
