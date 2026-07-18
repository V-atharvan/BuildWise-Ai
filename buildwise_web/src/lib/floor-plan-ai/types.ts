// ══════════════════════════════════════════════════════════════════════════════
// BuildWise AI — Floor Plan Understanding Engine
// Core Type Definitions
// ══════════════════════════════════════════════════════════════════════════════

// ── Coordinate Systems ──────────────────────────────────────────────────────
// All pixel coordinates are in the original (enhanced) image space.
// All real-world coordinates are in meters after scale conversion.

export type PixelPoint = [number, number]    // [x, y] in image pixels
export type MeterPoint = [number, number]    // [x, y] in real-world meters
export type PixelPolygon = PixelPoint[]
export type MeterPolygon = MeterPoint[]

// ── Scale Information ───────────────────────────────────────────────────────

export type ScaleSource = 'scale_bar' | 'dimension_text' | 'annotation' | 'estimated'
export type DrawingUnit = 'meters' | 'feet' | 'millimeters' | 'inches'

export interface ScaleInfo {
  px_per_meter: number           // conversion factor
  detected_scale: string         // human-readable e.g. "1:100"
  unit: DrawingUnit
  confidence: number             // 0-1
  source: ScaleSource
  scale_bar_detected: boolean
  user_confirmed: boolean        // true if user manually confirmed/overrode
}

// ── Confidence Scoring ──────────────────────────────────────────────────────

export interface ConfidenceSubScore {
  value: number         // 0-1
  source: string        // human-readable explanation
}

export interface RoomConfidenceScore {
  overall: number                          // 0-1, weighted aggregate
  ocr?: ConfidenceSubScore                 // from OCR label match
  geometry?: ConfidenceSubScore            // from size/shape heuristics
  adjacency?: ConfidenceSubScore           // from neighbor room context
  fixture?: ConfidenceSubScore             // from detected fixtures
  symbol?: ConfidenceSubScore              // from architectural symbols
}

export type ConfidenceFlag = 'ok' | 'review' | 'critical'

// ── Room Classification ─────────────────────────────────────────────────────

export type RoomType =
  | 'living_room'
  | 'master_bedroom'
  | 'bedroom'
  | 'kitchen'
  | 'dining_room'
  | 'bathroom'
  | 'toilet'
  | 'balcony'
  | 'passage'
  | 'staircase'
  | 'store_room'
  | 'utility'
  | 'pooja_room'
  | 'study'
  | 'garage'
  | 'entrance'
  | 'lobby'
  | 'corridor'
  | 'unknown'

export interface RoomClassification {
  classified_label: string            // display label (may be custom)
  room_type: RoomType
  confidence: RoomConfidenceScore
  low_confidence_flag: boolean        // true if overall < 0.90
  flag_level: ConfidenceFlag
  reason: string                      // human-readable explanation
  all_candidates: Record<string, number>  // label → confidence score map
  needs_user_confirmation: boolean
}

// ── Detected Elements ───────────────────────────────────────────────────────

export interface AIRoom {
  id: string
  label: string                       // display name (from OCR or classification)
  room_type: RoomType

  // Geometry (pixel space)
  polygon: PixelPolygon               // vertices of the room boundary
  centroid: PixelPoint
  bounding_box: [number, number, number, number]  // [x, y, w, h]

  // Geometry (real-world, after scale)
  area_m2: number
  area_sqft: number
  perimeter_m: number
  length_m: number                    // approximate longest dimension
  width_m: number                     // approximate shortest dimension
  aspect_ratio: number
  floor_height_m: number              // default 3.0, overridable

  // Classification
  classification: RoomClassification

  // Relationships
  adjacent_room_ids: string[]         // room IDs sharing a wall
  door_ids: string[]                  // door IDs in this room
  window_ids: string[]                // window IDs in this room
  wall_ids: string[]                  // wall IDs forming this room
}

export type WallType = 'external' | 'internal' | 'partition'

export interface AIWall {
  id: string
  start: PixelPoint
  end: PixelPoint
  length_px: number
  length_m: number
  thickness_px: number
  thickness_m: number
  wall_type: WallType
  room_ids: string[]                  // rooms this wall belongs to (1 or 2)
  door_ids: string[]                  // doors in this wall
  window_ids: string[]                // windows in this wall
  is_structural: boolean
  confidence: number
}

export type DoorType = 'single' | 'double' | 'sliding' | 'folding'
export type SwingDirection = 'inward' | 'outward' | 'unknown'

export interface AIDoor {
  id: string
  wall_id: string | null              // wall this door is in
  room_id: string | null              // primary room
  adjacent_room_id: string | null     // room on the other side

  center: PixelPoint                  // center point on wall
  width_m: number
  height_m: number
  type: DoorType
  swing_direction: SwingDirection
  swing_angle: number                 // degrees (0-90, for arc rendering)
  confidence: number
}

export interface AIWindow {
  id: string
  wall_id: string | null
  room_id: string | null

  center: PixelPoint
  width_m: number
  height_m: number
  sill_height_m: number               // height from floor to window bottom
  confidence: number
}

// ── OCR Results ─────────────────────────────────────────────────────────────

export interface OCRTextRegion {
  text: string
  center: PixelPoint
  bounding_box: [number, number, number, number]
  confidence: number
  type: 'room_label' | 'dimension' | 'scale' | 'note' | 'decorative' | 'unknown'
}

// ── Image Enhancement ───────────────────────────────────────────────────────

export interface ImageEnhancementResult {
  enhanced_data_url: string           // base64 PNG of enhanced image
  original_width: number
  original_height: number
  enhanced_width: number
  enhanced_height: number
  rotation_applied_deg: number        // degrees of auto-correction applied
  enhancements_applied: string[]      // list of operations performed
}

// ── Geometry Validation ─────────────────────────────────────────────────────

export interface GeometryIssue {
  type: 'overlapping_rooms' | 'unclosed_polygon' | 'floating_wall' | 'orphan_door' | 'gap_in_wall'
  severity: 'warning' | 'error'
  element_ids: string[]
  description: string
  auto_corrected: boolean
}

export interface GeometryValidation {
  is_valid: boolean
  issues: GeometryIssue[]
  rooms_validated: number
  walls_validated: number
  auto_corrections_applied: number
}

// ── Full Analysis Result ────────────────────────────────────────────────────

export interface FloorPlanAnalysisResult {
  // Metadata
  id: string
  plan_id: string
  project_id: string
  analyzed_at: string                 // ISO timestamp
  pipeline_version: string

  // Image
  image_enhancement: ImageEnhancementResult

  // Scale
  scale: ScaleInfo

  // Detected Elements
  rooms: AIRoom[]
  walls: AIWall[]
  doors: AIDoor[]
  windows: AIWindow[]

  // OCR
  ocr_regions: OCRTextRegion[]
  raw_ocr_texts: string[]

  // Summary
  total_area_m2: number
  total_area_sqft: number
  room_count: number
  door_count: number
  window_count: number
  wall_count: number
  floor_height_m: number
  wall_thickness_m: number

  // Geometry Validation
  geometry_validation: GeometryValidation

  // Confidence
  overall_confidence: number          // mean of all room confidences
  low_confidence_room_ids: string[]   // rooms requiring user review
  needs_user_review: boolean

  // Raw Gemini Response (for debugging)
  raw_ai_response?: string
}

// ── Pipeline ────────────────────────────────────────────────────────────────

export type PipelineStepId =
  | 'enhance'
  | 'scale'
  | 'ocr'
  | 'walls'
  | 'rooms'
  | 'doors_windows'
  | 'classify'
  | 'confidence'
  | 'validate'
  | 'generate'
  | 'done'

export type PipelineStepStatus = 'pending' | 'running' | 'done' | 'error' | 'skipped'

export interface PipelineStep {
  id: PipelineStepId
  label: string
  description: string
  status: PipelineStepStatus
  progress?: number                   // 0-100 for sub-steps
  result?: Partial<FloorPlanAnalysisResult>
  error?: string
  duration_ms?: number

  // Live preview data (shown during analysis)
  preview?: {
    rooms_found?: number
    walls_found?: number
    doors_found?: number
    windows_found?: number
    ocr_texts?: string[]
    scale_text?: string
    confidence_avg?: number
  }
}

export interface PipelineState {
  steps: PipelineStep[]
  current_step: PipelineStepId | null
  overall_progress: number            // 0-100
  is_complete: boolean
  is_error: boolean
  result: FloorPlanAnalysisResult | null
  error_message?: string
  started_at: string
  completed_at?: string
}

export interface PipelineOptions {
  plan_id: string
  project_id: string
  gemini_api_key: string
  gemini_model?: 'gemini-3.5-flash' | 'gemini-3.1-flash-lite' | 'gemini-2.0-flash' | 'gemini-1.5-pro' | 'gemini-2.0-flash-exp'
  abort_signal?: AbortSignal
  floor_height_m?: number             // override default 3.0
  wall_thickness_m?: number           // override default 0.23
}

// ── LocalStorage Schema ─────────────────────────────────────────────────────

// Stored as: localStorage.setItem(`bw_demo_plan_${planId}`, JSON.stringify(PlanStorageRecord))
export interface PlanStorageRecord {
  id: string
  project_id: string
  filename: string
  file_type: string
  status: 'pending' | 'processing' | 'done' | 'failed'
  created_at: string
  detected_data?: {
    rooms: AIRoom[]
    walls: AIWall[]
    doors: AIDoor[]
    windows: AIWindow[]
    scale: ScaleInfo
    floor_height_m: number
    wall_thickness_m: number
    total_area_m2: number
    total_area_sqft: number
    overall_confidence: number
    low_confidence_room_ids: string[]
    geometry_validation: GeometryValidation
  }
}
