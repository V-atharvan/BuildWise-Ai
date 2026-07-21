'use client'

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import Link from 'next/link'
import {
  ArrowLeft, Download, Share2, FileText, CheckCircle2, DollarSign,
  Layers, Hammer, Package, Calculator, Loader2, Sparkles, Building,
  FileSpreadsheet, FileDown, ShieldAlert, AlertTriangle, Coins, Truck,
  Settings, Users, ClipboardList, ChevronDown, ChevronRight, Search, BarChart3, ToggleLeft
} from 'lucide-react'
import { estimationApi, reportsApi } from '@/lib/api'
import { formatCurrency, formatNumber, formatDate } from '@/lib/utils'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  LineChart, Line, Treemap, AreaChart, Area
} from 'recharts'
import { exportToExcel, exportToCSV, exportToPDF } from '@/lib/boq-generator'
import { calculateTakeoff, type TakeoffParams } from '@/lib/estimation-engine'
import {
  BRICK_CATALOG, CEMENT_BRANDS, STEEL_BRAND_LIST,
  SAND_CATALOG, AGGREGATE_CATALOG
} from '@/lib/construction-data'

const COLORS = ['#7C3AED', '#A78BFA', '#C4B5FD', '#F59E0B', '#10B981', '#EF4444', '#3B82F6', '#6B7280']

type ActiveTab = 'dashboard' | 'rooms' | 'walls' | 'labor' | 'settings'

export default function EstimatePage() {
  const { id: projectId } = useParams() as { id: string }
  const searchParams = useSearchParams()
  const estimationId = searchParams.get('estimation_id')
  const planId = searchParams.get('plan_id')
  const router = useRouter()

  const isDemoProject = projectId?.startsWith('demo_proj_')
  const isDemoEst = estimationId?.startsWith('demo_est_') || isDemoProject

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard')
  const [dashboardView, setDashboardView] = useState<'boq' | 'analytics'>('boq')

  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Expandable cost tree states
  const [expandedTrees, setExpandedTrees] = useState<Record<string, boolean>>({
    cement: false,
    steel: false,
    masonry: false,
    sand: false,
    tiles: false
  })

  const toggleTree = (key: string) => {
    setExpandedTrees(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Room search & sorting states
  const [roomQuery, setRoomQuery] = useState('')
  const [roomSortField, setRoomSortField] = useState<'label' | 'area_m2' | 'total_cost'>('label')
  const [roomSortOrder, setRoomSortOrder] = useState<'asc' | 'desc'>('asc')

  // Wall search, filtering & sorting states
  const [wallQuery, setWallQuery] = useState('')
  const [wallMinLength, setWallMinLength] = useState<number>(0)
  const [wallSortField, setWallSortField] = useState<'name' | 'length' | 'cost'>('name')
  const [wallSortOrder, setWallSortOrder] = useState<'asc' | 'desc'>('asc')

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

  const initialEstimation = estimationId
    ? (localEstimations.find(e => e.id === estimationId) || (typeof window !== 'undefined' ? (() => { try { return JSON.parse(localStorage.getItem(`bw_demo_est_${estimationId}`) || 'null') } catch { return null } })() : null))
    : (localEstimations.length > 0 ? localEstimations[0] : null)

  // Load plan geometry from localStorage for dynamic recalculations
  const [planGeometry, setPlanGeometry] = useState<any>(null)
  useEffect(() => {
    try {
      const keys = Object.keys(localStorage)
      const planKey = keys.find(k => 
        k.startsWith('bw_demo_plan_') && 
        (k.endsWith(projectId) || 
         JSON.parse(localStorage.getItem(k) || '{}').id === projectId || 
         JSON.parse(localStorage.getItem(k) || '{}').project_id === projectId)
      )
      if (planKey) {
        const planRaw = localStorage.getItem(planKey)
        if (planRaw) {
          setPlanGeometry(JSON.parse(planRaw).detected_data)
        }
      }
    } catch (e) {
      console.error(e)
    }
  }, [projectId])

  // React Query fetch for backend estimation
  const { data: estimations, isLoading: listLoading } = useQuery({
    queryKey: ['estimations', projectId],
    queryFn: () => estimationApi.list(projectId).then((r) => r.data).catch(() => []),
    enabled: !estimationId && !isDemoEst,
    retry: false,
  })

  const activeEstId = estimationId || initialEstimation?.id || (estimations && estimations.length > 0 ? estimations[0].id : null)

  const { data: backendEstimation, isLoading: estLoading } = useQuery({
    queryKey: ['estimation', activeEstId],
    queryFn: () => estimationApi.get(activeEstId!).then((r) => r.data).catch(() => null),
    enabled: !!activeEstId && !isDemoEst,
    retry: false,
  })

  const baseEstimation = initialEstimation || backendEstimation

  // Live state of estimation allowing reactive parameters adjustments
  const [estimation, setEstimation] = useState<any>(null)
  const [paramsState, setParamsState] = useState<TakeoffParams | null>(null)

  useEffect(() => {
    if (baseEstimation) {
      setEstimation(baseEstimation)
      if (baseEstimation.user_inputs) {
        setParamsState(baseEstimation.user_inputs)
      } else {
        setParamsState({
          building_type: 'residential',
          num_floors: 1,
          floor_height: 3.0,
          wall_thickness: 0.23,
          slab_thickness: 0.12,
          concrete_grade: 'M20',
          steel_grade: 'Fe500',
          mortar_ratio: '1:5',
          foundation_type: 'isolated',
          roof_type: 'flat_rcc',
          brick_type: 'red_brick',
          waste_percentage: 5,
          rate_brick: 10,
          rate_cement: 430,
          rate_steel: 75,
          rate_sand: 1400,
          rate_aggregate: 1600,
          rate_plaster: 280,
          rate_paint: 120,
          rate_tiles: 650
        })
      }
    }
  }, [baseEstimation])

  // Live recalculate handler
  const handleParamChange = (key: keyof TakeoffParams, val: any) => {
    if (!paramsState) return
    const updatedParams = { ...paramsState, [key]: val }
    setParamsState(updatedParams)

    const geom = planGeometry || (estimation ? estimation.plan_geometry : null)
    if (!geom) return

    const recalculated = calculateTakeoff(geom, updatedParams)
    setEstimation(recalculated)

    // Persist local storage change in demo mode
    if (isDemoEst && activeEstId) {
      localStorage.setItem(`bw_demo_est_${activeEstId}`, JSON.stringify(recalculated))
    }
  }

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
      if (estimation) {
        exportToExcel(estimation, projectId)
      }
    }
  })

  const isLoading = !isDemoEst && (listLoading || estLoading)

  // Derived variables
  const roomsList = estimation?.plan_geometry?.rooms || estimation?.room_takeoffs || []
  const wallThickness = paramsState?.wall_thickness ?? 0.23
  const floorHeight = paramsState?.floor_height ?? 3.0

  // 1. Reconstruct all individual wall segments dynamically
  const wallList = useMemo(() => {
    if (!roomsList || roomsList.length === 0) return []
    const list: any[] = []
    roomsList.forEach((room: any) => {
      const poly = room.polygon
      if (!poly || poly.length < 3) return
      poly.forEach((p1: number[], idx: number) => {
        const p2 = poly[(idx + 1) % poly.length]
        const dx = p2[0] - p1[0]
        const dy = p2[1] - p1[1]
        const len = Math.sqrt(dx*dx + dy*dy) * 0.015 // pixel scale factor
        
        const thick = wallThickness
        const h = floorHeight
        const vol = len * thick * h
        const isAAC = paramsState?.brick_type === 'aac_block'
        const blockVg = 0.603 * 0.203 * 0.203
        const bricksCount = isAAC ? Math.ceil(vol / blockVg) : Math.round(vol * 500)
        const cementBags = isAAC ? 0 : Math.round(vol * 0.22 * 1.33 / 0.0347)
        const plasterArea = len * h * 2

        const rateBrick = paramsState?.rate_brick ?? 10
        const rateCement = paramsState?.rate_cement ?? 430
        const ratePlaster = paramsState?.rate_plaster ?? 280
        
        const costVal = (bricksCount * rateBrick) + (cementBags * rateCement) + (plasterArea * ratePlaster)

        list.push({
          id: `W-${room.id}-${idx}`,
          name: `Wall W-${room.label.substring(0,3).toUpperCase()}-${idx+1}`,
          roomLabel: room.label,
          length: len,
          thickness: thick,
          height: h,
          bricks: bricksCount,
          cement: cementBags,
          plaster: plasterArea,
          cost: costVal
        })
      })
    })
    return list
  }, [roomsList, wallThickness, floorHeight, paramsState])

  // Sorting and Filtering for Rooms
  const filteredRooms = useMemo(() => {
    if (!estimation?.room_takeoffs) return []
    return estimation.room_takeoffs
      .filter((r: any) => r.label.toLowerCase().includes(roomQuery.toLowerCase()))
      .sort((a: any, b: any) => {
        let valA = a[roomSortField]
        let valB = b[roomSortField]
        if (typeof valA === 'string') {
          return roomSortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA)
        }
        return roomSortOrder === 'asc' ? valA - valB : valB - valA
      })
  }, [estimation, roomQuery, roomSortField, roomSortOrder])

  // Sorting, Filtering for Walls
  const filteredWalls = useMemo(() => {
    return wallList
      .filter((w: any) => 
        w.name.toLowerCase().includes(wallQuery.toLowerCase()) || 
        w.roomLabel.toLowerCase().includes(wallQuery.toLowerCase())
      )
      .filter((w: any) => w.length >= wallMinLength)
      .sort((a: any, b: any) => {
        let valA = a[wallSortField]
        let valB = b[wallSortField]
        if (typeof valA === 'string') {
          return wallSortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA)
        }
        return wallSortOrder === 'asc' ? valA - valB : valB - valA
      })
  }, [wallList, wallQuery, wallMinLength, wallSortField, wallSortOrder])

  if (isLoading || !isMounted) {
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

  if (!estimation || !paramsState) {
    return (
      <div className="text-center py-20 bg-white dark:bg-[#1E1E24] border border-black/[0.06] dark:border-white/[0.06] rounded-[24px]">
        <Calculator className="w-14 h-14 mx-auto text-black/15 dark:text-white/10 mb-4" />
        <h3 className="text-lg font-bold mb-2">No Takeoff Calculations Yet</h3>
        <p className="text-sm text-black/40 dark:text-white/30 mb-6">
          Run floor plan image scanning or configure building bounds to run takeoff estimation.
        </p>
        <Link href={`/projects/${projectId}`} className="btn btn-primary">
          <ArrowLeft className="w-4 h-4" /> Back to Project
        </Link>
      </div>
    )
  }

  const materials = estimation.materials
  const cost = estimation.cost_breakdown

  // Pie chart cost distribution
  const pieData = [
    { name: 'Masonry / Bricks', value: cost.brick_cost + cost.block_cost },
    { name: 'Cement Bags', value: cost.cement_cost },
    { name: 'Steel TMT', value: cost.steel_cost },
    { name: 'Sand & Aggregate', value: cost.sand_cost + cost.aggregate_cost },
    { name: 'Finishes & Plaster', value: cost.plaster_cost + cost.paint_cost },
    { name: 'Flooring Tiles', value: cost.tiles_cost },
    { name: 'Labour Outturns', value: cost.labour_cost },
    { name: 'Excavation & Shutter', value: cost.excavation_cost + cost.equipment_cost + cost.transport_cost + cost.waterproofing_cost }
  ].filter(item => item.value > 0)

  // Recalculating charts data
  const roomCostBarData = estimation.room_takeoffs?.map((r: any) => ({
    name: r.label,
    cost: r.total_cost,
    area: r.area_m2
  })) || []

  const cashFlowData = [
    { month: 'Month 1 (Excavation)', cumulative: Math.round(cost.grand_total * 0.12), monthly: Math.round(cost.grand_total * 0.12) },
    { month: 'Month 2 (Foundation)', cumulative: Math.round(cost.grand_total * 0.32), monthly: Math.round(cost.grand_total * 0.20) },
    { month: 'Month 3 (RCC Frame)', cumulative: Math.round(cost.grand_total * 0.60), monthly: Math.round(cost.grand_total * 0.28) },
    { month: 'Month 4 (Brickwork)', cumulative: Math.round(cost.grand_total * 0.78), monthly: Math.round(cost.grand_total * 0.18) },
    { month: 'Month 5 (Plastering)', cumulative: Math.round(cost.grand_total * 0.92), monthly: Math.round(cost.grand_total * 0.14) },
    { month: 'Month 6 (Finishing)', cumulative: Math.round(cost.grand_total * 1.00), monthly: Math.round(cost.grand_total * 0.08) },
  ]

  const materialConsumptionData = [
    { category: 'Foundation', Concrete: Math.round(cost.concrete_cost * 0.4), Masonry: 0, Finishing: 0 },
    { category: 'Plinth Level', Concrete: Math.round(cost.concrete_cost * 0.3), Masonry: Math.round((cost.brick_cost + cost.block_cost) * 0.1), Finishing: 0 },
    { category: 'Superstructure', Concrete: Math.round(cost.concrete_cost * 0.3), Masonry: Math.round((cost.brick_cost + cost.block_cost) * 0.9), Finishing: 0 },
    { category: 'Finishing & Coats', Concrete: 0, Masonry: 0, Finishing: Math.round(cost.plaster_cost + cost.paint_cost + cost.tiles_cost) },
  ]

  const masonDays = Math.ceil(materials.net_wall_volume_m3 / 1.25)
  const helperDays = Math.ceil(materials.excavation_volume / 3.5 + materials.concrete_volume / 2.5)
  const benderDays = Math.ceil(materials.steel_weight / 150)
  const carpenterDays = Math.ceil(materials.concrete_volume * 4.5 / 15.0)
  const supervisorDays = 12

  const labourBarData = [
    { crew: 'Masons', cost: masonDays * 900 },
    { crew: 'Helpers', cost: helperDays * 650 },
    { crew: 'Bar Benders', cost: benderDays * 1000 },
    { crew: 'Carpenters', cost: carpenterDays * 900 },
    { crew: 'Supervisors', cost: supervisorDays * 1200 },
  ]

  const treemapData = [
    {
      name: 'RCC Frame',
      children: [
        { name: 'Concrete Mix', value: Math.round(cost.concrete_cost || 1) },
        { name: 'Reinforcement', value: Math.round(cost.steel_cost || 1) }
      ]
    },
    {
      name: 'Masonry/Plaster',
      children: [
        { name: 'Bricks & Blocks', value: Math.round(cost.brick_cost + cost.block_cost || 1) },
        { name: 'Plaster coats', value: Math.round(cost.plaster_cost || 1) }
      ]
    },
    {
      name: 'Others',
      children: [
        { name: 'Tiling', value: Math.round(cost.tiles_cost || 1) },
        { name: 'Painting', value: Math.round(cost.paint_cost || 1) },
        { name: 'Excavations', value: Math.round(cost.excavation_cost || 1) }
      ]
    }
  ]

  // Material item list
  const materialItems = [
    { name: 'Concrete volume', val: `${formatNumber(materials.concrete_volume ?? 0)} m³`, desc: `Slabs: ${formatNumber(materials.concrete_slabs_m3 ?? 0)}m³, Columns: ${formatNumber(materials.concrete_columns_m3 ?? 0)}m³, Beams: ${formatNumber(materials.concrete_beams_m3 ?? 0)}m³`, icon: Package },
    { name: 'Steel Reinforcing', val: `${formatNumber(materials.steel_weight ?? 0)} kg`, desc: `TMT steel reinforcement bars weight`, icon: Hammer },
    { name: 'Cement bags count', val: `${materials.cement_bags ?? 0} bags`, desc: 'OPC/PPC bags (50kg each) required', icon: Package },
    { name: 'Fine Sand', val: `${formatNumber(materials.sand_volume ?? 0)} m³`, desc: 'Supply volume including bulking correction (1.20)', icon: Package },
    { name: 'Aggregate stone', val: `${formatNumber(materials.aggregate_volume ?? 0)} m³`, desc: 'Graded coarse aggregate mix', icon: Package },
    { name: 'Burnt Clay Bricks', val: (materials.bricks_count ?? 0).toLocaleString(), desc: 'Traditional red bricks count', icon: Layers },
    { name: 'AAC Wall Blocks', val: (materials.blocks_count ?? 0).toLocaleString(), desc: 'Lightweight aerated blocks count', icon: Layers },
    { name: 'Excavation Volume', val: `${formatNumber(materials.excavation_volume ?? 0)} m³`, desc: 'Ground prep & trench digs', icon: Hammer },
    { name: 'Plaster area', val: `${formatNumber(materials.plaster_area ?? 0)} m²`, desc: 'Internal 12mm and external 20mm plaster coats', icon: Layers },
    { name: 'Double coat Paint', val: `${formatNumber(materials.paint_area ?? 0)} m²`, desc: 'Surface paints (emulsion + primer + putty)', icon: Layers },
    { name: 'Flooring Tiles', val: `${formatNumber(materials.tiles_area ?? 0)} m²`, desc: `Needs ${materials.tiles_boxes} Vitrified boxes`, icon: Layers },
  ].filter(item => {
    const num = parseFloat(item.val.replace(/,/g, ''))
    return !isNaN(num) && num > 0
  })

  const isMissingColumns = (planGeometry?.columns?.length ?? 0) === 0

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
            <h2 className="text-2xl font-black tracking-tight">Engineering Quantity Takeoff</h2>
            <p className="text-xs text-black/40 dark:text-white/35 mt-1">
              Deterministic calculations based on validated drawing geometry • {formatDate(estimation.created_at)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportToPDF(estimation, projectId)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] text-[13px] font-semibold hover:bg-black/[0.03] dark:hover:bg-white/[0.03] text-black/70 dark:text-white/60 transition-all"
          >
            <FileDown className="w-4 h-4" /> PDF BOQ
          </button>
          <button
            onClick={() => exportToExcel(estimation, projectId)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] text-[13px] font-semibold hover:bg-black/[0.03] dark:hover:bg-white/[0.03] text-black/70 dark:text-white/60 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </button>
        </div>
      </div>

      {/* Preliminary Alert */}
      {isMissingColumns && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-[13px] font-black text-amber-600 dark:text-amber-500">Preliminary Estimate (Missing Structural Data)</h4>
            <p className="text-[12px] text-black/50 dark:text-white/40 mt-0.5">
              No columns or reinforcement steel maps were detected on the 2D architectural drawing. 
              The concrete beams, column nodes, and steel weights have been modeled using nominal CPWD structural density indices.
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1.5 p-1 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.05] max-w-2xl overflow-x-auto no-scrollbar">
        {[
          { id: 'dashboard', label: 'Takeoff Dashboard', icon: ClipboardList },
          { id: 'rooms', label: 'Room Comparison', icon: Building },
          { id: 'walls', label: 'Wall Comparison', icon: Layers },
          { id: 'labor', label: 'Labor & Logistics', icon: Users },
          { id: 'settings', label: 'Calculator Settings', icon: Settings },
        ].map(tab => {
          const Icon = tab.icon
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ActiveTab)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-bold transition-all flex-shrink-0 ${
                active 
                  ? 'bg-violet-600 text-white shadow-md' 
                  : 'text-black/50 dark:text-white/45 hover:text-black dark:hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* ── Takeoff Dashboard Tab ──────────────────────────────────────────────── */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          
          {/* Dashboard Mode Selector */}
          <div className="flex justify-between items-center bg-white dark:bg-[#1E1E24] p-3 rounded-2xl border border-black/[0.05] dark:border-white/[0.05]">
            <div className="flex items-center gap-2">
              <span className="text-[12.5px] font-black text-violet-500 uppercase tracking-wider">Takeoff cockpit</span>
            </div>
            <div className="flex gap-1 bg-black/[0.03] dark:bg-white/[0.03] p-1 rounded-xl">
              <button 
                onClick={() => setDashboardView('boq')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${dashboardView === 'boq' ? 'bg-violet-600 text-white shadow-sm' : 'text-black/50'}`}
              >
                BOQ Table View
              </button>
              <button 
                onClick={() => setDashboardView('analytics')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${dashboardView === 'analytics' ? 'bg-violet-600 text-white shadow-sm' : 'text-black/50'}`}
              >
                Analytics Cockpit
              </button>
            </div>
          </div>

          {dashboardView === 'boq' ? (
            <>
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

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  {/* Material Takeoff Grid Cards */}
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
                              <p className="text-[11px] text-black/40 dark:text-white/30">{item.name}</p>
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
                    <h3 className="font-bold text-[15px] mb-5">Bill of Quantities (BOQ) — IS 1200 Division</h3>
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
                            ['Concrete structural framing (RCC)', cost.concrete_cost],
                            ['Steel reinforcement rods', cost.steel_cost],
                            ['Cement supply (OPC/PPC)', cost.cement_cost],
                            ['Masonry Brickwork / AAC Blocks', cost.brick_cost + cost.block_cost],
                            ['Fine Sand & Aggregates', cost.sand_cost + cost.aggregate_cost],
                            ['Mortar Plastering', cost.plaster_cost],
                            ['Flooring (Vitrified Tiles)', cost.tiles_cost],
                            ['Excavation & Trenching', cost.excavation_cost],
                            ['Wall Decorative Painting', cost.paint_cost],
                            ['Waterproofing chemical barrier', cost.waterproofing_cost],
                            ['Direct craft labour wages', cost.labour_cost],
                            ['Equipment Centering hire', cost.equipment_cost],
                            ['Contractor margin & logistics', cost.contractor_margin + cost.contingency + cost.gst_amount],
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

                  {/* Interactive Cost Breakdown Trees (Section 18) */}
                  <div className="bg-white dark:bg-[#1E1E24] border border-black/[0.06] dark:border-white/[0.06] rounded-[24px] p-6 space-y-4">
                    <div>
                      <h3 className="font-bold text-[15px]">Supply Line Hierarchy (Interactive)</h3>
                      <p className="text-xs text-black/45 dark:text-white/35 mt-0.5">Click cement, steel or brick to expand detailed brands pricing</p>
                    </div>
                    
                    <div className="space-y-2 text-[13px]">
                      {/* Cement Category */}
                      <div className="border border-black/[0.05] dark:border-white/[0.05] rounded-xl overflow-hidden">
                        <div 
                          onClick={() => toggleTree('cement')}
                          className="flex justify-between items-center p-3.5 bg-black/[0.01] dark:bg-white/[0.01] cursor-pointer hover:bg-black/[0.02]"
                        >
                          <div className="flex items-center gap-2 font-bold text-black/80 dark:text-white/80">
                            {expandedTrees.cement ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            <span>Cement Supply Lines</span>
                          </div>
                          <span className="font-black text-violet-500">{formatCurrency(cost.cement_cost)}</span>
                        </div>
                        {expandedTrees.cement && (
                          <div className="p-3.5 bg-black/[0.02] dark:bg-white/[0.02] border-t border-black/[0.04] space-y-2 text-[12px] leading-relaxed">
                            <p className="text-black/50 dark:text-white/40 uppercase font-black text-[9px] tracking-wider mb-2">CPWD Recommended Brands & Specifications</p>
                            <div className="flex justify-between items-center py-1">
                              <span>Premium OPC 53 Grade (Ultratech / Ambuja)</span>
                              <span className="font-semibold text-black/70">{materials.cement_bags} Bags @ ₹{paramsState.rate_cement ?? 430}</span>
                            </div>
                            <div className="flex justify-between items-center py-1 text-[11px] text-black/40 dark:text-white/30 border-t border-black/[0.03]">
                              <span>Alternate PPC Cement (Ramco / ACC)</span>
                              <span>Est. price: ₹{(paramsState.rate_cement ?? 430) - 20} / bag (50kg)</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Steel TMT Category */}
                      <div className="border border-black/[0.05] dark:border-white/[0.05] rounded-xl overflow-hidden">
                        <div 
                          onClick={() => toggleTree('steel')}
                          className="flex justify-between items-center p-3.5 bg-black/[0.01] dark:bg-white/[0.01] cursor-pointer hover:bg-black/[0.02]"
                        >
                          <div className="flex items-center gap-2 font-bold text-black/80 dark:text-white/80">
                            {expandedTrees.steel ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            <span>Steel Reinforcement (TMT)</span>
                          </div>
                          <span className="font-black text-violet-500">{formatCurrency(cost.steel_cost)}</span>
                        </div>
                        {expandedTrees.steel && (
                          <div className="p-3.5 bg-black/[0.02] dark:bg-white/[0.02] border-t border-black/[0.04] space-y-2 text-[12px]">
                            <p className="text-black/50 dark:text-white/40 uppercase font-black text-[9px] tracking-wider mb-2">Structural Rebar Specs</p>
                            <div className="flex justify-between items-center py-1">
                              <span>High-Ductility Fe550D TMT Bars (Tata Tiscon / JSW)</span>
                              <span className="font-semibold text-black/70">{materials.steel_weight.toLocaleString()} kg @ ₹{paramsState.rate_steel ?? 75}/kg</span>
                            </div>
                            <div className="flex justify-between items-center py-1 text-[11px] text-black/40 dark:text-white/30 border-t border-black/[0.03]">
                              <span>Nominal Steel weight ratio</span>
                              <span>Slab: 90kg/m³, Beams: 150kg/m³, Columns: 120kg/m³</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Masonry Bricks Category */}
                      <div className="border border-black/[0.05] dark:border-white/[0.05] rounded-xl overflow-hidden">
                        <div 
                          onClick={() => toggleTree('masonry')}
                          className="flex justify-between items-center p-3.5 bg-black/[0.01] dark:bg-white/[0.01] cursor-pointer hover:bg-black/[0.02]"
                        >
                          <div className="flex items-center gap-2 font-bold text-black/80 dark:text-white/80">
                            {expandedTrees.masonry ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            <span>Masonry Blocks & Bricks</span>
                          </div>
                          <span className="font-black text-violet-500">{formatCurrency(cost.brick_cost + cost.block_cost)}</span>
                        </div>
                        {expandedTrees.masonry && (
                          <div className="p-3.5 bg-black/[0.02] dark:bg-white/[0.02] border-t border-black/[0.04] space-y-2 text-[12px]">
                            <p className="text-black/50 dark:text-white/40 uppercase font-black text-[9px] tracking-wider mb-2">Masonry Units Specification</p>
                            {paramsState.brick_type === 'aac_block' ? (
                              <div className="flex justify-between items-center py-1">
                                <span>AAC Blocks (600x200x200 mm)</span>
                                <span className="font-semibold text-black/70">{materials.blocks_count.toLocaleString()} pcs @ ₹{paramsState.rate_brick ?? 55}/pc</span>
                              </div>
                            ) : (
                              <div className="flex justify-between items-center py-1">
                                <span>Burnt Red Clay Bricks</span>
                                <span className="font-semibold text-black/70">{materials.bricks_count.toLocaleString()} pcs @ ₹{paramsState.rate_brick ?? 10}/pc</span>
                              </div>
                            )}
                            <div className="flex justify-between items-center py-1 text-[11px] text-black/40 dark:text-white/30 border-t border-black/[0.03]">
                              <span>Mortar Compaction dry volume index</span>
                              <span>1.33 dry shrinkage compaction factor</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                  {/* Cost Distribution Chart */}
                  <div className="bg-white dark:bg-[#1E1E24] border border-black/[0.06] dark:border-white/[0.06] rounded-[24px] p-5">
                    <h3 className="font-bold text-[14px] mb-4">Cost Distribution</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height={240}>
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

                  {/* Cost Summary Cards */}
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
                        <span>Logistics & Transport</span>
                        <span>{formatCurrency(cost.transport_cost)}</span>
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
            </>
          ) : (
            /* Analytics Dashboard (Section 13) */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Chart 1: Donut Cost Allocation */}
              <div className="bg-white dark:bg-[#1E1E24] border border-black/[0.06] dark:border-white/[0.06] rounded-[24px] p-5">
                <h4 className="font-bold text-xs uppercase tracking-wider text-black/40 mb-4">Cost Allocation (Donut)</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={2} dataKey="value">
                        {pieData.map((entry, idx) => (
                          <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => `₹${Number(v).toLocaleString()}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 2: Cumulative Cash Flow Forecast */}
              <div className="bg-white dark:bg-[#1E1E24] border border-black/[0.06] dark:border-white/[0.06] rounded-[24px] p-5">
                <h4 className="font-bold text-xs uppercase tracking-wider text-black/40 mb-4">6-Month Cash Flow Forecast (Cumulative)</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={cashFlowData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis dataKey="month" tick={{ fontSize: 9 }} />
                      <YAxis tickFormatter={(v) => `₹${(v/100000).toFixed(1)}L`} />
                      <Tooltip formatter={(v) => `₹${Number(v).toLocaleString()}`} />
                      <Area type="monotone" dataKey="cumulative" stroke="#7C3AED" fill="#8B5CF6" fillOpacity={0.15} strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 3: Room-Wise Cost Bar */}
              <div className="bg-white dark:bg-[#1E1E24] border border-black/[0.06] dark:border-white/[0.06] rounded-[24px] p-5">
                <h4 className="font-bold text-xs uppercase tracking-wider text-black/40 mb-4">Room-wise Cost Distribution</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={roomCostBarData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                      <YAxis tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v) => `₹${Number(v).toLocaleString()}`} />
                      <Bar dataKey="cost" fill="#10B981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 4: Concrete vs Masonry Stacked Bar */}
              <div className="bg-white dark:bg-[#1E1E24] border border-black/[0.06] dark:border-white/[0.06] rounded-[24px] p-5">
                <h4 className="font-bold text-xs uppercase tracking-wider text-black/40 mb-4">Material Consumption Phase Analysis</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={materialConsumptionData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis dataKey="category" tick={{ fontSize: 9 }} />
                      <YAxis tickFormatter={(v) => `₹${(v/100000).toFixed(1)}L`} />
                      <Tooltip formatter={(v) => `₹${Number(v).toLocaleString()}`} />
                      <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 10 }} />
                      <Bar dataKey="Concrete" stackId="a" fill="#3B82F6" />
                      <Bar dataKey="Masonry" stackId="a" fill="#F59E0B" />
                      <Bar dataKey="Finishing" stackId="a" fill="#8B5CF6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 5: Labour Crew Allocation (Horizontal Bar) */}
              <div className="bg-white dark:bg-[#1E1E24] border border-black/[0.06] dark:border-white/[0.06] rounded-[24px] p-5">
                <h4 className="font-bold text-xs uppercase tracking-wider text-black/40 mb-4">Labour Wages Allocation</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={labourBarData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis type="number" tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                      <YAxis dataKey="crew" type="category" tick={{ fontSize: 9 }} />
                      <Tooltip formatter={(v) => `₹${Number(v).toLocaleString()}`} />
                      <Bar dataKey="cost" fill="#A78BFA" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 6: Budget Allocation Treemap */}
              <div className="bg-white dark:bg-[#1E1E24] border border-black/[0.06] dark:border-white/[0.06] rounded-[24px] p-5">
                <h4 className="font-bold text-xs uppercase tracking-wider text-black/40 mb-4">Budget Treemap Allocation</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height={240}>
                    <Treemap
                      data={treemapData}
                      dataKey="value"
                      stroke="#fff"
                      fill="#7C3AED"
                      aspectRatio={4 / 3}
                    />
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Room Comparison Tab (Section 14) ────────────────────────────────────── */}
      {activeTab === 'rooms' && (
        <div className="bg-white dark:bg-[#1E1E24] border border-black/[0.06] dark:border-white/[0.06] rounded-[24px] p-6 space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h3 className="font-bold text-[16px]">Room-Wise Quantity Takeoff Matrix</h3>
              <p className="text-xs text-black/40 dark:text-white/35 mt-0.5">
                Sortable and searchable dashboard of room allocations.
              </p>
            </div>
            
            {/* Search and Filters */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-black/35" />
                <input 
                  type="text" 
                  placeholder="Search rooms..." 
                  value={roomQuery}
                  onChange={(e) => setRoomQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-xl border border-black/10 dark:border-white/10 bg-transparent text-xs focus:outline-none focus:border-violet-500 font-semibold"
                />
              </div>
              
              <select
                value={roomSortField}
                onChange={(e) => setRoomSortField(e.target.value as any)}
                className="p-1.5 rounded-xl border border-black/10 dark:border-white/10 bg-transparent text-xs font-semibold focus:outline-none"
              >
                <option value="label">Sort: Label</option>
                <option value="area_m2">Sort: Area</option>
                <option value="total_cost">Sort: Subtotal</option>
              </select>

              <button
                onClick={() => setRoomSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="p-1.5 border border-black/10 rounded-xl text-xs font-bold text-black/60 hover:bg-black/5"
              >
                {roomSortOrder.toUpperCase()}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-black/[0.06] dark:border-white/[0.06] rounded-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-black/[0.02] dark:bg-white/[0.02] text-[11px] font-bold text-black/40 dark:text-white/30 uppercase border-b border-black/[0.06] dark:border-white/[0.06]">
                  <th className="px-4 py-3">Room Label</th>
                  <th className="px-4 py-3 text-right">Floor Area (m²)</th>
                  <th className="px-4 py-3 text-right">Wall Volume (m³)</th>
                  <th className="px-4 py-3 text-right">Bricks / Blocks</th>
                  <th className="px-4 py-3 text-right">Cement (bags)</th>
                  <th className="px-4 py-3 text-right">Plaster (m²)</th>
                  <th className="px-4 py-3 text-right">Tiles Boxes</th>
                  <th className="px-4 py-3 text-right font-bold text-violet-500">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.05] dark:divide-white/[0.05] text-[13px]">
                {filteredRooms.map((r: any) => (
                  <tr key={r.room_id} className="hover:bg-black/[0.01] dark:hover:bg-white/[0.01]">
                    <td className="px-4 py-3.5 font-semibold text-black/70 dark:text-white/70">{r.label}</td>
                    <td className="px-4 py-3.5 text-right">{r.area_m2.toFixed(1)} m²</td>
                    <td className="px-4 py-3.5 text-right">{r.wall_volume_m3.toFixed(2)} m³</td>
                    <td className="px-4 py-3.5 text-right">{(r.bricks_count || 0).toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-right">{r.cement_bags} bags</td>
                    <td className="px-4 py-3.5 text-right">{r.plaster_m2.toFixed(1)} m²</td>
                    <td className="px-4 py-3.5 text-right">{r.tiles_boxes}</td>
                    <td className="px-4 py-3.5 text-right font-black text-violet-500">₹{r.total_cost.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
                {filteredRooms.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-black/30">No rooms match filter criteria</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Wall Comparison Tab (Section 15) ────────────────────────────────────── */}
      {activeTab === 'walls' && (
        <div className="bg-white dark:bg-[#1E1E24] border border-black/[0.06] dark:border-white/[0.06] rounded-[24px] p-6 space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h3 className="font-bold text-[16px]">Wall-Wise Structural Takeoff Matrix</h3>
              <p className="text-xs text-black/40 dark:text-white/35 mt-0.5">
                Sortable, filterable and searchable analysis of all partition wall segments.
              </p>
            </div>
            
            {/* Search and Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-black/35" />
                <input 
                  type="text" 
                  placeholder="Search walls/rooms..." 
                  value={wallQuery}
                  onChange={(e) => setWallQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-xl border border-black/10 dark:border-white/10 bg-transparent text-xs focus:outline-none focus:border-violet-500 font-semibold"
                />
              </div>

              {/* Length threshold filter */}
              <select
                value={wallMinLength}
                onChange={(e) => setWallMinLength(parseFloat(e.target.value))}
                className="p-1.5 rounded-xl border border-black/10 bg-transparent text-xs font-semibold focus:outline-none"
              >
                <option value={0}>All Lengths</option>
                <option value={2}>&gt; 2.0 m</option>
                <option value={4}>&gt; 4.0 m</option>
                <option value={5}>&gt; 5.0 m</option>
              </select>
              
              <select
                value={wallSortField}
                onChange={(e) => setWallSortField(e.target.value as any)}
                className="p-1.5 rounded-xl border border-black/10 bg-transparent text-xs font-semibold focus:outline-none"
              >
                <option value="name">Sort: Wall ID</option>
                <option value="length">Sort: Length</option>
                <option value="cost">Sort: Cost</option>
              </select>

              <button
                onClick={() => setWallSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="p-1.5 border border-black/10 rounded-xl text-xs font-bold text-black/60 hover:bg-black/5"
              >
                {wallSortOrder.toUpperCase()}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-black/[0.06] dark:border-white/[0.06] rounded-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-black/[0.02] dark:bg-white/[0.02] text-[11px] font-bold text-black/40 dark:text-white/30 uppercase border-b border-black/[0.06] dark:border-white/[0.06]">
                  <th className="px-4 py-3">Wall Tag</th>
                  <th className="px-4 py-3">Parent Room</th>
                  <th className="px-4 py-3 text-right">Length (m)</th>
                  <th className="px-4 py-3 text-right">Thickness (mm)</th>
                  <th className="px-4 py-3 text-right">Volume (m³)</th>
                  <th className="px-4 py-3 text-right">Bricks Req.</th>
                  <th className="px-4 py-3 text-right">Cement (bags)</th>
                  <th className="px-4 py-3 text-right font-bold text-violet-500">Est. Segment Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.05] dark:divide-white/[0.05] text-[13px]">
                {filteredWalls.map((w: any) => (
                  <tr key={w.id} className="hover:bg-black/[0.01] dark:hover:bg-white/[0.01]">
                    <td className="px-4 py-3.5 font-semibold text-black/70 dark:text-white/70">{w.name}</td>
                    <td className="px-4 py-3.5 text-black/50">{w.roomLabel}</td>
                    <td className="px-4 py-3.5 text-right">{w.length.toFixed(2)} m</td>
                    <td className="px-4 py-3.5 text-right">{(w.thickness * 1000).toFixed(0)} mm</td>
                    <td className="px-4 py-3.5 text-right">{(w.length * w.thickness * w.height).toFixed(2)} m³</td>
                    <td className="px-4 py-3.5 text-right">{w.bricks.toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-right">{w.cement} bags</td>
                    <td className="px-4 py-3.5 text-right font-black text-violet-500">₹{w.cost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                  </tr>
                ))}
                {filteredWalls.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-black/30">No wall segments match filter criteria</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Labor & Logistics Tab ──────────────────────────────────────────────── */}
      {activeTab === 'labor' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Labor Schedule */}
          <div className="bg-white dark:bg-[#1E1E24] border border-black/[0.06] dark:border-white/[0.06] rounded-[24px] p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-violet-500" />
              <h3 className="font-bold text-[15px]">Labor Crew Allocation</h3>
            </div>
            <p className="text-xs text-black/40 dark:text-white/35 mt-0.5">
              Estimated days based on CPWD productivity outturn norms.
            </p>
            <div className="space-y-3">
              {[
                { name: 'Masons (Brickwork/Plaster)', days: Math.ceil(materials.net_wall_volume_m3 / 1.25), wage: 900 },
                { name: 'Helpers (Excavation/Mixing)', days: Math.ceil(materials.excavation_volume / 3.5 + materials.concrete_volume / 2.5), wage: 650 },
                { name: 'Bar Benders (Steel layout)', days: Math.ceil(materials.steel_weight / 150), wage: 1000 },
                { name: 'Carpenters & Centering crew', days: Math.ceil(materials.concrete_volume * 4.5 / 15.0), wage: 900 },
                { name: 'Site Supervisor', days: 12, wage: 1200 }
              ].map(crew => (
                <div key={crew.name} className="flex items-center justify-between p-3 rounded-2xl border border-black/[0.04] dark:border-white/[0.04]">
                  <div>
                    <h5 className="text-[12.5px] font-bold">{crew.name}</h5>
                    <p className="text-[10px] text-black/35 dark:text-white/20 mt-0.5">Daily wage: ₹{crew.wage} / day</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-violet-500">{crew.days} worker-days</span>
                    <p className="text-[10px] text-black/35 dark:text-white/20 mt-0.5">Total: ₹{(crew.days * crew.wage).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Logistics & Equipment */}
          <div className="space-y-6">
            {/* Equipment Rentals */}
            <div className="bg-white dark:bg-[#1E1E24] border border-black/[0.06] dark:border-white/[0.06] rounded-[24px] p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-violet-500" />
                <h3 className="font-bold text-[15px]">Equipment & Machinery Rent</h3>
              </div>
              <div className="space-y-3 text-[12.5px]">
                <div className="flex justify-between items-center py-2 border-b border-black/[0.05] dark:border-white/[0.05]">
                  <span>Concrete Mixer Hire</span>
                  <span className="font-bold">₹{Math.ceil(materials.concrete_volume / 8.0) * 1800}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-black/[0.05] dark:border-white/[0.05]">
                  <span>Needle Vibrator Rent</span>
                  <span className="font-bold">₹{Math.ceil(materials.concrete_volume / 8.0) * 500}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-black/[0.05] dark:border-white/[0.05]">
                  <span>Scaffolding Centering sets</span>
                  <span className="font-bold">₹5,000</span>
                </div>
              </div>
            </div>

            {/* Logistics */}
            <div className="bg-white dark:bg-[#1E1E24] border border-black/[0.06] dark:border-white/[0.06] rounded-[24px] p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-violet-500" />
                <h3 className="font-bold text-[15px]">Logistics Trip Planner</h3>
              </div>
              <div className="space-y-3 text-[12.5px]">
                <div className="flex justify-between items-center py-2 border-b border-black/[0.05] dark:border-white/[0.05]">
                  <span>Material Load Weight</span>
                  <span className="font-bold">
                    {(
                      (((materials.bricks_count || 0) * 3.0) + ((materials.blocks_count || 0) * 12)) +
                      (materials.cement_bags * 50) +
                      (materials.steel_weight) +
                      (materials.sand_volume * 1600) +
                      (materials.aggregate_volume * 1500)
                    ).toLocaleString(undefined, { maximumFractionDigits: 0 })} kg
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-black/[0.05] dark:border-white/[0.05]">
                  <span>Approx Truck Trips</span>
                  <span className="font-bold">
                    {Math.ceil(
                      (((materials.bricks_count || 0) * 3.0) + ((materials.blocks_count || 0) * 12) +
                      (materials.cement_bags * 50) +
                      (materials.steel_weight) +
                      (materials.sand_volume * 1600) +
                      (materials.aggregate_volume * 1500)) / 8000
                    )} trips (8-ton trucks)
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-black/[0.05] dark:border-white/[0.05]">
                  <span>Logistics Transport Charge</span>
                  <span className="font-bold text-violet-500">₹{cost.transport_cost.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Settings / Parameters Editor Tab ────────────────────────────────────── */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main settings options */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white dark:bg-[#1E1E24] border border-black/[0.06] dark:border-white/[0.06] rounded-[24px] p-6 space-y-5">
              <h3 className="font-black text-[15px] border-b border-black/[0.05] dark:border-white/[0.05] pb-3 flex items-center gap-2">
                <Settings className="w-4 h-4 text-violet-500" />
                <span>Adjust Building Takeoff Parameters</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-[13px]">
                {/* Floors count */}
                <div className="space-y-1.5">
                  <label className="font-bold text-black/60 dark:text-white/40">Number of Floors</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={paramsState.num_floors}
                    onChange={(e) => handleParamChange('num_floors', parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-transparent font-semibold"
                  />
                </div>

                {/* Floor height */}
                <div className="space-y-1.5">
                  <label className="font-bold text-black/60 dark:text-white/40">Floor Height (m)</label>
                  <input
                    type="number"
                    min="2.5"
                    max="6"
                    step="0.1"
                    value={paramsState.floor_height}
                    onChange={(e) => handleParamChange('floor_height', parseFloat(e.target.value) || 3.0)}
                    className="w-full px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-transparent font-semibold"
                  />
                </div>

                {/* Nominal Wall Thickness */}
                <div className="space-y-1.5">
                  <label className="font-bold text-black/60 dark:text-white/40">Wall Thickness (m)</label>
                  <input
                    type="number"
                    min="0.1"
                    max="0.5"
                    step="0.01"
                    value={paramsState.wall_thickness}
                    onChange={(e) => handleParamChange('wall_thickness', parseFloat(e.target.value) || 0.23)}
                    className="w-full px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-transparent font-semibold"
                  />
                </div>

                {/* Nominal Slab Thickness */}
                <div className="space-y-1.5">
                  <label className="font-bold text-black/60 dark:text-white/40">Slab Thickness (m)</label>
                  <input
                    type="number"
                    min="0.1"
                    max="0.3"
                    step="0.01"
                    value={paramsState.slab_thickness}
                    onChange={(e) => handleParamChange('slab_thickness', parseFloat(e.target.value) || 0.12)}
                    className="w-full px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-transparent font-semibold"
                  />
                </div>

                {/* Concrete Grade */}
                <div className="space-y-1.5">
                  <label className="font-bold text-black/60 dark:text-white/40">Concrete Grade (IS 456)</label>
                  <select
                    value={paramsState.concrete_grade}
                    onChange={(e) => handleParamChange('concrete_grade', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-transparent font-semibold dark:bg-[#19191D]"
                  >
                    <option value="M10">M10 (1:3:6)</option>
                    <option value="M15">M15 (1:2:4)</option>
                    <option value="M20">M20 (1:1.5:3)</option>
                    <option value="M25">M25 (1:1:2)</option>
                    <option value="M30">M30 (1:0.75:1.5)</option>
                  </select>
                </div>

                {/* Brick Type */}
                <div className="space-y-1.5">
                  <label className="font-bold text-black/60 dark:text-white/40">Masonry Unit Type</label>
                  <select
                    value={paramsState.brick_type}
                    onChange={(e) => handleParamChange('brick_type', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-transparent font-semibold dark:bg-[#19191D]"
                  >
                    <option value="red_brick">Burnt Red Clay Brick (230x110x75 mm)</option>
                    <option value="fly_ash">Fly Ash Brick (230x110x75 mm)</option>
                    <option value="aac_block">AAC Block (600x200x200 mm)</option>
                  </select>
                </div>

                {/* Mortar Joint Ratio */}
                <div className="space-y-1.5">
                  <label className="font-bold text-black/60 dark:text-white/40">Mortar Joint Mix Ratio</label>
                  <select
                    value={paramsState.mortar_ratio}
                    onChange={(e) => handleParamChange('mortar_ratio', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-transparent font-semibold dark:bg-[#19191D]"
                    disabled={paramsState.brick_type === 'aac_block'}
                  >
                    <option value="1:4">1:4 (Cement : Sand)</option>
                    <option value="1:5">1:5 (Cement : Sand)</option>
                    <option value="1:6">1:6 (Cement : Sand)</option>
                  </select>
                </div>

                {/* Material Wastage Buffer */}
                <div className="space-y-1.5">
                  <label className="font-bold text-black/60 dark:text-white/40">Nominal Wastage Buffer (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={paramsState.waste_percentage}
                    onChange={(e) => handleParamChange('waste_percentage', parseFloat(e.target.value) || 5)}
                    className="w-full px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-transparent font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* Assumptions summary card */}
            <div className="bg-white dark:bg-[#1E1E24] border border-black/[0.06] dark:border-white/[0.06] rounded-[24px] p-6 space-y-4">
              <h3 className="font-bold text-[14.5px] border-b border-black/[0.05] dark:border-white/[0.05] pb-3">Formulas & Design Assumptions Used</h3>
              <ul className="space-y-2 text-[12px] text-black/60 dark:text-white/45 list-disc pl-4 leading-relaxed">
                {estimation.assumptions?.map((ass: string, idx: number) => (
                  <li key={idx}>{ass}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Unit Pricing Settings Card */}
          <div className="bg-white dark:bg-[#1E1E24] border border-black/[0.06] dark:border-white/[0.06] rounded-[24px] p-5 space-y-5">
            <h3 className="font-bold text-[14px] border-b border-black/[0.05] dark:border-white/[0.05] pb-3">Adjust Material Rates (INR)</h3>
            <div className="space-y-4 text-[12px]">
              {/* Brick rate */}
              <div className="space-y-1">
                <label className="font-bold text-black/50 dark:text-white/35">
                  {paramsState.brick_type === 'aac_block' ? 'AAC Block Rate (per block)' : 'Red Brick Price (per brick)'}
                </label>
                <input
                  type="number"
                  value={paramsState.rate_brick ?? (paramsState.brick_type === 'aac_block' ? 55 : 10)}
                  onChange={(e) => handleParamChange('rate_brick', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 rounded-xl border border-black/10 dark:border-white/10 bg-transparent font-semibold"
                />
              </div>

              {/* Cement bag price */}
              <div className="space-y-1">
                <label className="font-bold text-black/50 dark:text-white/35">Cement Price (per 50kg bag)</label>
                <input
                  type="number"
                  value={paramsState.rate_cement ?? 430}
                  onChange={(e) => handleParamChange('rate_cement', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 rounded-xl border border-black/10 dark:border-white/10 bg-transparent font-semibold"
                />
              </div>

              {/* Steel Price */}
              <div className="space-y-1">
                <label className="font-bold text-black/50 dark:text-white/35">Steel Reinforcement Price (per kg)</label>
                <input
                  type="number"
                  value={paramsState.rate_steel ?? 75}
                  onChange={(e) => handleParamChange('rate_steel', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 rounded-xl border border-black/10 dark:border-white/10 bg-transparent font-semibold"
                />
              </div>

              {/* Sand Price */}
              <div className="space-y-1">
                <label className="font-bold text-black/50 dark:text-white/35">Sand Price (per m³)</label>
                <input
                  type="number"
                  value={paramsState.rate_sand ?? 1400}
                  onChange={(e) => handleParamChange('rate_sand', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 rounded-xl border border-black/10 dark:border-white/10 bg-transparent font-semibold"
                />
              </div>

              {/* Aggregate Price */}
              <div className="space-y-1">
                <label className="font-bold text-black/50 dark:text-white/35">Aggregate Price (per m³)</label>
                <input
                  type="number"
                  value={paramsState.rate_aggregate ?? 1600}
                  onChange={(e) => handleParamChange('rate_aggregate', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 rounded-xl border border-black/10 dark:border-white/10 bg-transparent font-semibold"
                />
              </div>

              {/* Plaster Rate */}
              <div className="space-y-1">
                <label className="font-bold text-black/50 dark:text-white/35">Plastering Charge (per m²)</label>
                <input
                  type="number"
                  value={paramsState.rate_plaster ?? 280}
                  onChange={(e) => handleParamChange('rate_plaster', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 rounded-xl border border-black/10 dark:border-white/10 bg-transparent font-semibold"
                />
              </div>

              {/* Paint Rate */}
              <div className="space-y-1">
                <label className="font-bold text-black/50 dark:text-white/35">Painting Cost (per m²)</label>
                <input
                  type="number"
                  value={paramsState.rate_paint ?? 120}
                  onChange={(e) => handleParamChange('rate_paint', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 rounded-xl border border-black/10 dark:border-white/10 bg-transparent font-semibold"
                />
              </div>

              {/* Flooring rate */}
              <div className="space-y-1">
                <label className="font-bold text-black/50 dark:text-white/35">Tiles Flooring Cost (per m²)</label>
                <input
                  type="number"
                  value={paramsState.rate_tiles ?? 650}
                  onChange={(e) => handleParamChange('rate_tiles', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 rounded-xl border border-black/10 dark:border-white/10 bg-transparent font-semibold"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
