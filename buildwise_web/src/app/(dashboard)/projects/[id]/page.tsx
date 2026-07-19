'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, FileText, Upload, Trash2, Calendar,
  CheckCircle2, Clock, AlertTriangle, RefreshCw, BarChart2,
  FolderOpen, Building, Eye, Users, Shield, MapPin, Edit3, Save, X
} from 'lucide-react'
import { projectsApi } from '@/lib/api'
import { formatDate, formatRelativeTime, formatCurrency } from '@/lib/utils'

// ── Load a single demo project from localStorage ───────────────────────────────
function getDemoProject(id: string) {
  if (typeof window === 'undefined') return null
  try {
    const all = JSON.parse(localStorage.getItem('bw_demo_projects') || '[]')
    return all.find((p: any) => p.id === id) ?? null
  } catch { return null }
}

// ── Load any demo estimations that belong to this project ─────────────────────
function getDemoEstimations(projectId: string) {
  if (typeof window === 'undefined') return []
  const results: any[] = []
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key?.startsWith('bw_demo_est_')) continue
      const est = JSON.parse(localStorage.getItem(key) || '{}')
      if (est.project_id === projectId) results.push(est)
    }
  } catch { /* ignore */ }
  return results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

// ── Load any demo plans that belong to this project ───────────────────────────
function getDemoPlans(projectId: string) {
  if (typeof window === 'undefined') return []
  const results: any[] = []
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key?.startsWith('bw_demo_plan_')) continue
      const plan = JSON.parse(localStorage.getItem(key) || '{}')
      if (plan.project_id === projectId) results.push(plan)
    }
  } catch { /* ignore */ }
  return results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

// ── Delete a demo project from localStorage ────────────────────────────────────
function deleteDemoProject(id: string) {
  try {
    const all = JSON.parse(localStorage.getItem('bw_demo_projects') || '[]')
    localStorage.setItem('bw_demo_projects', JSON.stringify(all.filter((p: any) => p.id !== id)))
  } catch { /* ignore */ }
}

export default function ProjectDetailPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const qc = useQueryClient()
  const isDemo = id.startsWith('demo_proj_')

  const [demoProject, setDemoProject] = useState<any>(null)
  const [demoEstimations, setDemoEstimations] = useState<any[]>([])
  const [demoPlans, setDemoPlans] = useState<any[]>([])
  const [viewingPlanUrl, setViewingPlanUrl] = useState<string | null>(null)
  const [viewingPlanName, setViewingPlanName] = useState<string>('')

  // Editing state for Project Info
  const [isEditingInfo, setIsEditingInfo] = useState(false)
  const [clientName, setClientName] = useState('')
  const [architectName, setArchitectName] = useState('')
  const [engineerName, setEngineerName] = useState('')
  const [contractorName, setContractorName] = useState('')
  const [address, setAddress] = useState('')
  const [status, setStatus] = useState('planning')

  const BLUEPRINT_FALLBACK = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600" style="background-color:%230A192F;font-family:monospace;"><path d="M 0 0 L 800 600 M 800 0 L 0 600" stroke="%23172A45" stroke-width="1" /><path d="M 100 100 L 700 100 L 700 500 L 100 500 Z M 100 300 L 700 300 M 400 100 L 400 500" stroke="%2338BDF8" stroke-width="2.5" stroke-dasharray="8,6" fill="none" /><rect x="150" y="150" width="200" height="100" stroke="%2338BDF8" stroke-width="2" fill="none" /><text x="250" y="210" fill="%2338BDF8" font-size="14" text-anchor="middle">BEDROOM (12'x14')</text><rect x="450" y="150" width="200" height="100" stroke="%2338BDF8" stroke-width="2" fill="none" /><text x="550" y="210" fill="%2338BDF8" font-size="14" text-anchor="middle">KITCHEN (10'x12')</text><rect x="150" y="350" width="500" height="100" stroke="%2338BDF8" stroke-width="2" fill="none" /><text x="400" y="410" fill="%2338BDF8" font-size="14" text-anchor="middle">LIVING AREA (24'x16')</text><text x="400" y="550" fill="%230284C7" font-size="12" text-anchor="middle">BUILDWISE AI STRUCTURAL SCANNER v2.0</text></svg>`

  // Load demo data on mount
  useEffect(() => {
    if (isDemo) {
      const proj = getDemoProject(id)
      setDemoProject(proj)
      if (proj) {
        setClientName(proj.client_name || 'Venkatesh Developers')
        setArchitectName(proj.architect_name || 'Ar. Rajesh Mehta (AIA)')
        setEngineerName(proj.engineer_name || 'Er. Amit Sharma (M.Tech)')
        setContractorName(proj.contractor_name || 'Surya Civil Builders')
        setAddress(proj.address || 'Hinjawadi Phase 3, Pune, Maharashtra')
        setStatus(proj.status || 'planning')
      }
      setDemoEstimations(getDemoEstimations(id))
      setDemoPlans(getDemoPlans(id))
    }
  }, [id, isDemo])

  // Real backend fetch (skipped for demo projects)
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

  // Save Info changes to localStorage
  const handleSaveInfo = () => {
    if (isDemo && demoProject) {
      const all = JSON.parse(localStorage.getItem('bw_demo_projects') || '[]')
      const updated = all.map((p: any) => p.id === id ? {
        ...p,
        client_name: clientName,
        architect_name: architectName,
        engineer_name: engineerName,
        contractor_name: contractorName,
        address: address,
        status: status
      } : p)
      localStorage.setItem('bw_demo_projects', JSON.stringify(updated))
      setDemoProject({
        ...demoProject,
        client_name: clientName,
        architect_name: architectName,
        engineer_name: engineerName,
        contractor_name: contractorName,
        address: address,
        status: status
      })
    }
    setIsEditingInfo(false)
  }

  const project = isDemo ? demoProject : backendProject
  const loading  = isDemo ? false : isLoading
  const hasError = isDemo ? !demoProject : !!error

  if (loading) {
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

  const plans = isDemo ? demoPlans : (project.plans ?? [])
  const estimations = isDemo ? demoEstimations : (project.estimations ?? [])
  const latestEstimate = estimations[0] || null

  // Calculate stats values
  const totalRoomsCount = latestEstimate ? latestEstimate.room_takeoffs?.length ?? 4 : 4
  const totalCostVal = latestEstimate ? latestEstimate.total_cost : 0
  const materialCostVal = latestEstimate ? latestEstimate.cost_breakdown?.total_material_cost : 0
  const totalAreaM2 = latestEstimate ? latestEstimate.room_takeoffs?.reduce((s: number, r: any) => s + r.area_m2, 0) ?? 64.4 : 64.4
  const totalAreaSqft = totalAreaM2 * 10.7639
  const durationDays = Math.ceil(totalAreaM2 * 1.5) // ~1.5 days per m2
  const confidenceScore = latestEstimate ? latestEstimate.confidence_score * 100 : 85

  return (
    <div className="space-y-6">
      
      {/* Quick Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: 'Total Area', value: `${totalAreaM2.toFixed(0)} m²`, desc: `${totalAreaSqft.toFixed(0)} sqft`, color: 'text-violet-500' },
          { label: 'Total Rooms', value: totalRoomsCount, desc: 'AI segment partitions', color: 'text-emerald-500' },
          { label: 'BOQ Grand Budget', value: totalCostVal > 0 ? formatCurrency(totalCostVal) : '₹ 0', desc: 'Incl. labor & taxes', color: 'text-violet-600' },
          { label: 'Material Cost', value: materialCostVal > 0 ? formatCurrency(materialCostVal) : '₹ 0', desc: 'Bricks, steel, cement', color: 'text-amber-500' },
          { label: 'Est. Duration', value: `${durationDays} Days`, desc: 'Project completion schedule', color: 'text-blue-500' },
          { label: 'Confidence Score', value: `${confidenceScore.toFixed(0)}%`, desc: 'Geometry validation index', color: 'text-violet-500' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-[#1E1E24] rounded-2xl border border-black/[0.06] dark:border-white/[0.06] p-4 flex flex-col justify-between">
            <p className="text-[10px] text-black/40 dark:text-white/30 font-medium uppercase tracking-wider">{stat.label}</p>
            <p className={`text-lg font-black mt-2 ${stat.color}`}>{stat.value}</p>
            <p className="text-[10px] text-black/35 dark:text-white/20 mt-1">{stat.desc}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project Information Panel */}
        <div className="lg:col-span-1 bg-white dark:bg-[#1E1E24] rounded-3xl border border-black/[0.06] dark:border-white/[0.06] p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-black/[0.05] dark:border-white/[0.05] pb-3">
            <h3 className="font-bold text-[14px]">Project Details</h3>
            <button
              onClick={() => setIsEditingInfo(!isEditingInfo)}
              className="p-1.5 rounded-lg border border-black/[0.08] dark:border-white/[0.08] hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-all text-violet-500"
            >
              {isEditingInfo ? <X className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
            </button>
          </div>

          {isEditingInfo ? (
            <div className="space-y-3 text-[12.5px]">
              <div>
                <label className="block font-semibold text-black/40 dark:text-white/30 text-[10px] uppercase">Client Name</label>
                <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} className="w-full mt-1 p-2 rounded-xl border border-black/10 dark:border-white/10 bg-transparent font-semibold" />
              </div>
              <div>
                <label className="block font-semibold text-black/40 dark:text-white/30 text-[10px] uppercase">Architect</label>
                <input type="text" value={architectName} onChange={(e) => setArchitectName(e.target.value)} className="w-full mt-1 p-2 rounded-xl border border-black/10 dark:border-white/10 bg-transparent font-semibold" />
              </div>
              <div>
                <label className="block font-semibold text-black/40 dark:text-white/30 text-[10px] uppercase">Structural Engineer</label>
                <input type="text" value={engineerName} onChange={(e) => setEngineerName(e.target.value)} className="w-full mt-1 p-2 rounded-xl border border-black/10 dark:border-white/10 bg-transparent font-semibold" />
              </div>
              <div>
                <label className="block font-semibold text-black/40 dark:text-white/30 text-[10px] uppercase">General Contractor</label>
                <input type="text" value={contractorName} onChange={(e) => setContractorName(e.target.value)} className="w-full mt-1 p-2 rounded-xl border border-black/10 dark:border-white/10 bg-transparent font-semibold" />
              </div>
              <div>
                <label className="block font-semibold text-black/40 dark:text-white/30 text-[10px] uppercase">Site Address</label>
                <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full mt-1 p-2 rounded-xl border border-black/10 dark:border-white/10 bg-transparent font-semibold" />
              </div>
              <div>
                <label className="block font-semibold text-black/40 dark:text-white/30 text-[10px] uppercase">Project Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full mt-1 p-2 rounded-xl border border-black/10 dark:border-white/10 bg-transparent font-semibold dark:bg-[#1A1A20]">
                  <option value="planning">Planning & Engineering</option>
                  <option value="excavation">Excavation Started</option>
                  <option value="structure">Structure RCC Framed</option>
                  <option value="finishing">Finishing & Masonry</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <button
                onClick={handleSaveInfo}
                className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold flex items-center justify-center gap-1.5 transition-all"
              >
                <Save className="w-4 h-4" /> Save Specifications
              </button>
            </div>
          ) : (
            <div className="space-y-4 text-[12.5px] leading-relaxed">
              <div className="flex gap-2">
                <Users className="w-4.5 h-4.5 text-black/30 dark:text-white/30 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] text-black/40 dark:text-white/30 font-bold uppercase tracking-wider">Client Name</p>
                  <p className="font-semibold text-black/75 dark:text-white/70 mt-0.5">{clientName}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Shield className="w-4.5 h-4.5 text-black/30 dark:text-white/30 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] text-black/40 dark:text-white/30 font-bold uppercase tracking-wider">Architect</p>
                  <p className="font-semibold text-black/75 dark:text-white/70 mt-0.5">{architectName}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Building className="w-4.5 h-4.5 text-black/30 dark:text-white/30 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] text-black/40 dark:text-white/30 font-bold uppercase tracking-wider">Structural Engineer</p>
                  <p className="font-semibold text-black/75 dark:text-white/70 mt-0.5">{engineerName}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Users className="w-4.5 h-4.5 text-black/30 dark:text-white/30 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] text-black/40 dark:text-white/30 font-bold uppercase tracking-wider">General Contractor</p>
                  <p className="font-semibold text-black/75 dark:text-white/70 mt-0.5">{contractorName}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <MapPin className="w-4.5 h-4.5 text-black/30 dark:text-white/30 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] text-black/40 dark:text-white/30 font-bold uppercase tracking-wider">Site Address</p>
                  <p className="font-semibold text-black/75 dark:text-white/70 mt-0.5">{address}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Calendar className="w-4.5 h-4.5 text-black/30 dark:text-white/30 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] text-black/40 dark:text-white/30 font-bold uppercase tracking-wider">Project Status</p>
                  <p className="font-semibold text-black/75 dark:text-white/70 mt-0.5 capitalize">{status.replace('_', ' ')}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Uploaded Drawings list */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-[#1E1E24] rounded-3xl border border-black/[0.06] dark:border-white/[0.06] p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-black/[0.05] dark:border-white/[0.05] pb-4">
              <div>
                <h3 className="font-bold text-[15px]">Uploaded Drawings</h3>
                <p className="text-[12px] text-black/40 dark:text-white/30 mt-0.5">Plans uploaded for AI takeoff</p>
              </div>
              <span className="text-[12px] bg-violet-600/10 text-violet-500 font-semibold px-2 py-0.5 rounded-full">
                {plans.length} total
              </span>
            </div>

            {plans.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-black/[0.06] dark:border-white/[0.06] rounded-2xl">
                <Upload className="w-10 h-10 mx-auto text-black/15 dark:text-white/10 mb-3" />
                <p className="text-[14px] font-semibold text-black/40 dark:text-white/30">No drawings uploaded yet</p>
                <p className="text-[12px] text-black/30 dark:text-white/20 mb-5">
                  Upload a blueprint to trigger the AI estimation engine
                </p>
                <Link
                  href={`/upload?project_id=${project.id}`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-black/[0.08] dark:border-white/[0.08] text-[13px] font-semibold hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-all"
                >
                  <Upload className="w-3.5 h-3.5" /> Upload Drawing
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
                      <button
                        onClick={() => {
                          const saved = localStorage.getItem(`bw_demo_file_data_${plan.id}`)
                          setViewingPlanUrl(saved || BLUEPRINT_FALLBACK)
                          setViewingPlanName(plan.filename)
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] hover:bg-black/[0.03] dark:hover:bg-white/[0.03] text-[12px] font-semibold transition-all text-black/60 dark:text-white/70"
                      >
                        <Eye className="w-3.5 h-3.5" /> View
                      </button>
                      {plan.status === 'done' && (
                        <Link
                          href={`/estimate/${project.id}?plan_id=${plan.id}`}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-[12px] font-semibold transition-all"
                        >
                          <BarChart2 className="w-3.5 h-3.5" /> Estimate
                        </Link>
                      )}
                      {plan.status === 'processing' && (
                        <Link
                          href={`/analysis/${plan.id}`}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] hover:bg-black/[0.03] dark:hover:bg-white/[0.03] text-[12px] font-semibold transition-all"
                        >
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> View AI
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Estimations list */}
          <div className="bg-white dark:bg-[#1E1E24] rounded-3xl border border-black/[0.06] dark:border-white/[0.06] p-6 space-y-5">
            <div className="border-b border-black/[0.05] dark:border-white/[0.05] pb-4">
              <h3 className="font-bold text-[15px]">Takeoff Estimations Runs</h3>
              <p className="text-[12px] text-black/40 dark:text-white/30 mt-0.5">Calculated quantity takeoff packages</p>
            </div>

            {estimations.length === 0 ? (
              <div className="text-center py-12">
                <BarChart2 className="w-10 h-10 mx-auto text-black/15 dark:text-white/10 mb-3" />
                <p className="text-[13.5px] font-semibold text-black/40 dark:text-white/30">No estimates yet</p>
                <p className="text-[11.5px] text-black/30 dark:text-white/20 mt-1">
                  Upload a drawing and run the estimator.
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
                        Quantity Takeoff Estimate
                      </p>
                      <p className="text-[11px] text-black/40 dark:text-white/25 mt-0.5">
                        {formatDate(est.created_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[13.5px] font-black text-violet-500">
                        ₹ {(est.total_cost ?? 0).toLocaleString('en-IN')}
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

      {/* View Plan Modal */}
      {viewingPlanUrl && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-50 p-4"
          onClick={() => setViewingPlanUrl(null)}
        >
          <div
            className="w-full max-w-[800px] bg-white dark:bg-[#1E1E24] rounded-[24px] border border-black/[0.07] dark:border-white/[0.07] shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-black/[0.06] dark:border-white/[0.06]">
              <h3 className="text-md font-bold truncate max-w-[500px]">{viewingPlanName}</h3>
              <button
                onClick={() => setViewingPlanUrl(null)}
                className="p-2 px-4 rounded-xl bg-black/[0.05] dark:bg-white/[0.05] hover:bg-black/[0.1] dark:hover:bg-white/[0.1] text-xs font-bold transition-colors"
              >
                Close
              </button>
            </div>
            <div className="bg-[#0A192F] p-4 flex items-center justify-center min-h-[500px] h-[70vh] w-full overflow-hidden">
              {viewingPlanName?.toLowerCase().endsWith('.pdf') || viewingPlanUrl?.startsWith('data:application/pdf') ? (
                <iframe
                  src={viewingPlanUrl}
                  className="w-full h-full border-0 rounded-lg"
                  title="PDF Drawing Viewer"
                />
              ) : (
                <img
                  src={viewingPlanUrl}
                  alt="Blueprint layout plan"
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
