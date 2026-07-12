'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Loader2, CheckCircle2, AlertCircle, Sparkles, Building, Settings, Calculator, RefreshCw
} from 'lucide-react'
import { aiApi, uploadApi, estimationApi } from '@/lib/api'
import {
  BUILDING_TYPES, CONCRETE_GRADES, STEEL_GRADES, FOUNDATION_TYPES, ROOF_TYPES, BRICK_TYPES
} from '@/lib/utils'

const STEPS = [
  { id: 'read', label: 'Reading Drawing', desc: 'Decoding architectural layouts & scale' },
  { id: 'walls', label: 'Detecting Walls', desc: 'Mapping structural load-bearing walls' },
  { id: 'rooms', label: 'Detecting Rooms', desc: 'Detecting space profiles & slab boundaries' },
  { id: 'scale', label: 'Detecting Scale', desc: 'Scanning blueprint annotations & scale ratio' },
  { id: 'dims', label: 'Reading Dimensions', desc: 'Processing annotations & numerical dimensions' },
  { id: 'calc', label: 'Calculating Materials', desc: 'Estimating materials takeoff per IS codes' },
]

// ── Parse a dimension string like "30'" or "30 X 50" → feet value ────────────
function parseFtValue(s: string): number | null {
  const m = s.match(/(\d+(?:\.\d+)?)/)
  return m ? parseFloat(m[1]) : null
}

// Detect overall plot size from OCR text array
// e.g. ["30'", "50'"] → 30 × 50 × 0.0929 m² → 1500 sqft
function detectAreaFromOcr(texts: string[]): number | null {
  // Look for patterns like "30'" paired with "50'" or "30X50" or "30 X 50"
  const crossMatch = texts.join(' ').match(/(\d+)[\s']*[xX×][\s']*(\d+)/)
  if (crossMatch) {
    const a = parseFloat(crossMatch[1])
    const b = parseFloat(crossMatch[2])
    if (a > 0 && b > 0) return Math.round(a * b)  // in sq ft
  }
  // Fallback: find two numeric values > 10 that could be length/width
  const nums = texts
    .map(t => parseFtValue(t))
    .filter((n): n is number => n !== null && n > 8 && n < 200)
    .sort((a, b) => b - a)
  if (nums.length >= 2) return Math.round(nums[0] * nums[1])
  return null
}

export default function AnalysisProgressPage() {
  const { id: planId } = useParams() as { id: string }
  const router = useRouter()

  const [activeStep, setActiveStep] = useState(0)
  const [status, setStatus] = useState<'pending' | 'processing' | 'done' | 'failed'>('processing')
  const [error, setError] = useState('')
  const [showWizard, setShowWizard] = useState(false)
  const [projectId, setProjectId] = useState('')
  const [detectedArea, setDetectedArea] = useState<number | null>(null)
  const [detectedRooms, setDetectedRooms] = useState<number | null>(null)
  const [detectedDoors, setDetectedDoors] = useState<number | null>(null)

  // Wizard states — all start as null; will be filled from AI detection
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

  // Simulation steps for animation
  useEffect(() => {
    if (status === 'processing') {
      const interval = setInterval(() => {
        setActiveStep((prev) => {
          if (prev < STEPS.length - 2) {
            return prev + 1
          }
          return prev
        })
      }, 3500)
      return () => clearInterval(interval)
    }
  }, [status])

  // Poll status OR simulate in demo mode
  useEffect(() => {
    let active = true

    const isDemoPlan = planId.startsWith('demo_plan_')

    if (isDemoPlan) {
      // Demo mode: read from localStorage and simulate steps
      const stored = localStorage.getItem(`bw_demo_plan_${planId}`)
      const demoPlan = stored ? JSON.parse(stored) : null
      if (demoPlan) setProjectId(demoPlan.project_id)

      // ── Try to extract dimensions from filename (e.g. "30x50_house.png") ──
      const filename: string = demoPlan?.filename || ''
      const fnMatch = filename.match(/(\d+)[xX×](\d+)/)
      if (fnMatch) {
        const detA = Math.round(parseInt(fnMatch[1]) * parseInt(fnMatch[2]))
        setDetectedArea(detA)
        setTotalArea(detA)
      }

      // Simulate all steps completing one by one
      let step = 0
      const advance = setInterval(() => {
        step++
        setActiveStep(step)
        if (step >= STEPS.length - 1) {
          clearInterval(advance)
          setTimeout(() => {
            if (active) { setStatus('done'); setShowWizard(true) }
          }, 800)
        }
      }, 1800)
      return () => { active = false; clearInterval(advance) }
    }

    // Real backend polling
    const checkStatus = async () => {
      try {
        const res = await uploadApi.getStatus(planId)
        const plan = res.data
        setProjectId(plan.project_id)

        if (plan.status === 'done') {
          setActiveStep(STEPS.length - 1)

          // ── Pre-fill wizard from AI detected data ──────────────────────────
          const detected = plan.detected_data || {}
          const ocrTexts: string[] = detected.ocr_text_readings || []
          const parsedDims: any[] = detected.parsed_dimensions || []

          // Try area from parsed_dimensions first, then ocr heuristic
          const dimArea =
            parsedDims.find((d: any) => d.label === 'total_area')?.value_sqft ||
            parsedDims.find((d: any) => d.label === 'plot_area')?.value_sqft

          const area =
            dimArea ||
            (detected.building_area_sq_m ? Math.round(detected.building_area_sq_m * 10.7639) : null) ||
            detectAreaFromOcr(ocrTexts)

          if (area && area > 50) {
            setDetectedArea(area)
            setTotalArea(area)
          }
          if (detected.room_count > 0) setDetectedRooms(detected.room_count)
          if (detected.door_count > 0)  setDetectedDoors(detected.door_count)

          setTimeout(() => {
            if (active) { setStatus('done'); setShowWizard(true) }
          }, 1000)
        } else if (plan.status === 'failed') {
          setStatus('failed')
          setError('AI analysis failed. Blueprint could not be parsed.')
        } else {
          await aiApi.analyze(planId).catch(() => {})
          setTimeout(checkStatus, 3000)
        }
      } catch {
        if (active) { setStatus('failed'); setError('Connection error. Running in demo mode.') }
      }
    }
    checkStatus()
    return () => { active = false }
  }, [planId])

  // ── Helper: instant local calculation (demo mode) ────────────────────────────
  const runDemoCalculation = (params: Record<string, any>) => {
    const demoEstId = `demo_est_${Date.now()}`
    const area = parseFloat(params.total_area || 0)
    const floors = parseInt(params.num_floors || 1)
    const ht = parseFloat(params.floor_height || 3.0)
    const wallThickness = parseFloat(params.wall_thickness || 0.23)
    const slabThickness = parseFloat(params.slab_thickness || 0.12)
    const concreteGrade = (params.concrete_grade || 'M20').toUpperCase()
    const foundationType = (params.foundation_type || 'isolated').toLowerCase()
    const brickType = (params.brick_type || 'red_brick').toLowerCase()
    const wastePercentage = parseFloat(params.waste_percentage || 5.0)

    const waste = 1 + wastePercentage / 100

    // 1. Geometry Calculations
    const areaM2 = area * 0.092903
    const footprintM2 = areaM2 / floors
    
    // Estimate perimeter based on footprint area of single floor
    const length = Math.sqrt(footprintM2) * 1.25
    const width = footprintM2 / length
    const perimeterM = 2 * (length + width)
    
    // Total masonry wall volume (with 10% openings deduction)
    const wallVolumeM3 = perimeterM * ht * wallThickness * floors * 0.90

    // 2. Concrete RCC Slabs, Beams, Columns
    const slabConcrete = footprintM2 * slabThickness * floors
    const beamConcrete = slabConcrete * 0.10
    const columnConcrete = slabConcrete * 0.05
    const superConcrete = slabConcrete + beamConcrete + columnConcrete
    
    const foundCoeff = foundationType === 'combined' ? 0.25 : foundationType === 'raft' ? 0.40 : foundationType === 'pile' ? 0.30 : 0.20
    const foundationConcrete = superConcrete * foundCoeff
    const totalConcreteVolume = foundationConcrete + superConcrete

    // 3. Reinforcement Steel
    const totalSteelWeight = totalConcreteVolume * 85.0

    // 4. Masonry Brick/Block counts
    const bricksCount = brickType === 'red_brick' ? Math.ceil(wallVolumeM3 * 500) : 0
    const blocksCount = brickType === 'aac_block' ? Math.ceil(wallVolumeM3 * 390) : 0

    // Mortar volumes
    const wetMortarVolume = wallVolumeM3 * 0.30
    const dryMortarVolume = wetMortarVolume * 1.33
    const masonryMortarCementM3 = (1 / 7) * dryMortarVolume
    const masonryMortarSandM3 = (6 / 7) * dryMortarVolume

    // 5. Finishes: Plaster, Paint, Tiles, Waterproofing
    const plasterInternal = 2.2 * areaM2
    const plasterExternal = perimeterM * ht * floors
    const totalPlasterArea = plasterInternal + plasterExternal
    
    const wetPlasterVol = (plasterInternal * 0.012) + (plasterExternal * 0.020)
    const dryPlasterVol = wetPlasterVol * 1.33
    const plasterCementM3 = (1 / 5) * dryPlasterVol
    const plasterSandM3 = (4 / 5) * dryPlasterVol

    const paintArea = totalPlasterArea * 1.2
    const tilesArea = areaM2
    const waterproofingArea = footprintM2 + (areaM2 * 0.12) // Roof + Bathrooms

    // 6. Earthwork (Excavation)
    const foundationArea = footprintM2 * 0.35
    const excavationVolume = foundationArea * 1.5

    // 7. Ingredient Decompositions (OPC + aggregates)
    const dryConcreteVolume = totalConcreteVolume * 1.54
    
    // Mix ratios components
    const mixRatios: Record<string, number[]> = {
      'M10': [1, 3.0, 6.0],
      'M15': [1, 2.0, 4.0],
      'M20': [1, 1.5, 3.0],
      'M25': [1, 1.0, 2.0],
      'M30': [1, 0.75, 1.5]
    }
    const ratio = mixRatios[concreteGrade] || [1, 1.5, 3.0]
    const ratioSum = ratio[0] + ratio[1] + ratio[2]
    
    const concreteCementM3 = (ratio[0] / ratioSum) * dryConcreteVolume
    const concreteSandM3 = (ratio[1] / ratioSum) * dryConcreteVolume
    const concreteAggregateM3 = (ratio[2] / ratioSum) * dryConcreteVolume

    // Sum aggregate cement bags
    const totalCementM3 = concreteCementM3 + masonryMortarCementM3 + plasterCementM3
    const totalCementBags = Math.ceil((totalCementM3 / 0.0347) * waste)
    const totalSandM3 = (concreteSandM3 + masonryMortarSandM3 + plasterSandM3) * waste
    const totalAggregateM3 = concreteAggregateM3 * waste

    // 8. Cost Engine Estimations (CPWD Delhi 2024 Base Rates)
    const concreteCost = Math.round(totalConcreteVolume * waste * 5500)
    const steelCost = Math.round(totalSteelWeight * waste * 75)
    const cementCost = Math.round(totalCementBags * 430)
    const sandCost = Math.round(totalSandM3 * 1400)
    const aggregateCost = Math.round(totalAggregateM3 * 1600)
    const brickCost = Math.round(bricksCount * waste * 10)
    const blockCost = Math.round(blocksCount * waste * 55)
    const mortarCost = Math.round(wetMortarVolume * waste * 200)
    const plasterCost = Math.round(totalPlasterArea * waste * 280)
    const paintCost = Math.round(paintArea * waste * 120)
    const tilesCost = Math.round(tilesArea * waste * 650)
    const waterproofingCost = Math.round(waterproofingArea * waste * 380)
    const excavationCost = Math.round(excavationVolume * 200)

    const totalMatCost = 
      concreteCost + steelCost + cementCost + sandCost + aggregateCost +
      brickCost + blockCost + mortarCost + plasterCost + paintCost +
      tilesCost + waterproofingCost + excavationCost

    const labourCost = Math.round(totalMatCost * 0.30)
    const equipmentCost = Math.round(totalMatCost * 0.05)
    
    const baseExecutionCost = totalMatCost + labourCost + equipmentCost
    const contractorMargin = Math.round(baseExecutionCost * 0.10)
    const contingency = Math.round(baseExecutionCost * 0.05)
    
    const taxableSubtotal = baseExecutionCost + contractorMargin + contingency
    const gstAmount = Math.round(taxableSubtotal * 0.18)
    const grandTotal = taxableSubtotal + gstAmount

    const demoEst = {
      id: demoEstId,
      project_id: projectId || planId,
      user_inputs: params,
      materials: {
        concrete_volume: +(totalConcreteVolume * waste).toFixed(2),
        steel_weight: +(totalSteelWeight * waste).toFixed(0),
        cement_bags: totalCementBags,
        sand_volume: +totalSandM3.toFixed(2),
        aggregate_volume: +totalAggregateM3.toFixed(2),
        bricks_count: brickType === 'red_brick' ? Math.ceil(bricksCount * waste) : 0,
        blocks_count: brickType === 'aac_block' ? Math.ceil(blocksCount * waste) : 0,
        mortar_volume: +(wetMortarVolume * waste).toFixed(2),
        plaster_area: +(totalPlasterArea * waste).toFixed(2),
        paint_area: +(paintArea * waste).toFixed(2),
        tiles_area: +(tilesArea * waste).toFixed(2),
        waterproofing_area: +(waterproofingArea * waste).toFixed(2),
        excavation_volume: +excavationVolume.toFixed(2),
        formwork_area: +(totalConcreteVolume * 4.5).toFixed(2),
        glass_area: +(areaM2 * 0.08).toFixed(2),
        doors_count: floors * 4,
        windows_count: floors * 6,
      },
      cost_breakdown: {
        concrete_cost: concreteCost,
        steel_cost: steelCost,
        cement_cost: cementCost,
        sand_cost: sandCost,
        aggregate_cost: aggregateCost,
        brick_cost: brickCost,
        block_cost: blockCost,
        mortar_cost: mortarCost,
        plaster_cost: plasterCost,
        paint_cost: paintCost,
        tiles_cost: tilesCost,
        waterproofing_cost: waterproofingCost,
        excavation_cost: excavationCost,
        labour_cost: labourCost,
        equipment_cost: equipmentCost,
        total_material_cost: totalMatCost,
        gst_amount: gstAmount,
        contractor_margin: contractorMargin,
        contingency: contingency,
        grand_total: grandTotal,
      },
      total_cost: grandTotal,
      currency: 'INR',
      created_at: new Date().toISOString(),
    }
    localStorage.setItem(`bw_demo_est_${demoEstId}`, JSON.stringify(demoEst))
    router.push(`/estimate/${projectId || planId}?estimation_id=${demoEstId}`)
  }


  // Wizard form submission to calculate materials
  const handleWizardSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const params = {
      building_type: buildingType,
      num_floors: numFloors,
      floor_height: floorHeight,
      total_area: totalArea,
      wall_thickness: wallThickness,
      slab_thickness: slabThickness,
      concrete_grade: concreteGrade,
      steel_grade: steelGrade,
      foundation_type: foundationType,
      roof_type: roofType,
      brick_type: brickType,
      waste_percentage: wastePercentage,
    }

    // ── Demo plan: skip API entirely, calculate instantly ────────────────────
    const isDemoPlan = planId.startsWith('demo_plan_')
    if (isDemoPlan) {
      runDemoCalculation(params)
      return
    }

    // ── Real backend attempt with fast timeout ───────────────────────────────
    try {
      const res = await estimationApi.create(projectId || planId, params)
      const est = res.data
      router.push(`/estimate/${projectId || planId}?estimation_id=${est.id}`)
    } catch {
      // Backend not available — fall back to local demo calculation
      runDemoCalculation(params)
    }
  }

  return (
    <div className="max-w-[680px] mx-auto space-y-6">
      <AnimatePresence mode="wait">
        {!showWizard ? (
          /* Stepper Progress Screen */
          <motion.div
            key="analysis"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="bg-white dark:bg-[#1E1E24] border border-black/[0.06] dark:border-white/[0.06] rounded-[24px] p-6 space-y-6"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-violet-600/10 rounded-2xl flex items-center justify-center text-violet-600">
                <Sparkles className="w-5.5 h-5.5 w-[22px] h-[22px] animate-pulse" />
              </div>
              <div>
                <h2 className="text-lg font-black">AI Architect Takeoff</h2>
                <p className="text-[12.5px] text-black/40 dark:text-white/35 mt-0.5">
                  Scanning blueprints with YOLO & SAM Computer Vision
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {STEPS.map((step, index) => {
                const isCompleted = index < activeStep
                const isActive = index === activeStep
                const isPending = index > activeStep

                return (
                  <div
                    key={step.id}
                    className={`flex items-start gap-4 p-3.5 rounded-2xl border transition-all ${
                      isActive ? 'border-violet-500/25 bg-violet-500/[0.02] shadow-md shadow-violet-500/5' : 'border-transparent'
                    }`}
                  >
                    <div className="mt-0.5">
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : isActive ? (
                        status === 'failed' ? (
                          <AlertCircle className="w-5 h-5 text-red-500" />
                        ) : (
                          <Loader2 className="w-5 h-5 text-violet-600 animate-spin" />
                        )
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-black/[0.1] dark:border-white/[0.1]" />
                      )}
                    </div>
                    <div>
                      <p className={`text-[13.5px] font-bold ${isActive ? 'text-violet-600 dark:text-violet-400' : isCompleted ? 'text-black/70 dark:text-white/70' : 'text-black/35 dark:text-white/25'}`}>
                        {step.label}
                      </p>
                      <p className="text-[11.5px] text-black/40 dark:text-white/30 mt-0.5">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>

            {status === 'failed' && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl text-[13px] flex items-center gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                {error}
              </div>
            )}
          </motion.div>
        ) : (
          /* Auto-Detected Parameters Wizard — Confirm & Adjust */
          <motion.div
            key="wizard"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-[#1E1E24] border border-black/[0.06] dark:border-white/[0.06] rounded-[24px] p-6 space-y-6"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-violet-600/10 rounded-2xl flex items-center justify-center text-violet-600">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black">Confirm Structural Parameters</h2>
                <p className="text-[12.5px] text-black/40 dark:text-white/35 mt-0.5">
                  AI pre-filled values from your drawing — adjust if needed, then calculate
                </p>
              </div>
            </div>

            {/* AI Detection Summary Banner */}
            {(detectedArea || detectedRooms || detectedDoors) && (
              <div className="px-4 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[12.5px] flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-bold">Auto-detected from your plan: </span>
                  {detectedArea && <span>Area ≈ <strong>{detectedArea.toLocaleString()} sq ft</strong></span>}
                  {detectedRooms && <span> · <strong>{detectedRooms} rooms</strong></span>}
                  {detectedDoors && <span> · <strong>{detectedDoors} doors</strong></span>}
                  <span className="block mt-0.5 text-emerald-600/70 dark:text-emerald-400/60">Verify the values below and click Calculate Takeoff.</span>
                </div>
              </div>
            )}

            {error && (
              <div className="px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-[13.5px] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleWizardSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-bold text-black/50 dark:text-white/40 mb-1">Building Type</label>
                  <select value={buildingType} onChange={(e) => setBuildingType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAFAFC] dark:bg-[#252530] border border-black/[0.08] dark:border-white/[0.08] text-[13.5px] focus:outline-none focus:border-violet-500">
                    {BUILDING_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-black/50 dark:text-white/40 mb-1">Number of Floors</label>
                  <input type="number" min={1} value={numFloors} onChange={(e) => setNumFloors(parseInt(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAFAFC] dark:bg-[#252530] border border-black/[0.08] dark:border-white/[0.08] text-[13.5px] focus:outline-none focus:border-violet-500" />
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-black/50 dark:text-white/40 mb-1">Floor Height (m)</label>
                  <input type="number" step={0.1} value={floorHeight} onChange={(e) => setFloorHeight(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAFAFC] dark:bg-[#252530] border border-black/[0.08] dark:border-white/[0.08] text-[13.5px] focus:outline-none focus:border-violet-500" />
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-black/50 dark:text-white/40 mb-1">Total Built-up Area (sq ft)</label>
                  <input type="number" value={totalArea} onChange={(e) => setTotalArea(parseInt(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAFAFC] dark:bg-[#252530] border border-black/[0.08] dark:border-white/[0.08] text-[13.5px] focus:outline-none focus:border-violet-500" />
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-black/50 dark:text-white/40 mb-1">Wall Thickness (m)</label>
                  <input type="number" step={0.01} value={wallThickness} onChange={(e) => setWallThickness(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAFAFC] dark:bg-[#252530] border border-black/[0.08] dark:border-white/[0.08] text-[13.5px] focus:outline-none focus:border-violet-500" />
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-black/50 dark:text-white/40 mb-1">Slab Thickness (m)</label>
                  <input type="number" step={0.01} value={slabThickness} onChange={(e) => setSlabThickness(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAFAFC] dark:bg-[#252530] border border-black/[0.08] dark:border-white/[0.08] text-[13.5px] focus:outline-none focus:border-violet-500" />
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-black/50 dark:text-white/40 mb-1">Concrete Grade</label>
                  <select value={concreteGrade} onChange={(e) => setConcreteGrade(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAFAFC] dark:bg-[#252530] border border-black/[0.08] dark:border-white/[0.08] text-[13.5px] focus:outline-none focus:border-violet-500">
                    {CONCRETE_GRADES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-black/50 dark:text-white/40 mb-1">Steel Grade</label>
                  <select value={steelGrade} onChange={(e) => setSteelGrade(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAFAFC] dark:bg-[#252530] border border-black/[0.08] dark:border-white/[0.08] text-[13.5px] focus:outline-none focus:border-violet-500">
                    {STEEL_GRADES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-black/50 dark:text-white/40 mb-1">Foundation Type</label>
                  <select value={foundationType} onChange={(e) => setFoundationType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAFAFC] dark:bg-[#252530] border border-black/[0.08] dark:border-white/[0.08] text-[13.5px] focus:outline-none focus:border-violet-500">
                    {FOUNDATION_TYPES.map(f => <option key={f} value={f} className="capitalize">{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-black/50 dark:text-white/40 mb-1">Roof Type</label>
                  <select value={roofType} onChange={(e) => setRoofType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAFAFC] dark:bg-[#252530] border border-black/[0.08] dark:border-white/[0.08] text-[13.5px] focus:outline-none focus:border-violet-500">
                    {ROOF_TYPES.map(r => <option key={r} value={r} className="capitalize">{r.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-black/50 dark:text-white/40 mb-1">Brick/Block Type</label>
                  <select value={brickType} onChange={(e) => setBrickType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAFAFC] dark:bg-[#252530] border border-black/[0.08] dark:border-white/[0.08] text-[13.5px] focus:outline-none focus:border-violet-500">
                    {BRICK_TYPES.map(b => <option key={b} value={b} className="capitalize">{b.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-black/50 dark:text-white/40 mb-1">Waste Factor (%)</label>
                  <input type="number" min={0} max={25} value={wastePercentage} onChange={(e) => setWastePercentage(parseInt(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAFAFC] dark:bg-[#252530] border border-black/[0.08] dark:border-white/[0.08] text-[13.5px] focus:outline-none focus:border-violet-500" />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-black/[0.05] dark:border-white/[0.05]">
                <button
                  type="button"
                  onClick={() => router.push(`/projects/${projectId}`)}
                  className="flex-1 py-3 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] text-[13.5px] font-semibold hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white text-[13.5px] font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-600/25"
                >
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
