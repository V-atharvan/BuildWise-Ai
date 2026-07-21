// ══════════════════════════════════════════════════════════════════════════════
// BuildWise AI — Floor Plan Understanding Engine
// Pipeline Orchestrator — coordinates all 11 steps
// ══════════════════════════════════════════════════════════════════════════════

import type {
  PipelineOptions, PipelineStep, PipelineStepId, FloorPlanAnalysisResult,
  PlanStorageRecord,
} from './types'
import { enhanceFloorPlanImage, dataUrlToBase64 } from './image-processor'
import {
  callGeminiVision, parseGeminiResponse, convertGeminiToAnalysisResult,
  getGeminiApiKey, type GeminiModel,
} from './gemini-analyzer'
import {
  validateAndCorrectGeometry, buildAdjacencyGraph, estimatePxPerMeterFromRooms,
} from './geometry-processor'

// ── Pipeline step definitions ────────────────────────────────────────────────

const PIPELINE_STEPS: { id: PipelineStepId; label: string; description: string }[] = [
  { id: 'enhance',      label: 'Image Enhancement',        description: 'Sharpening lines, adjusting contrast, correcting rotation' },
  { id: 'scale',        label: 'Scale Detection',          description: 'Detecting drawing scale, units, and dimension annotations' },
  { id: 'ocr',          label: 'Reading Labels (OCR)',     description: 'Extracting room names, dimensions, and drawing notes' },
  { id: 'walls',        label: 'Wall Detection',           description: 'Mapping structural walls, thickness, and continuity' },
  { id: 'rooms',        label: 'Room Polygon Extraction',  description: 'Finding enclosed spaces and tracing accurate room boundaries' },
  { id: 'doors_windows',label: 'Doors & Windows',         description: 'Detecting openings and associating them with walls' },
  { id: 'classify',     label: 'Room Classification',      description: 'Identifying room types using OCR, geometry, and adjacency' },
  { id: 'confidence',   label: 'Confidence Analysis',      description: 'Scoring each detection — flagging rooms needing review' },
  { id: 'validate',     label: 'Geometry Validation',      description: 'Checking polygon integrity, wall connections, and overlaps' },
  { id: 'generate',     label: 'Building Model',           description: 'Assembling the complete editable floor plan model' },
  { id: 'done',         label: 'Analysis Complete',        description: 'Building model ready — confirm parameters below' },
]

// ── Helper to create initial step states ────────────────────────────────────

function createInitialSteps(): PipelineStep[] {
  return PIPELINE_STEPS.map(s => ({
    ...s,
    status: 'pending' as const,
  }))
}

// ── Persist result to localStorage ─────────────────────────────────────────

function persistResult(planId: string, result: FloorPlanAnalysisResult): void {
  try {
    const record: PlanStorageRecord = {
      id: planId,
      project_id: result.project_id,
      filename: '',  // already set from upload
      file_type: '',
      status: 'done',
      created_at: result.analyzed_at,
      detected_data: {
        rooms: result.rooms,
        walls: result.walls,
        doors: result.doors,
        windows: result.windows,
        columns: result.columns,
        staircases: result.staircases,
        relationships: result.relationships,
        drawing_classification: result.drawing_classification,
        image_quality: result.image_quality,
        scale: result.scale,
        floor_height_m: result.floor_height_m,
        wall_thickness_m: result.wall_thickness_m,
        total_area_m2: result.total_area_m2,
        total_area_sqft: result.total_area_sqft,
        overall_confidence: result.overall_confidence,
        low_confidence_room_ids: result.low_confidence_room_ids,
        geometry_validation: result.geometry_validation,
      }
    }

    // Merge with existing plan record (preserve filename, project_id, etc.)
    const existingRaw = localStorage.getItem(`bw_demo_plan_${planId}`)
    if (existingRaw) {
      const existing = JSON.parse(existingRaw)
      Object.assign(record, {
        filename: existing.filename || record.filename,
        file_type: existing.file_type || record.file_type,
        project_id: existing.project_id || record.project_id,
      })
    }

    localStorage.setItem(`bw_demo_plan_${planId}`, JSON.stringify(record))
  } catch (err) {
    console.warn('Failed to persist analysis result:', err)
  }
}

// ── Main Pipeline — Async Generator ─────────────────────────────────────────

export async function* runFloorPlanPipeline(
  file: File,
  options: PipelineOptions
): AsyncGenerator<PipelineStep[]> {
  const steps = createInitialSteps()
  const apiKey = options.gemini_api_key || getGeminiApiKey()
  const model: GeminiModel = options.gemini_model || 'gemini-3.5-flash'
  const floorH = options.floor_height_m ?? 3.0
  const wallT = options.wall_thickness_m ?? 0.23

  let result: Partial<FloorPlanAnalysisResult> = {}

  const setStep = (id: PipelineStepId, status: PipelineStep['status'], preview?: PipelineStep['preview'], error?: string) => {
    const idx = steps.findIndex(s => s.id === id)
    if (idx >= 0) {
      steps[idx] = { ...steps[idx], status, preview, error }
    }
  }

  const markDone = (id: PipelineStepId, preview?: PipelineStep['preview']) => setStep(id, 'done', preview)
  const markError = (id: PipelineStepId, msg: string) => setStep(id, 'error', undefined, msg)

  // ── STEP 1: Image Enhancement ──────────────────────────────────────────────
  setStep('enhance', 'running')
  yield [...steps]

  let enhancement
  try {
    enhancement = await enhanceFloorPlanImage(file)
    result.image_enhancement = enhancement
    markDone('enhance', {})
  } catch (err: any) {
    markError('enhance', err.message)
    yield [...steps]
    return
  }
  yield [...steps]

  // ── STEPS 2–8: Gemini Vision API (single call that covers all steps) ────────
  // We animate these steps sequentially while the single Gemini call is running.
  // We start the Gemini call and then tick through the UI steps as it processes.

  const { base64, mimeType } = dataUrlToBase64(enhancement.enhanced_data_url)

  // Animate steps 2-8 sequentially with delays while Gemini processes
  const geminiStepIds: PipelineStepId[] = ['scale', 'ocr', 'walls', 'rooms', 'doors_windows', 'classify', 'confidence']
  
  // Set scale running first
  setStep('scale', 'running')
  yield [...steps]

  // Start the Gemini call in the background
  let geminiPromise: Promise<string>
  try {
    geminiPromise = callGeminiVision(
      apiKey, model, base64, mimeType,
      enhancement.enhanced_width, enhancement.enhanced_height,
      floorH, wallT,
      options.abort_signal
    )
  } catch (err: any) {
    markError('scale', err.message)
    yield [...steps]
    return
  }

  // Await the Gemini result with active yielding for simulated UI step progression
  let rawResponse: string | null = null
  let geminiError: any = null

  geminiPromise.then(
    (res) => { rawResponse = res },
    (err) => { geminiError = err }
  )

  let stepIdx = 0
  // Tick through Gemini steps sequentially every 2.5 seconds while waiting
  while (rawResponse === null && geminiError === null) {
    // Sleep in small 250ms chunks to respond immediately when Gemini finishes
    for (let i = 0; i < 10; i++) {
      if (rawResponse !== null || geminiError !== null) break
      await new Promise((resolve) => setTimeout(resolve, 250))
    }

    if (rawResponse !== null || geminiError !== null) break

    if (stepIdx < geminiStepIds.length) {
      const currentId = geminiStepIds[stepIdx]
      const nextId = geminiStepIds[stepIdx + 1]
      markDone(currentId)
      if (nextId) setStep(nextId, 'running')
      stepIdx++
      yield [...steps]
    }
  }

  if (geminiError) {
    const runningStep = steps.find(s => s.status === 'running')
    if (runningStep) markError(runningStep.id, geminiError.message || 'AI request failed')
    yield [...steps]
    return
  }

  if (rawResponse === null) {
    const runningStep = steps.find(s => s.status === 'running')
    if (runningStep) markError(runningStep.id, 'No response received from Gemini API')
    yield [...steps]
    return
  }

  const finalResponse: string = rawResponse

  // Mark all gemini steps as done
  geminiStepIds.forEach(id => markDone(id))
  yield [...steps]

  // ── Parse Gemini Response ──────────────────────────────────────────────────
  let rawParsed
  try {
    rawParsed = parseGeminiResponse(finalResponse)
  } catch (err: any) {
    markError('confidence', `AI response parsing failed: ${err.message}`)
    yield [...steps]
    return
  }

  // ── Step 9: Geometry Validation ────────────────────────────────────────────
  setStep('validate', 'running')
  yield [...steps]

  try {
    // Estimate pxPerMeter: use Gemini's value or estimate from room sizes
    const rawPxPerMeter = rawParsed.scale?.px_per_meter
    const pxPerMeter = rawPxPerMeter && rawPxPerMeter > 0
      ? rawPxPerMeter
      : (() => {
          // Temporarily convert rooms for estimation
          const tempRooms = (rawParsed.rooms || []).map((r: any, i: number) => ({
            id: `room_${i}`,
            room_type: r.room_type || 'unknown',
            polygon: r.polygon || [],
            centroid: r.centroid || [0, 0],
          })) as any[]
          return estimatePxPerMeterFromRooms(tempRooms)
        })()

    // Convert full Gemini output to our typed result
    const partialResult = convertGeminiToAnalysisResult(
      rawParsed,
      pxPerMeter,
      enhancement.enhanced_width,
      enhancement.enhanced_height,
      floorH,
      wallT,
      options.plan_id,
      options.project_id,
    )

    // Build adjacency graph and update room adjacent_room_ids
    const adjacency = buildAdjacencyGraph(partialResult.rooms)
    partialResult.rooms.forEach(room => {
      if (room.adjacent_room_ids.length === 0) {
        room.adjacent_room_ids = adjacency.get(room.id) || []
      }
    })

    // Run geometry validation
    const geoValidation = validateAndCorrectGeometry(partialResult)
    partialResult.geometry_validation = geoValidation

    const fullResult: FloorPlanAnalysisResult = {
      ...partialResult,
      image_enhancement: enhancement,
    }

    result = fullResult

    markDone('validate', {
      rooms_found: fullResult.room_count,
      walls_found: fullResult.wall_count,
      doors_found: fullResult.door_count,
      windows_found: fullResult.window_count,
    })
  } catch (err: any) {
    markError('validate', `Geometry validation failed: ${err.message}`)
    yield [...steps]
    return
  }
  yield [...steps]

  // ── Step 10: Generate Building Model ──────────────────────────────────────
  setStep('generate', 'running')
  yield [...steps]

  try {
    // Persist to localStorage so 3D viewer and BOQ can read it
    persistResult(options.plan_id, result as FloorPlanAnalysisResult)
    await new Promise(r => setTimeout(r, 500))  // Brief pause for UX

    markDone('generate', {
      rooms_found: (result as FloorPlanAnalysisResult).room_count,
      walls_found: (result as FloorPlanAnalysisResult).wall_count,
      confidence_avg: (result as FloorPlanAnalysisResult).overall_confidence,
    })
  } catch (err: any) {
    markError('generate', err.message)
    yield [...steps]
    return
  }
  yield [...steps]

  // ── Step 11: Done ─────────────────────────────────────────────────────────
  markDone('done')
  steps[steps.findIndex(s => s.id === 'done')].result = result as FloorPlanAnalysisResult
  yield [...steps]
}

// ── Demo Mode Pipeline (no API key needed) ──────────────────────────────────

export async function* runDemoPipeline(
  planId: string,
  projectId: string
): AsyncGenerator<PipelineStep[]> {
  const steps = createInitialSteps()

  for (let i = 0; i < PIPELINE_STEPS.length; i++) {
    steps[i] = { ...steps[i], status: 'running' }
    yield [...steps]
    await new Promise(r => setTimeout(r, i === 0 ? 1200 : 1800))
    steps[i] = { ...steps[i], status: 'done' }
    yield [...steps]
  }
}

// ── Export step definitions for UI ─────────────────────────────────────────

export { PIPELINE_STEPS, createInitialSteps }
