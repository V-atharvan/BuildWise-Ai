'use client'

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import Link from 'next/link'
import {
  ArrowLeft, Download, Share2, FileText, CheckCircle2, DollarSign,
  Layers, Hammer, Package, Calculator, Loader2, Sparkles, Building
} from 'lucide-react'
import { estimationApi, reportsApi } from '@/lib/api'
import { formatCurrency, formatNumber, formatDate } from '@/lib/utils'
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts'

const COLORS = ['#7C3AED', '#A78BFA', '#C4B5FD', '#F59E0B', '#10B981', '#EF4444', '#3B82F6', '#6B7280']

export default function EstimatePage() {
  const { id: projectId } = useParams() as { id: string }
  const searchParams = useSearchParams()
  const estimationId = searchParams.get('estimation_id')
  const planId = searchParams.get('plan_id')
  const router = useRouter()

  const isDemoProject = projectId?.startsWith('demo_proj_')
  const isDemoEst = estimationId?.startsWith('demo_est_') || isDemoProject

  // Load demo estimations from localStorage
  const localEstimations = typeof window !== 'undefined'
    ? (() => {
        const results: any[] = []
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (!key?.startsWith('bw_demo_est_')) continue
            const est = JSON.parse(localStorage.getItem(key) || '{}')
            if (est.project_id === projectId || est.plan_id === planId) {
              results.push(est)
            }
          }
        } catch { /* ignore */ }
        return results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      })()
    : []

  const demoEstimation = estimationId
    ? (localEstimations.find(e => e.id === estimationId) || (typeof window !== 'undefined' ? (() => { try { return JSON.parse(localStorage.getItem(`bw_demo_est_${estimationId}`) || 'null') } catch { return null } })() : null))
    : (localEstimations.length > 0 ? localEstimations[0] : null)

  // If we have an estimation ID, load it. Otherwise, load the estimation list and get the latest
  const { data: estimations, isLoading: listLoading } = useQuery({
    queryKey: ['estimations', projectId],
    queryFn: () => estimationApi.list(projectId).then((r) => r.data).catch(() => []),
    enabled: !estimationId && !isDemoEst,
    retry: false,
  })

  const activeEstId = estimationId || demoEstimation?.id || (estimations && estimations.length > 0 ? estimations[0].id : null)

  const { data: backendEstimation, isLoading: estLoading } = useQuery({
    queryKey: ['estimation', activeEstId],
    queryFn: () => estimationApi.get(activeEstId!).then((r) => r.data).catch(() => null),
    enabled: !!activeEstId && !isDemoEst,
    retry: false,
  })

  const estimation = demoEstimation || backendEstimation

  const reportMutation = useMutation({
    mutationFn: () => reportsApi.generate(activeEstId!),
    onSuccess: (res) => {
      alert('Report generated successfully!')
      const report = res.data
      if (report.id) {
        reportsApi.download(report.id).then((blobRes) => {
          const url = window.URL.createObjectURL(new Blob([blobRes.data]))
          const link = document.createElement('a')
          link.href = url
          link.setAttribute('download', `BOQ_Report_${projectId}.pdf`)
          document.body.appendChild(link)
          link.click()
          link.remove()
        })
      }
    },
    onError: () => {
      // Demo fallback — generate a simple text BOQ download
      if (estimation) {
        const m = estimation.materials
        const c = estimation.cost_breakdown
        const materialCost =
          (c.concrete_cost ?? 0) +
          (c.steel_cost ?? 0) +
          (c.cement_cost ?? 0) +
          (c.sand_cost ?? 0) +
          (c.aggregate_cost ?? 0) +
          (c.brick_cost ?? 0) +
          (c.block_cost ?? 0) +
          (c.plaster_cost ?? 0) +
          (c.paint_cost ?? 0) +
          (c.tiles_cost ?? 0)
        
        const labourCost = c.labour_cost ?? 0
        const equipCost = c.equipment_cost ?? 0
        const contractorMargin = c.contractor_margin ?? 0
        const subtotal = materialCost + labourCost + equipCost + contractorMargin
        const gst = subtotal * 0.18
        const total = estimation.total_cost ?? (subtotal + gst)

        const text = [
          'BuildWise AI — Bill of Quantities (Demo Mode)',
          '==============================================',
          '',
          'MATERIALS ESTIMATED:',
          `-  Concrete Volume   : ${(m.concrete_volume ?? 0).toLocaleString()} m³`,
          `-  Steel Reinforcing : ${(m.steel_weight ?? 0).toLocaleString()} kg`,
          `-  Cement Bags       : ${(m.cement_bags ?? 0).toLocaleString()} bags`,
          `-  Sand Volume       : ${(m.sand_volume ?? 0).toLocaleString()} m³`,
          `-  Aggregate Volume  : ${(m.aggregate_volume ?? 0).toLocaleString()} m³`,
          `-  Bricks Count      : ${(m.bricks_count ?? 0).toLocaleString()} nos`,
          `-  AAC Blocks Count  : ${(m.blocks_count ?? 0).toLocaleString()} nos`,
          `-  Plaster Area      : ${(m.plaster_area ?? 0).toLocaleString()} m²`,
          `-  Paint Area        : ${(m.paint_area ?? 0).toLocaleString()} m²`,
          `-  Flooring Tiles    : ${(m.tiles_area ?? 0).toLocaleString()} m²`,
          `-  Excavation        : ${(m.excavation_volume ?? 0).toLocaleString()} m³`,
          '',
          'COST SUMMARY:',
          `-  Material Cost     : ₹${Math.round(materialCost).toLocaleString('en-IN')}`,
          `-  Labour Cost       : ₹${Math.round(labourCost).toLocaleString('en-IN')}`,
          `-  Equipment Cost    : ₹${Math.round(equipCost).toLocaleString('en-IN')}`,
          `-  Contractor Margin : ₹${Math.round(contractorMargin).toLocaleString('en-IN')}`,
          `-  GST (18% Buffer)  : ₹${Math.round(gst).toLocaleString('en-IN')}`,
          '----------------------------------------------',
          `-  GRAND TOTAL BOQ   : ₹${Math.round(total).toLocaleString('en-IN')}`,
        ].join('\n')
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `BOQ_Report_${projectId}.txt`
        document.body.appendChild(a)
        a.click()
        a.remove()
      }
    },
  })

  const isLoading = !isDemoEst && (listLoading || estLoading)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-32 skeleton rounded-md" />
        <div className="h-28 skeleton rounded-3xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-96 skeleton rounded-3xl" />
          </div>
          <div className="h-96 skeleton rounded-3xl" />
        </div>
      </div>
    )
  }

  if (!activeEstId || !estimation) {
    return (
      <div className="text-center py-20 bg-white dark:bg-[#1E1E24] border border-black/[0.06] dark:border-white/[0.06] rounded-[24px]">
        <Calculator className="w-14 h-14 mx-auto text-black/15 dark:text-white/10 mb-4" />
        <h3 className="text-lg font-bold mb-2">No Estimation Results</h3>
        <p className="text-sm text-black/40 dark:text-white/30 mb-6">
          You need to analyze a blueprint drawing and enter inputs to generate calculations.
        </p>
        <Link href={`/projects/${projectId}`} className="btn btn-primary">
          <ArrowLeft className="w-4 h-4" /> Back to Project
        </Link>
      </div>
    )
  }

  const materials = estimation.materials
  const cost = estimation.cost_breakdown

  // Prepare chart data
  const pieData = [
    { name: 'Concrete', value: cost.concrete_cost },
    { name: 'Steel', value: cost.steel_cost },
    { name: 'Cement/Aggregate', value: cost.cement_cost + cost.sand_cost + cost.aggregate_cost },
    { name: 'Brickwork/Masonry', value: cost.brick_cost + cost.block_cost },
    { name: 'Plaster & Paint', value: cost.plaster_cost + cost.paint_cost },
    { name: 'Finishes/Tiles', value: cost.tiles_cost },
    { name: 'Labour & Equip.', value: cost.labour_cost + cost.equipment_cost },
  ].filter(item => item.value > 0)

  const materialItems = [
    { name: 'Concrete Volume', val: `${formatNumber(materials.concrete_volume ?? 0)} m³`, desc: 'Foundation, slabs & columns', icon: Package },
    { name: 'Steel Reinforcement', val: `${formatNumber(materials.steel_weight ?? 0)} kg`, desc: 'TMT reinforcement bars', icon: Hammer },
    { name: 'Cement Bags', val: `${materials.cement_bags ?? 0} bags`, desc: 'For concrete & masonry mortar', icon: Package },
    { name: 'Sand Volume', val: `${formatNumber(materials.sand_volume ?? 0)} m³`, desc: 'Fine aggregate source', icon: Package },
    { name: 'Coarse Aggregate', val: `${formatNumber(materials.aggregate_volume ?? 0)} m³`, desc: '20mm aggregate for RCC mixes', icon: Package },
    { name: 'Bricks Count', val: (materials.bricks_count ?? 0).toLocaleString(), desc: 'Common burnt clay bricks', icon: Layers },
    { name: 'AAC Blocks Count', val: (materials.blocks_count ?? 0).toLocaleString(), desc: 'Lightweight AAC blocks', icon: Layers },
    { name: 'Excavation Volume', val: `${formatNumber(materials.excavation_volume ?? 0)} m³`, desc: 'Earthwork for foundations', icon: Hammer },
    { name: 'Plaster Area', val: `${formatNumber(materials.plaster_area ?? 0)} m²`, desc: 'Interior & exterior walls plaster', icon: Layers },
    { name: 'Paint Area', val: `${formatNumber(materials.paint_area ?? 0)} m²`, desc: 'Double coat wall finish paint', icon: Layers },
    { name: 'Flooring Tiles', val: `${formatNumber(materials.tiles_area ?? 0)} m²`, desc: 'Vitrified/ceramic tile flooring', icon: Layers },
    { name: 'Waterproofing', val: `${formatNumber(materials.waterproofing_area ?? 0)} m²`, desc: 'Roof & wet area chemical coat', icon: Layers },
  ].filter(item => {
    // Filter out items that are 0 or empty
    const num = parseFloat(item.val.replace(/,/g, ''))
    return !isNaN(num) && num > 0
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Link
            href={`/projects/${projectId}`}
            className="p-2 rounded-xl border border-black/[0.08] dark:border-white/[0.08] hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h2 className="text-2xl font-black tracking-tight">Estimation Report</h2>
            <p className="text-xs text-black/40 dark:text-white/35 mt-1">
              Generated on {formatDate(estimation.created_at)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: 'BuildWise AI Estimate Report',
                  text: `BOQ Total: ₹${estimation.total_cost.toLocaleString('en-IN')}`,
                  url: window.location.href,
                })
              } else {
                navigator.clipboard.writeText(window.location.href)
                alert('Project estimation link copied to clipboard!')
              }
            }}
            className="p-2.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] hover:bg-black/[0.03] dark:hover:bg-white/[0.03] text-black/60 dark:text-white/50 transition-all"
            title="Share Link"
          >
            <Share2 className="w-4.5 h-4.5 w-[18px] h-[18px]" />
          </button>
          <button
            onClick={() => reportMutation.mutate()}
            disabled={reportMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-[13.5px] font-semibold transition-all shadow-lg shadow-violet-600/20"
          >
            {reportMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Generating...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" /> Download PDF BOQ
              </>
            )}
          </button>
        </div>
      </div>

      {/* Summary Cost Block */}
      <div className="bg-violet-600 rounded-[24px] p-6 text-white grid grid-cols-1 sm:grid-cols-3 gap-6 shadow-xl shadow-violet-600/10">
        <div className="space-y-1">
          <span className="text-white/60 text-xs font-semibold tracking-wider uppercase">Project Budget BOQ</span>
          <h3 className="text-3xl font-black">{formatCurrency(estimation.total_cost)}</h3>
          <p className="text-white/40 text-[11px]">Including labor, GST, & contingency buffers</p>
        </div>
        <div className="border-t sm:border-t-0 sm:border-l border-white/10 pt-4 sm:pt-0 sm:pl-6 space-y-1">
          <span className="text-white/60 text-xs font-semibold tracking-wider uppercase">Concrete & Steel</span>
          <h4 className="text-xl font-bold">{formatCurrency(cost.concrete_cost + cost.steel_cost)}</h4>
          <p className="text-white/40 text-[11px]">Total core structural frames cost</p>
        </div>
        <div className="border-t sm:border-t-0 sm:border-l border-white/10 pt-4 sm:pt-0 sm:pl-6 space-y-1">
          <span className="text-white/60 text-xs font-semibold tracking-wider uppercase">Labour & margins</span>
          <h4 className="text-xl font-bold">{formatCurrency(cost.labour_cost + cost.contractor_margin)}</h4>
          <p className="text-white/40 text-[11px]">Contractor overheads and worker wages</p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Material Takeoff Grid Cards */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-[#1E1E24] border border-black/[0.06] dark:border-white/[0.06] rounded-[24px] p-6">
            <h3 className="font-bold text-[15px] mb-5 pb-3 border-b border-black/[0.05] dark:border-white/[0.05]">Material Takeoff List</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {materialItems.map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.name} className="flex gap-3 p-3.5 rounded-2xl border border-black/[0.06] dark:border-white/[0.06] bg-black/[0.01] dark:bg-white/[0.01] hover:border-violet-500/15 transition-all">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500 flex-shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-black/40 dark:text-white/30">{item.name}</p>
                      <p className="text-[15px] font-black mt-0.5">{item.val}</p>
                      <p className="text-[10px] text-black/35 dark:text-white/20 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Detailed BOQ Table */}
          <div className="bg-white dark:bg-[#1E1E24] border border-black/[0.06] dark:border-white/[0.06] rounded-[24px] p-6">
            <h3 className="font-bold text-[15px] mb-5">Bill of Quantities (BOQ)</h3>
            <div className="overflow-x-auto border border-black/[0.06] dark:border-white/[0.06] rounded-2xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-black/[0.02] dark:bg-white/[0.02] text-[11px] font-bold text-black/40 dark:text-white/30 uppercase border-b border-black/[0.06] dark:border-white/[0.06]">
                    <th className="px-4 py-3">Component Description</th>
                    <th className="px-4 py-3 text-right">Cost (INR)</th>
                    <th className="px-4 py-3 text-right">Share (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.05] dark:divide-white/[0.05] text-[13px]">
                  {[
                    ['Concrete structural framing', cost.concrete_cost],
                    ['Steel reinforcements', cost.steel_cost],
                    ['Cement supply', cost.cement_cost],
                    ['Masonry masonry brickwork', cost.brick_cost + cost.block_cost],
                    ['Sand aggregate supply', cost.sand_cost + cost.aggregate_cost],
                    ['Mortar plaster finishing', cost.mortar_cost + cost.plaster_cost],
                    ['Flooring floor tiling', cost.tiles_cost],
                    ['Excavation foundation ground prep', cost.excavation_cost],
                    ['Wall decorative paintings', cost.paint_cost],
                    ['Waterproofing barrier layer', cost.waterproofing_cost],
                    ['Direct craft labour workforce', cost.labour_cost],
                    ['Overhead/contingency buffer', cost.contingency + cost.contractor_margin + cost.gst_amount],
                  ].filter(row => row[1] > 0).map(([label, val]) => (
                    <tr key={label as string} className="hover:bg-black/[0.01] dark:hover:bg-white/[0.01]">
                      <td className="px-4 py-3.5 font-medium">{label}</td>
                      <td className="px-4 py-3.5 text-right font-bold text-violet-500">₹{(val as number).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3.5 text-right text-black/40 dark:text-white/30">
                        {((val as number) / cost.grand_total * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Cost Charts & Breakdown Sidebar */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#1E1E24] border border-black/[0.06] dark:border-white/[0.06] rounded-[24px] p-5">
            <h3 className="font-bold text-[14px] mb-4">Cost Distribution</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => value !== undefined && value !== null ? `₹${Number(value).toLocaleString()}` : ''} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Custom Legend */}
            <div className="space-y-1.5 mt-2">
              {pieData.map((item, idx) => (
                <div key={item.name} className="flex items-center justify-between text-[11px] font-medium text-black/50 dark:text-white/40">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[idx % COLORS.length] }} />
                    <span className="truncate max-w-[150px]">{item.name}</span>
                  </div>
                  <span>{((item.value / cost.grand_total) * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-[#1E1E24] border border-black/[0.06] dark:border-white/[0.06] rounded-[24px] p-5 space-y-4">
            <h3 className="font-bold text-[14px] pb-3 border-b border-black/[0.05] dark:border-white/[0.05]">Detailed Cost Breakdown</h3>
            <div className="space-y-2 text-[12.5px]">
              <div className="flex justify-between text-black/55 dark:text-white/40">
                <span>Material Cost</span>
                <span>{formatCurrency(cost.total_material_cost)}</span>
              </div>
              <div className="flex justify-between text-black/55 dark:text-white/40">
                <span>Labour Cost</span>
                <span>{formatCurrency(cost.labour_cost)}</span>
              </div>
              <div className="flex justify-between text-black/55 dark:text-white/40">
                <span>Equipment & Machinery</span>
                <span>{formatCurrency(cost.equipment_cost)}</span>
              </div>
              <div className="flex justify-between text-black/55 dark:text-white/40">
                <span>Contractor Margin (10%)</span>
                <span>{formatCurrency(cost.contractor_margin)}</span>
              </div>
              <div className="flex justify-between text-black/55 dark:text-white/40">
                <span>Contingency Buffer (5%)</span>
                <span>{formatCurrency(cost.contingency)}</span>
              </div>
              <div className="flex justify-between text-black/55 dark:text-white/40">
                <span>GST (18% applied)</span>
                <span>{formatCurrency(cost.gst_amount)}</span>
              </div>
              <div className="flex justify-between text-[14.5px] font-black text-violet-500 pt-3 border-t border-black/[0.05] dark:border-white/[0.05] mt-3">
                <span>Grand Total</span>
                <span>{formatCurrency(cost.grand_total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
