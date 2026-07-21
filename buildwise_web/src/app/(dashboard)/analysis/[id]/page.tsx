'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Loader2, CheckCircle2, AlertCircle, Sparkles, Settings, Calculator,
  Eye, EyeOff, KeyRound, RefreshCw, ChevronRight, Building2,
  Ruler, Layers, DoorOpen, LayoutDashboard, Zap, Info,
} from 'lucide-react'
import {
  BUILDING_TYPES, CONCRETE_GRADES, STEEL_GRADES, FOUNDATION_TYPES, ROOF_TYPES, BRICK_TYPES
} from '@/lib/utils'
import { estimationApi } from '@/lib/api'
import { runFloorPlanPipeline, runDemoPipeline, PIPELINE_STEPS } from '@/lib/floor-plan-ai/pipeline'
import { getGeminiApiKey, setGeminiApiKey, validateGeminiKey } from '@/lib/floor-plan-ai/gemini-analyzer'
import type { PipelineStep, FloorPlanAnalysisResult } from '@/lib/floor-plan-ai/types'
import { calculateTakeoff } from '@/lib/estimation-engine'

// ── Step icon mapping ────────────────────────────────────────────────────────
const STEP_ICONS: Record<string, React.ReactNode> = {
  enhance:       <Zap className="w-4 h-4" />,
  scale:         <Ruler className="w-4 h-4" />,
  ocr:           <Eye className="w-4 h-4" />,
  walls:         <Layers className="w-4 h-4" />,
  rooms:         <LayoutDashboard className="w-4 h-4" />,
  doors_windows: <DoorOpen className="w-4 h-4" />,
  classify:      <Sparkles className="w-4 h-4" />,
  confidence:    <CheckCircle2 className="w-4 h-4" />,
  validate:      <RefreshCw className="w-4 h-4" />,
  generate:      <Building2 className="w-4 h-4" />,
  done:          <CheckCircle2 className="w-4 h-4" />,
}

// ── Local demo calculation (no backend) ─────────────────────────────────────
function runDemoCalculation(params: Record<string, any>, projectId: string, router: ReturnType<typeof useRouter>) {
  // Load plan geometry from localStorage
  let planData: any = null
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
        planData = JSON.parse(planRaw).detected_data
      }
    }
  } catch (e) {
    console.error('Failed to load plan geometry from localStorage', e)
  }

  // Fallback if no plan found in localStorage
  if (!planData) {
    planData = {
      rooms: [
        { id: 'room_1', label: 'Living Room', area_m2: 24.5, perimeter_m: 20.0, classification: { classified_label: 'living_room', confidence: { overall: 0.95 }, low_confidence_flag: false } },
        { id: 'room_2', label: 'Master Bedroom', area_m2: 18.0, perimeter_m: 17.0, classification: { classified_label: 'bedroom', confidence: { overall: 0.92 }, low_confidence_flag: false } },
        { id: 'room_3', label: 'Kitchen', area_m2: 12.5, perimeter_m: 14.5, classification: { classified_label: 'kitchen', confidence: { overall: 0.88 }, low_confidence_flag: false } },
        { id: 'room_4', label: 'Bathroom', area_m2: 6.0, perimeter_m: 10.0, classification: { classified_label: 'bathroom', confidence: { overall: 0.94 }, low_confidence_flag: false } }
      ],
      walls: [
        { id: 'wall_1', length_m: 8.0, thickness_m: 0.23, room_ids: ['room_1'] },
        { id: 'wall_2', length_m: 6.0, thickness_m: 0.23, room_ids: ['room_1', 'room_2'] },
        { id: 'wall_3', length_m: 5.5, thickness_m: 0.23, room_ids: ['room_2', 'room_3'] },
        { id: 'wall_4', length_m: 4.0, thickness_m: 0.15, room_ids: ['room_3', 'room_4'] },
        { id: 'wall_5', length_m: 7.2, thickness_m: 0.23, room_ids: ['room_1', 'room_3'] }
      ],
      doors: [
        { id: 'door_1', wall_id: 'wall_1', width_m: 1.0, height_m: 2.1 },
        { id: 'door_2', wall_id: 'wall_3', width_m: 0.9, height_m: 2.1 }
      ],
      windows: [
        { id: 'win_1', wall_id: 'wall_1', width_m: 1.5, height_m: 1.2 },
        { id: 'win_2', wall_id: 'wall_5', width_m: 1.2, height_m: 1.2 }
      ],
      columns: [],
      staircases: [],
      total_area_m2: 64.4,
      drawing_classification: { drawing_type: 'architectural', confidence: 0.95 }
    }
  }

  const result = calculateTakeoff(planData, {
    building_type: params.building_type,
    num_floors: parseInt(params.num_floors || 1),
    floor_height: parseFloat(params.floor_height || 3.0),
    wall_thickness: parseFloat(params.wall_thickness || 0.23),
    slab_thickness: parseFloat(params.slab_thickness || 0.12),
    concrete_grade: params.concrete_grade || 'M20',
    steel_grade: params.steel_grade || 'Fe500',
    mortar_ratio: params.mortar_ratio || '1:5',
    foundation_type: params.foundation_type || 'isolated',
    roof_type: params.roof_type || 'flat_rcc',
    brick_type: params.brick_type || 'red_brick',
    waste_percentage: parseFloat(params.waste_percentage || 5)
  })

  localStorage.setItem(`bw_demo_est_${result.id}`, JSON.stringify(result))
  router.push(`/estimate/${projectId}?estimation_id=${result.id}`)
}

// ════════════════════════════════════════════════════════════════════════════
// Component
// ════════════════════════════════════════════════════════════════════════════

export default function AnalysisProgressPage() {
  const { id: planId } = useParams() as { id: string }
  const router = useRouter()

  // ── Pipeline state ────────────────────────────────────────────────────────
  const [steps, setSteps] = useState<PipelineStep[]>(() =>
    PIPELINE_STEPS.map(s => ({ ...s, status: 'pending' as const }))
  )
  const [pipelineStatus, setPipelineStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const [pipelineError, setPipelineError] = useState('')
  const [analysisResult, setAnalysisResult] = useState<FloorPlanAnalysisResult | null>(null)

  // ── API Key UI ────────────────────────────────────────────────────────────
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [showApiKeyInput, setShowApiKeyInput] = useState(false)
  const [apiKeyValid, setApiKeyValid] = useState<boolean | null>(null)
  const [testingKey, setTestingKey] = useState(false)
  const [showKey, setShowKey] = useState(false)

  // ── Wizard state ──────────────────────────────────────────────────────────
  const [showWizard, setShowWizard] = useState(false)
  const [projectId, setProjectId] = useState('')
  const [buildingType, setBuildingType] = useState('house')
  const [numFloors, setNumFloors] = useState(1)
  const [floorHeight, setFloorHeight] = useState(3.0)
  const [totalArea, setTotalArea] = useState(1500)
  const [wallThickness, setWallThickness] = useState(0.23)
  const [slabThickness, setSlabThickness] = useState(0.12)
  const [concreteGrade, setConcreteGrade] = useState('M20')
  const [steelGrade, setSteelGrade] = useState('Fe500')
  const [foundationType, setFoundationType] = useState('isolated')
  const [roofType, setRoofType] = useState('flat_rcc')
  const [brickType, setBrickType] = useState('red_brick')
  const [wastePercentage, setWastePercentage] = useState(5)

  const abortRef = useRef<AbortController | null>(null)
  const isDemoPlan = planId.startsWith('demo_plan_')

  // ── Load project info ────────────────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem(`bw_demo_plan_${planId}`)
    if (stored) {
      const plan = JSON.parse(stored)
      setProjectId(plan.project_id || planId)
      if (plan.detected_data?.total_area_sqft) {
        setTotalArea(plan.detected_data.total_area_sqft)
      }
    }
  }, [planId])

  // ── Start pipeline on mount ──────────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem(`bw_demo_plan_${planId}`)
    if (stored) {
      try {
        const plan = JSON.parse(stored)
        if (plan.status === 'done' && plan.detected_data) {
          setSteps(PIPELINE_STEPS.map(s => ({ ...s, status: 'done' as const, progress: 100 })))
          setAnalysisResult(plan.detected_data)
          setTotalArea(plan.detected_data.total_area_sqft || 644)
          setWallThickness(plan.detected_data.wall_thickness_m || 0.23)
          setProjectId(plan.project_id || planId)
          setPipelineStatus('done')
          setShowWizard(true)
          return
        }
      } catch { /* ignore */ }
    }

    startPipeline()
    return () => { abortRef.current?.abort() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId])

  const startPipeline = useCallback(async () => {
    setPipelineStatus('running')
    setPipelineError('')
    setShowWizard(false)

    const apiKey = getGeminiApiKey()

    if (!apiKey) {
      setShowApiKeyInput(true)
      setPipelineStatus('idle')
      return
    }

    // Get file from localStorage
    const fileDataUrl = localStorage.getItem(`bw_demo_file_data_${planId}`)
    if (!fileDataUrl && !isDemoPlan) {
      // Try demo pipeline
      await runDemoMode()
      return
    }

    if (!fileDataUrl) {
      await runDemoMode()
      return
    }

    // Convert dataURL → File
    const file = await dataURLtoFile(fileDataUrl, planId)

    abortRef.current = new AbortController()
    const stored = localStorage.getItem(`bw_demo_plan_${planId}`)
    const plan = stored ? JSON.parse(stored) : {}

    const savedModel = (localStorage.getItem('bw_gemini_model') as any) || 'gemini-3.5-flash'

    const gen = runFloorPlanPipeline(file, {
      plan_id: planId,
      project_id: plan.project_id || planId,
      gemini_api_key: apiKey,
      gemini_model: savedModel,
      floor_height_m: 3.0,
      wall_thickness_m: 0.23,
      abort_signal: abortRef.current.signal,
    })

    try {
      for await (const updatedSteps of gen) {
        setSteps([...updatedSteps])
        const doneStep = updatedSteps.find(s => s.id === 'done' && s.status === 'done')
        if (doneStep?.result) {
          const r = doneStep.result as FloorPlanAnalysisResult
          setAnalysisResult(r)
          setTotalArea(Math.round(r.total_area_sqft) || 1500)
          setWallThickness(r.wall_thickness_m || 0.23)
          setProjectId(r.project_id)
        }
        const hasError = updatedSteps.some(s => s.status === 'error')
        if (hasError) {
          const errStep = updatedSteps.find(s => s.status === 'error')
          setPipelineError(errStep?.error || 'Pipeline failed')
          setPipelineStatus('error')
          return
        }
      }
      setPipelineStatus('done')
      setShowWizard(true)
    } catch (err: any) {
      if (err.name === 'AbortError') return
      setPipelineError(err.message || 'Pipeline failed unexpectedly')
      setPipelineStatus('error')
    }
  }, [planId, isDemoPlan])

  const runDemoMode = async () => {
    const gen = runDemoPipeline(planId, projectId || planId)
    for await (const updatedSteps of gen) {
      setSteps([...updatedSteps])
    }
    
    // Construct robust mock detection data to populate local storage
    const demoRooms = [
      {
        id: 'r1', label: 'Living Room', room_type: 'living_room',
        area_m2: 24.8, area_sqft: 267, perimeter_m: 20, length_m: 5.5, width_m: 4.5,
        polygon: [[100,100],[466,100],[466,400],[100,400]], centroid: [283,250],
        bounding_box: [100,100,366,300], aspect_ratio: 1.22, floor_height_m: 3.0,
        adjacent_room_ids: ['r2','r3'], door_ids: ['d1'], window_ids: ['w1'],
        wall_ids: [],
        classification: {
          classified_label: 'Living Room', room_type: 'living_room',
          confidence: { overall: 0.97, ocr: { value: 0.98, source: 'OCR "LIVING ROOM"' }, geometry: { value: 0.95, source: 'Size 24.8m² matches typical living room' } },
          low_confidence_flag: false, flag_level: 'ok', needs_user_confirmation: false,
          reason: 'High confidence: OCR label "LIVING ROOM" found + geometry matches typical living room dimensions',
          all_candidates: { 'Living Room': 0.97, 'Dining Room': 0.05 }
        }
      },
      {
        id: 'r2', label: 'Master Bedroom', room_type: 'master_bedroom',
        area_m2: 18.0, area_sqft: 194, perimeter_m: 17, length_m: 4.5, width_m: 4.0,
        polygon: [[466,100],[766,100],[766,366],[466,366]], centroid: [616,233],
        bounding_box: [466,100,300,266], aspect_ratio: 1.12, floor_height_m: 3.0,
        adjacent_room_ids: ['r1'], door_ids: ['d2'], window_ids: ['w2'],
        wall_ids: [],
        classification: {
          classified_label: 'Master Bedroom', room_type: 'master_bedroom',
          confidence: { overall: 0.74, ocr: { value: 0.60, source: 'Weak OCR — partial label detected' }, geometry: { value: 0.80, source: 'Size 18m² fits master bedroom range' } },
          low_confidence_flag: true, flag_level: 'review', needs_user_confirmation: true,
          reason: 'Review suggested: OCR partially detected, geometry matches. Please confirm room type.',
          all_candidates: { 'Master Bedroom': 0.74, 'Bedroom': 0.55, 'Study': 0.20 }
        }
      },
      {
        id: 'r3', label: 'Kitchen', room_type: 'kitchen',
        area_m2: 12.0, area_sqft: 129, perimeter_m: 14, length_m: 4.0, width_m: 3.0,
        polygon: [[100,400],[366,400],[366,600],[100,600]], centroid: [233,500],
        bounding_box: [100,400,266,200], aspect_ratio: 1.33, floor_height_m: 3.0,
        adjacent_room_ids: ['r1','r4'], door_ids: [], window_ids: ['w3'],
        wall_ids: [],
        classification: {
          classified_label: 'Kitchen', room_type: 'kitchen',
          confidence: { overall: 0.95, ocr: { value: 0.93, source: 'OCR "KITCHEN"' }, geometry: { value: 0.92, source: '12m² within kitchen range 8–15m²' } },
          low_confidence_flag: false, flag_level: 'ok', needs_user_confirmation: false,
          reason: 'High confidence: OCR "KITCHEN" + fixture detection + typical kitchen proportions',
          all_candidates: { Kitchen: 0.95, Utility: 0.05 }
        }
      },
      {
        id: 'r4', label: 'Bathroom', room_type: 'bathroom',
        area_m2: 5.0, area_sqft: 54, perimeter_m: 9, length_m: 2.5, width_m: 2.0,
        polygon: [[366,400],[533,400],[533,533],[366,533]], centroid: [449,466],
        bounding_box: [366,400,167,133], aspect_ratio: 1.25, floor_height_m: 3.0,
        adjacent_room_ids: ['r3'], door_ids: ['d3'], window_ids: [],
        wall_ids: [],
        classification: {
          classified_label: 'Bathroom', room_type: 'bathroom',
          confidence: { overall: 0.58, ocr: { value: 0.0, source: 'No OCR text detected' }, geometry: { value: 0.65, source: 'Small 5m² space — could be bathroom or toilet' } },
          low_confidence_flag: true, flag_level: 'critical', needs_user_confirmation: true,
          reason: 'Critical review: No OCR label found. Inferred from toilet fixture detection + small area. Please confirm.',
          all_candidates: { Bathroom: 0.58, Toilet: 0.40, 'Store Room': 0.10 }
        }
      },
    ]

    const demoWalls = [
      { id: 'w1', start: [100,100], end: [766,100], length_px: 666, length_m: 9.99, thickness_px: 15, thickness_m: 0.23, wall_type: 'external', room_ids: [], door_ids: [], window_ids: [], is_structural: true, confidence: 0.95 },
      { id: 'w2', start: [100,100], end: [100,600], length_px: 500, length_m: 7.5, thickness_px: 15, thickness_m: 0.23, wall_type: 'external', room_ids: [], door_ids: [], window_ids: [], is_structural: true, confidence: 0.95 },
      { id: 'w3', start: [100,400], end: [533,400], length_px: 433, length_m: 6.5, thickness_px: 10, thickness_m: 0.15, wall_type: 'internal', room_ids: [], door_ids: [], window_ids: [], is_structural: false, confidence: 0.88 },
      { id: 'w4', start: [466,100], end: [466,400], length_px: 300, length_m: 4.5, thickness_px: 10, thickness_m: 0.15, wall_type: 'internal', room_ids: [], door_ids: [], window_ids: [], is_structural: false, confidence: 0.88 },
    ]

    const demoDoors = [
      { id: 'd1', wall_id: 'w4', room_id: 'r1', adjacent_room_id: 'r2', center: [466,280], width_m: 0.9, height_m: 2.1, type: 'single', swing_direction: 'inward', swing_angle: 90, confidence: 0.92 },
      { id: 'd2', wall_id: 'w1', room_id: 'r2', adjacent_room_id: null, center: [616,100], width_m: 0.9, height_m: 2.1, type: 'single', swing_direction: 'inward', swing_angle: 90, confidence: 0.88 },
      { id: 'd3', wall_id: 'w3', room_id: 'r4', adjacent_room_id: 'r3', center: [430,400], width_m: 0.75, height_m: 2.1, type: 'single', swing_direction: 'inward', swing_angle: 90, confidence: 0.85 },
    ]

    const demoWindows = [
      { id: 'w1', wall_id: 'w1', room_id: 'r1', center: [283,100], width_m: 1.5, height_m: 1.2, sill_height_m: 0.9, confidence: 0.90 },
      { id: 'w2', wall_id: 'w1', room_id: 'r2', center: [616,100], width_m: 1.2, height_m: 1.2, sill_height_m: 0.9, confidence: 0.88 },
      { id: 'w3', wall_id: 'w2', room_id: 'r3', center: [100,500], width_m: 1.0, height_m: 1.0, sill_height_m: 1.0, confidence: 0.85 },
    ]

    const demoColumns = [
      { id: 'col_1', shape: 'square', center: [100, 100], width_px: 30, height_px: 30, size_m: [0.45, 0.45] as [number, number], connected_beam_ids: [], confidence: 0.98 },
      { id: 'col_2', shape: 'square', center: [466, 100], width_px: 30, height_px: 30, size_m: [0.45, 0.45] as [number, number], connected_beam_ids: [], confidence: 0.95 },
      { id: 'col_3', shape: 'square', center: [766, 100], width_px: 30, height_px: 30, size_m: [0.45, 0.45] as [number, number], connected_beam_ids: [], confidence: 0.96 },
      { id: 'col_4', shape: 'square', center: [100, 400], width_px: 30, height_px: 30, size_m: [0.45, 0.45] as [number, number], connected_beam_ids: [], confidence: 0.94 },
    ]

    const demoStaircases = [
      { id: 'staircase_1', stair_type: 'dog_leg', start_px: [120, 300], end_px: [200, 380], direction: 'up', num_flights: 2, landing_detected: true, confidence: 0.92 }
    ]

    const demoClassification = {
      drawing_type: 'architectural',
      confidence: 0.99,
      is_architectural_floor_plan: true
    }

    const demoQuality = {
      score: 85,
      problems: ['Slight Noise'],
      recommendations: ['Optimal image contrast. Ready for structural estimation.'],
      brightness: 180,
      contrast: 150,
      blur_index: 8.5,
      is_skewed: false
    }

    const activeProjectId = projectId || planId
    const stored = localStorage.getItem(`bw_demo_plan_${planId}`)
    const plan = stored ? JSON.parse(stored) : {}

    const mockPlan = {
      id: planId,
      project_id: activeProjectId,
      filename: plan.filename || 'demo_layout.png',
      status: 'done',
      created_at: new Date().toISOString(),
      detected_data: {
        rooms: demoRooms,
        walls: demoWalls,
        doors: demoDoors,
        windows: demoWindows,
        columns: demoColumns,
        staircases: demoStaircases,
        drawing_classification: demoClassification,
        image_quality: demoQuality,
        floor_height_m: 3.0,
        wall_thickness_m: 0.23,
        total_area_m2: 59.8,
        total_area_sqft: 644,
        overall_confidence: 0.81,
        low_confidence_room_ids: ['r2', 'r4'],
        geometry_validation: {
          is_valid: true,
          issues: [],
          rooms_validated: 4,
          walls_validated: 4,
          auto_corrections_applied: 0
        }
      }
    }

    localStorage.setItem(`bw_demo_plan_${planId}`, JSON.stringify(mockPlan))

    setAnalysisResult(mockPlan.detected_data as any)
    setTotalArea(644)
    setWallThickness(0.23)
    setProjectId(activeProjectId)

    setPipelineStatus('done')
    setShowWizard(true)
  }

  const handleApiKeySubmit = async () => {
    if (!apiKeyInput.trim()) return
    setTestingKey(true)
    const valid = await validateGeminiKey(apiKeyInput.trim())
    setApiKeyValid(valid)
    setTestingKey(false)
    if (valid) {
      setGeminiApiKey(apiKeyInput.trim())
      setShowApiKeyInput(false)
      await startPipeline()
    }
  }

  const handleWizardSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const params = {
      building_type: buildingType, num_floors: numFloors,
      floor_height: floorHeight, total_area: totalArea,
      wall_thickness: wallThickness, slab_thickness: slabThickness,
      concrete_grade: concreteGrade, steel_grade: steelGrade,
      foundation_type: foundationType, roof_type: roofType,
      brick_type: brickType, waste_percentage: wastePercentage,
    }
    if (isDemoPlan) { runDemoCalculation(params, projectId || planId, router); return }
    try {
      const res = await estimationApi.create(projectId || planId, params)
      router.push(`/estimate/${projectId || planId}?estimation_id=${res.data.id}`)
    } catch {
      runDemoCalculation(params, projectId || planId, router)
    }
  }

  // ── UI helpers ────────────────────────────────────────────────────────────
  const completedCount = steps.filter(s => s.status === 'done').length
  const progress = Math.round((completedCount / steps.length) * 100)

  return (
    <div className="max-w-[700px] mx-auto space-y-5">
      <AnimatePresence mode="wait">

        {/* ── API Key Setup Screen ── */}
        {showApiKeyInput && (
          <motion.div
            key="api-key"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="bg-white dark:bg-[#1E1E24] border border-black/[0.06] dark:border-white/[0.06] rounded-[24px] p-6 space-y-5"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-violet-500/10 rounded-2xl flex items-center justify-center">
                <KeyRound className="w-5 h-5 text-violet-500" />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight">Configure AI Engine</h2>
                <p className="text-[12.5px] text-black/40 dark:text-white/35 mt-0.5">
                  Enter your Vision AI API key to enable real AI floor plan analysis
                </p>
              </div>
            </div>

            <div className="p-4 bg-blue-500/5 border border-blue-500/15 rounded-2xl flex gap-3">
              <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-[12px] text-blue-600 dark:text-blue-400">
                Your key is stored locally in your browser and never sent to our servers.
                Get a free key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="font-bold underline">AI Portal</a>.
              </p>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  placeholder="AIzaSy..."
                  value={apiKeyInput}
                  onChange={e => { setApiKeyInput(e.target.value); setApiKeyValid(null) }}
                  className="w-full px-4 py-3 pr-10 rounded-2xl border border-black/[0.1] dark:border-white/[0.1] bg-transparent text-[13.5px] font-mono focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                  onKeyDown={e => { if (e.key === 'Enter') handleApiKeySubmit() }}
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-black/30 dark:text-white/30 hover:text-black/60 dark:hover:text-white/60"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {apiKeyValid === false && (
                <p className="text-[12px] text-red-500 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" /> Invalid API key. Please check and try again.
                </p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleApiKeySubmit}
                  disabled={testingKey || !apiKeyInput.trim()}
                  className="flex-1 py-3 rounded-2xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-[13.5px] font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-600/20"
                >
                  {testingKey ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {testingKey ? 'Testing...' : 'Start AI Analysis'}
                </button>
                <button
                  onClick={runDemoMode}
                  className="px-4 py-3 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] text-[13px] font-semibold hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-all"
                >
                  Demo Mode
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Pipeline Progress Screen ── */}
        {!showApiKeyInput && !showWizard && (
          <motion.div
            key="pipeline"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="bg-white dark:bg-[#1E1E24] border border-black/[0.06] dark:border-white/[0.06] rounded-[24px] p-6 space-y-5"
          >
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="relative w-11 h-11">
                <div className="absolute inset-0 bg-violet-500/10 rounded-2xl" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-violet-500 animate-pulse" />
                </div>
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-black tracking-tight">AI Architect Pipeline</h2>
                <p className="text-[12.5px] text-black/40 dark:text-white/35 mt-0.5">
                  Hybrid AI: BuildWise Vision AI · Computer Vision · Geometry Processing
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-violet-500">{progress}%</p>
                <p className="text-[10px] text-black/30 dark:text-white/25">{completedCount}/{steps.length} steps</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 bg-black/[0.05] dark:bg-white/[0.05] rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-violet-500 to-violet-600 rounded-full"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>

            {/* Steps */}
            <div className="space-y-1">
              {steps.map((step, i) => (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={`flex items-start gap-3.5 px-3.5 py-2.5 rounded-2xl border transition-all ${
                    step.status === 'running'
                      ? 'border-violet-500/25 bg-violet-500/[0.03] shadow-sm shadow-violet-500/10'
                      : step.status === 'error'
                      ? 'border-red-500/20 bg-red-500/[0.02]'
                      : 'border-transparent'
                  }`}
                >
                  {/* Icon/status */}
                  <div className={`mt-0.5 flex-shrink-0 ${
                    step.status === 'done' ? 'text-emerald-500' :
                    step.status === 'running' ? 'text-violet-500' :
                    step.status === 'error' ? 'text-red-500' :
                    'text-black/20 dark:text-white/15'
                  }`}>
                    {step.status === 'done' ? <CheckCircle2 className="w-4.5 h-4.5 w-[18px] h-[18px]" /> :
                     step.status === 'running' ? <Loader2 className="w-[18px] h-[18px] animate-spin" /> :
                     step.status === 'error' ? <AlertCircle className="w-[18px] h-[18px]" /> :
                     <div className="w-[18px] h-[18px] rounded-full border-2 border-current opacity-30" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-[13px] font-bold truncate ${
                        step.status === 'running' ? 'text-violet-600 dark:text-violet-400' :
                        step.status === 'done' ? 'text-black/70 dark:text-white/70' :
                        step.status === 'error' ? 'text-red-500' :
                        'text-black/30 dark:text-white/20'
                      }`}>
                        {step.label}
                      </p>
                      {step.status === 'done' && step.preview && (
                        <div className="flex items-center gap-2 text-[10px] text-black/30 dark:text-white/25 shrink-0">
                          {step.preview.rooms_found !== undefined && <span>{step.preview.rooms_found} rooms</span>}
                          {step.preview.walls_found !== undefined && <span>{step.preview.walls_found} walls</span>}
                          {step.preview.doors_found !== undefined && <span>{step.preview.doors_found} doors</span>}
                          {step.preview.confidence_avg !== undefined && (
                            <span className="text-emerald-500 font-semibold">{Math.round(step.preview.confidence_avg * 100)}% conf</span>
                          )}
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-black/35 dark:text-white/25 mt-0.5 truncate">
                      {step.status === 'error' ? step.error : step.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            {pipelineStatus === 'error' && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-[13px] font-bold text-red-500">Analysis Failed</p>
                  <p className="text-[12px] text-red-400 mt-0.5 leading-relaxed break-words">{pipelineError}</p>
                  <div className="flex items-center gap-3 mt-3">
                    <button
                      onClick={startPipeline}
                      className="text-[12px] text-violet-600 dark:text-violet-400 font-bold hover:underline flex items-center gap-1 bg-violet-500/10 px-3 py-1.5 rounded-xl border border-violet-500/10"
                    >
                      <RefreshCw className="w-3 h-3" /> Retry API Analysis
                    </button>
                    <button
                      onClick={runDemoMode}
                      className="text-[12px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/10"
                    >
                      Use Demo/Simulation Mode
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ── Wizard: Confirm Parameters ── */}
        {showWizard && (
          <motion.div
            key="wizard"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-[#1E1E24] border border-black/[0.06] dark:border-white/[0.06] rounded-[24px] p-6 space-y-5"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-violet-500/10 rounded-2xl flex items-center justify-center">
                <Settings className="w-5 h-5 text-violet-500" />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight">Confirm Structural Parameters</h2>
                <p className="text-[12.5px] text-black/40 dark:text-white/35 mt-0.5">
                  AI pre-filled values from your drawing — adjust if needed
                </p>
              </div>
            </div>

            {/* AI Detection Summary */}
            {analysisResult && (
              <div className="px-4 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[12.5px]">
                <div className="flex items-center gap-2 font-bold mb-1">
                  <Sparkles className="w-3.5 h-3.5" /> AI Detected from Your Plan
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                  {[
                    { label: 'Rooms', value: analysisResult.room_count },
                    { label: 'Doors', value: analysisResult.door_count },
                    { label: 'Windows', value: analysisResult.window_count },
                    { label: 'Area', value: `${Math.round(analysisResult.total_area_sqft).toLocaleString()} sqft` },
                  ].map(item => (
                    <div key={item.label} className="bg-white/50 dark:bg-white/5 rounded-xl p-2 text-center">
                      <p className="text-[11px] opacity-70">{item.label}</p>
                      <p className="font-black text-[15px]">{item.value}</p>
                    </div>
                  ))}
                </div>
                {analysisResult.low_confidence_room_ids.length > 0 && (
                  <p className="mt-2 text-[11.5px] text-amber-600 dark:text-amber-400">
                    ⚠ {analysisResult.low_confidence_room_ids.length} rooms have low confidence — review them on the Floor Plans tab.
                  </p>
                )}
              </div>
            )}

            <form onSubmit={handleWizardSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: 'Building Type', type: 'select', value: buildingType, onChange: setBuildingType, options: BUILDING_TYPES.map(t => ({ value: t.value, label: t.label })) },
                  { label: 'Number of Floors', type: 'number', value: numFloors, onChange: (v: string) => setNumFloors(parseInt(v)||1), min: 1 },
                  { label: 'Floor Height (m)', type: 'number', value: floorHeight, onChange: (v: string) => setFloorHeight(parseFloat(v)||0), step: 0.1 },
                  { label: 'Total Area (sq ft)', type: 'number', value: totalArea, onChange: (v: string) => setTotalArea(parseInt(v)||0) },
                  { label: 'Wall Thickness (m)', type: 'number', value: wallThickness, onChange: (v: string) => setWallThickness(parseFloat(v)||0), step: 0.01 },
                  { label: 'Slab Thickness (m)', type: 'number', value: slabThickness, onChange: (v: string) => setSlabThickness(parseFloat(v)||0), step: 0.01 },
                ].map((field) => (
                  <div key={field.label}>
                    <label className="block text-[12px] font-bold text-black/50 dark:text-white/40 mb-1">{field.label}</label>
                    {field.type === 'select' ? (
                      <select value={field.value as string} onChange={e => (field.onChange as any)(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#FAFAFC] dark:bg-[#252530] border border-black/[0.08] dark:border-white/[0.08] text-[13.5px] focus:outline-none focus:border-violet-500">
                        {(field.options || []).map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    ) : (
                      <input type="number" value={field.value as number} step={(field as any).step} min={(field as any).min}
                        onChange={e => (field.onChange as any)(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#FAFAFC] dark:bg-[#252530] border border-black/[0.08] dark:border-white/[0.08] text-[13.5px] focus:outline-none focus:border-violet-500" />
                    )}
                  </div>
                ))}

                {([
                  { label: 'Concrete Grade', value: concreteGrade, onChange: setConcreteGrade, opts: CONCRETE_GRADES.map(c => c) },
                  { label: 'Steel Grade', value: steelGrade, onChange: setSteelGrade, opts: STEEL_GRADES.map(s => s) },
                  { label: 'Foundation Type', value: foundationType, onChange: setFoundationType, opts: FOUNDATION_TYPES },
                  { label: 'Roof Type', value: roofType, onChange: setRoofType, opts: ROOF_TYPES },
                  { label: 'Brick/Block Type', value: brickType, onChange: setBrickType, opts: BRICK_TYPES },
                ] as any[]).map((field) => (
                  <div key={field.label}>
                    <label className="block text-[12px] font-bold text-black/50 dark:text-white/40 mb-1">{field.label}</label>
                    <select value={field.value} onChange={e => field.onChange(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#FAFAFC] dark:bg-[#252530] border border-black/[0.08] dark:border-white/[0.08] text-[13.5px] focus:outline-none focus:border-violet-500">
                      {(field.opts as string[]).map(o => <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}
                    </select>
                  </div>
                ))}

                <div>
                  <label className="block text-[12px] font-bold text-black/50 dark:text-white/40 mb-1">Waste Factor (%)</label>
                  <input type="number" min={0} max={25} value={wastePercentage}
                    onChange={e => setWastePercentage(parseInt(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAFAFC] dark:bg-[#252530] border border-black/[0.08] dark:border-white/[0.08] text-[13.5px] focus:outline-none focus:border-violet-500" />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-black/[0.05] dark:border-white/[0.05]">
                <button type="button" onClick={() => router.push(`/projects/${projectId}`)}
                  className="flex-1 py-3 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] text-[13.5px] font-semibold hover:bg-black/[0.03] dark:hover:bg-white/[0.03]">
                  View Floor Plans
                </button>
                <button type="submit"
                  className="flex-1 py-3 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white text-[13.5px] font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-600/25">
                  <Calculator className="w-4 h-4" /> Calculate Takeoff
                </button>
              </div>
            </form>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}

// ── Convert dataURL → File ───────────────────────────────────────────────────
async function dataURLtoFile(dataUrl: string, filename: string): Promise<File> {
  const res = await fetch(dataUrl)
  const blob = await res.blob()
  return new File([blob], filename, { type: blob.type })
}
