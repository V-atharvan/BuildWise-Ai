// ══════════════════════════════════════════════════════════════════════════════
// BuildWise AI — Floor Plan Understanding Engine
// Steps 2–8: Gemini Vision API Analyzer
// ══════════════════════════════════════════════════════════════════════════════

import type {
  FloorPlanAnalysisResult,
  AIRoom, AIWall, AIDoor, AIWindow,
  ScaleInfo, OCRTextRegion,
  RoomType, PipelineOptions,
} from './types'

// ── Gemini API Configuration ────────────────────────────────────────────────

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta'

export type GeminiModel = 'gemini-3.5-flash' | 'gemini-3.1-flash-lite' | 'gemini-2.0-flash' | 'gemini-1.5-pro' | 'gemini-2.0-flash-exp'

// ── Structured JSON Schema Prompt ──────────────────────────────────────────

const FLOOR_PLAN_SYSTEM_PROMPT = `You are an expert AI Architect and Building Information Modelling (BIM) specialist with 20+ years of experience reading architectural floor plans.

Your task is to analyze the provided architectural floor plan image with maximum accuracy and output a precise, structured JSON describing the building.

CRITICAL RULES:
1. ACCURACY IS PARAMOUNT. Never guess if you are uncertain. Mark uncertain elements with low confidence scores.
2. Do NOT use simple bounding boxes for rooms. Extract the actual polygon vertices of each room boundary.
3. For rooms with confidence below 0.90, set low_confidence_flag to true and needs_user_confirmation to true.
4. Read ALL text visible in the drawing using OCR. Room labels are the primary classification signal.
5. Detect walls as line segments with start/end coordinates in pixel space.
6. Associate every door and window with its containing wall.
7. The coordinate system is [x, y] where [0,0] is top-left of the image.
8. All pixel coordinates must be within the image bounds.

OUTPUT FORMAT: Return ONLY valid JSON matching the schema below. No markdown, no explanation text.`

function buildAnalysisPrompt(imageWidth: number, imageHeight: number, floorHeightHint: number, wallThicknessHint: number): string {
  return `Analyze this architectural floor plan image (${imageWidth}×${imageHeight} pixels) and return a JSON object with the following structure:

{
  "scale": {
    "px_per_meter": <number>,
    "detected_scale": "<string like '1:100'>",
    "unit": "<'meters'|'feet'|'millimeters'|'inches'>",
    "confidence": <0-1>,
    "source": "<'scale_bar'|'dimension_text'|'annotation'|'estimated'>",
    "scale_bar_detected": <boolean>
  },
  "ocr_regions": [
    {
      "text": "<string>",
      "center": [<x>, <y>],
      "bounding_box": [<x>, <y>, <width>, <height>],
      "confidence": <0-1>,
      "type": "<'room_label'|'dimension'|'scale'|'note'|'decorative'|'unknown'>"
    }
  ],
  "rooms": [
    {
      "id": "room_<index>",
      "label": "<room name from OCR or inferred>",
      "room_type": "<living_room|master_bedroom|bedroom|kitchen|dining_room|bathroom|toilet|balcony|passage|staircase|store_room|utility|pooja_room|study|garage|entrance|lobby|corridor|unknown>",
      "polygon": [[<x1>,<y1>],[<x2>,<y2>],...],
      "centroid": [<cx>, <cy>],
      "bounding_box": [<x>, <y>, <w>, <h>],
      "area_estimate_m2": <number>,
      "classification": {
        "classified_label": "<string>",
        "confidence": {
          "overall": <0-1>,
          "ocr": {"value": <0-1>, "source": "<explanation>"},
          "geometry": {"value": <0-1>, "source": "<explanation>"},
          "adjacency": {"value": <0-1>, "source": "<explanation>"}
        },
        "low_confidence_flag": <boolean>,
        "flag_level": "<'ok'|'review'|'critical'>",
        "reason": "<human-readable explanation>",
        "all_candidates": {"<label>": <score>, ...},
        "needs_user_confirmation": <boolean>
      },
      "adjacent_room_indices": [<indices of adjacent rooms>],
      "door_indices": [<indices of doors in this room>],
      "window_indices": [<indices of windows in this room>]
    }
  ],
  "walls": [
    {
      "id": "wall_<index>",
      "start": [<x>, <y>],
      "end": [<x>, <y>],
      "thickness_px": <number>,
      "wall_type": "<'external'|'internal'|'partition'>",
      "room_indices": [<room indices>],
      "confidence": <0-1>
    }
  ],
  "doors": [
    {
      "id": "door_<index>",
      "wall_index": <number or null>,
      "room_index": <number or null>,
      "adjacent_room_index": <number or null>,
      "center": [<x>, <y>],
      "width_px": <number>,
      "type": "<'single'|'double'|'sliding'|'folding'>",
      "swing_angle": <0-90>,
      "confidence": <0-1>
    }
  ],
  "windows": [
    {
      "id": "window_<index>",
      "wall_index": <number or null>,
      "room_index": <number or null>,
      "center": [<x>, <y>],
      "width_px": <number>,
      "confidence": <0-1>
    }
  ],
  "floor_height_hint_m": ${floorHeightHint},
  "wall_thickness_hint_m": ${wallThicknessHint},
  "summary": {
    "total_rooms": <number>,
    "total_doors": <number>,
    "total_windows": <number>,
    "total_walls": <number>,
    "estimated_total_area_m2": <number>,
    "drawing_quality": "<'high'|'medium'|'low'>",
    "overall_confidence": <0-1>,
    "low_confidence_room_count": <number>,
    "notes": "<any important observations about the drawing>"
  }
}

IMPORTANT INSTRUCTIONS:
- Extract EVERY visible room, even unlabeled ones.
- For polygons: trace the INNER boundary of each room (inside the wall edges). Include at least 4 vertices per room, more for non-rectangular rooms.
- For walls: detect EVERY wall line. External walls are typically thicker.
- Doors in floor plans appear as: an arc (quarter circle) + a line representing the door panel. The arc shows the swing direction.
- Windows appear as: parallel lines or a gap in the wall with cross-hatching.
- Scale bars appear as a labeled line at the bottom or side of the drawing.
- If you cannot determine the scale, estimate based on typical room sizes: a bedroom is 10-15 m², a bathroom 4-6 m².
- Read ALL text. Room labels like "BED ROOM", "KITCHEN", "W.C.", "BATH" should be used for classification.
- Confidence scoring: OCR label match → high (0.90+). Size+adjacency match only → medium (0.70-0.89). Uncertain → flag (< 0.70).`
}

// ── Gemini API Call ─────────────────────────────────────────────────────────

export async function callGeminiVision(
  apiKey: string,
  model: GeminiModel,
  imageBase64: string,
  mimeType: string,
  imageWidth: number,
  imageHeight: number,
  floorHeightHint: number,
  wallThicknessHint: number,
  abortSignal?: AbortSignal
): Promise<string> {
  const url = `${GEMINI_API_BASE}/models/${model}:generateContent?key=${apiKey}`
  const prompt = buildAnalysisPrompt(imageWidth, imageHeight, floorHeightHint, wallThicknessHint)

  const requestBody = {
    system_instruction: {
      parts: [{ text: FLOOR_PLAN_SYSTEM_PROMPT }]
    },
    contents: [{
      role: 'user',
      parts: [
        {
          inline_data: {
            mime_type: mimeType,
            data: imageBase64,
          }
        },
        { text: prompt }
      ]
    }],
    generation_config: {
      temperature: 0.1,           // Low temperature for precision
      top_p: 0.8,
      max_output_tokens: 32768,
      response_mime_type: 'application/json',
    },
    safety_settings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
    ]
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
    signal: abortSignal,
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Gemini API error ${response.status}: ${err}`)
  }

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text

  if (!text) {
    throw new Error('Gemini returned no content. Check API key and model availability.')
  }

  return text
}

// ── Parse Gemini Response → Typed Structures ────────────────────────────────

export interface GeminiRawResult {
  scale?: any
  ocr_regions?: any[]
  rooms?: any[]
  walls?: any[]
  doors?: any[]
  windows?: any[]
  summary?: any
}

export function parseGeminiResponse(raw: string): GeminiRawResult {
  // Strip any markdown code fences if Gemini added them
  let cleaned = raw.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  }

  try {
    return JSON.parse(cleaned) as GeminiRawResult
  } catch (e) {
    // Try to extract JSON from the response
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]) as GeminiRawResult
      } catch {
        throw new Error(`Failed to parse Gemini JSON response: ${e}`)
      }
    }
    throw new Error(`Gemini response is not valid JSON: ${cleaned.slice(0, 200)}`)
  }
}

// ── Convert raw Gemini output → our typed FloorPlanAnalysisResult ─────────

export function convertGeminiToAnalysisResult(
  raw: GeminiRawResult,
  pxPerMeterFallback: number,
  imageWidth: number,
  imageHeight: number,
  floorHeightM: number,
  wallThicknessM: number,
  planId: string,
  projectId: string
): Omit<FloorPlanAnalysisResult, 'image_enhancement'> {
  const now = new Date().toISOString()

  // ── Scale ──────────────────────────────────────────────────────────────────
  const rawScale = raw.scale || {}
  const pxPerMeter: number = rawScale.px_per_meter && rawScale.px_per_meter > 0
    ? rawScale.px_per_meter
    : pxPerMeterFallback

  const scale: ScaleInfo = {
    px_per_meter: pxPerMeter,
    detected_scale: rawScale.detected_scale || 'estimated',
    unit: rawScale.unit || 'meters',
    confidence: rawScale.confidence ?? 0.5,
    source: rawScale.source || 'estimated',
    scale_bar_detected: rawScale.scale_bar_detected ?? false,
    user_confirmed: false,
  }

  // ── OCR Regions ────────────────────────────────────────────────────────────
  const ocrRegions: OCRTextRegion[] = (raw.ocr_regions || []).map((r: any, i: number) => ({
    text: r.text || '',
    center: r.center || [0, 0],
    bounding_box: r.bounding_box || [0, 0, 0, 0],
    confidence: r.confidence ?? 0.8,
    type: r.type || 'unknown',
  }))

  const rawOcrTexts = ocrRegions.map(r => r.text).filter(Boolean)

  // ── Rooms ──────────────────────────────────────────────────────────────────
  const rawRooms = raw.rooms || []
  const rooms: AIRoom[] = rawRooms.map((r: any, idx: number) => {
    const polygon = (r.polygon || []).map((pt: any) =>
      Array.isArray(pt) ? [Number(pt[0]), Number(pt[1])] : [0, 0]
    ) as [number, number][]

    const centroid: [number, number] = r.centroid
      ? [Number(r.centroid[0]), Number(r.centroid[1])]
      : polygon.length > 0
        ? [
            polygon.reduce((s, p) => s + p[0], 0) / polygon.length,
            polygon.reduce((s, p) => s + p[1], 0) / polygon.length,
          ]
        : [imageWidth / 2, imageHeight / 2]

    const bbox = r.bounding_box || [centroid[0] - 50, centroid[1] - 50, 100, 100]

    // Compute area from polygon using Shoelace formula (in pixel space, then convert)
    let areaPx2 = 0
    if (polygon.length >= 3) {
      for (let i = 0; i < polygon.length; i++) {
        const j = (i + 1) % polygon.length
        areaPx2 += polygon[i][0] * polygon[j][1]
        areaPx2 -= polygon[j][0] * polygon[i][1]
      }
      areaPx2 = Math.abs(areaPx2) / 2
    }
    const areaM2 = areaPx2 > 0 ? areaPx2 / (pxPerMeter * pxPerMeter) : (r.area_estimate_m2 || 10)
    const areaSqft = areaM2 * 10.7639

    // Compute perimeter
    let perimeterPx = 0
    for (let i = 0; i < polygon.length; i++) {
      const j = (i + 1) % polygon.length
      const dx = polygon[j][0] - polygon[i][0]
      const dy = polygon[j][1] - polygon[i][1]
      perimeterPx += Math.sqrt(dx * dx + dy * dy)
    }
    const perimeterM = perimeterPx / pxPerMeter

    const w = bbox[2] / pxPerMeter
    const h = bbox[3] / pxPerMeter
    const lengthM = Math.max(w, h)
    const widthM = Math.min(w, h)

    const cls = r.classification || {}
    const conf = cls.confidence || {}
    const overall = conf.overall ?? 0.8

    return {
      id: r.id || `room_${idx}`,
      label: r.label || cls.classified_label || 'Unknown Room',
      room_type: (r.room_type || 'unknown') as RoomType,
      polygon,
      centroid,
      bounding_box: bbox,
      area_m2: Math.round(areaM2 * 10) / 10,
      area_sqft: Math.round(areaSqft),
      perimeter_m: Math.round(perimeterM * 10) / 10,
      length_m: Math.round(lengthM * 100) / 100,
      width_m: Math.round(widthM * 100) / 100,
      aspect_ratio: lengthM > 0 && widthM > 0 ? Math.round((lengthM / widthM) * 100) / 100 : 1,
      floor_height_m: floorHeightM,
      classification: {
        classified_label: cls.classified_label || r.label || 'Unknown Room',
        room_type: (r.room_type || 'unknown') as RoomType,
        confidence: {
          overall,
          ocr: conf.ocr ? { value: conf.ocr.value, source: conf.ocr.source } : undefined,
          geometry: conf.geometry ? { value: conf.geometry.value, source: conf.geometry.source } : undefined,
          adjacency: conf.adjacency ? { value: conf.adjacency.value, source: conf.adjacency.source } : undefined,
        },
        low_confidence_flag: cls.low_confidence_flag ?? overall < 0.90,
        flag_level: cls.flag_level || (overall >= 0.90 ? 'ok' : overall >= 0.70 ? 'review' : 'critical'),
        reason: cls.reason || '',
        all_candidates: cls.all_candidates || {},
        needs_user_confirmation: cls.needs_user_confirmation ?? overall < 0.90,
      },
      adjacent_room_ids: (r.adjacent_room_indices || []).map((i: number) => `room_${i}`),
      door_ids: (r.door_indices || []).map((i: number) => `door_${i}`),
      window_ids: (r.window_indices || []).map((i: number) => `window_${i}`),
      wall_ids: [],
    } as AIRoom
  })

  // ── Walls ──────────────────────────────────────────────────────────────────
  const walls: AIWall[] = (raw.walls || []).map((w: any, idx: number) => {
    const start: [number, number] = w.start || [0, 0]
    const end: [number, number] = w.end || [0, 0]
    const dx = end[0] - start[0], dy = end[1] - start[1]
    const lengthPx = Math.sqrt(dx * dx + dy * dy)
    const thicknessPx = w.thickness_px || (w.wall_type === 'external' ? 20 : 10)
    return {
      id: w.id || `wall_${idx}`,
      start,
      end,
      length_px: Math.round(lengthPx),
      length_m: Math.round((lengthPx / pxPerMeter) * 100) / 100,
      thickness_px: thicknessPx,
      thickness_m: Math.round((thicknessPx / pxPerMeter) * 1000) / 1000,
      wall_type: w.wall_type || 'internal',
      room_ids: (w.room_indices || []).map((i: number) => `room_${i}`),
      door_ids: [],
      window_ids: [],
      is_structural: w.wall_type === 'external',
      confidence: w.confidence ?? 0.85,
    } as AIWall
  })

  // ── Doors ──────────────────────────────────────────────────────────────────
  const doors: AIDoor[] = (raw.doors || []).map((d: any, idx: number) => ({
    id: d.id || `door_${idx}`,
    wall_id: d.wall_index !== null && d.wall_index !== undefined ? `wall_${d.wall_index}` : null,
    room_id: d.room_index !== null && d.room_index !== undefined ? `room_${d.room_index}` : null,
    adjacent_room_id: d.adjacent_room_index !== null && d.adjacent_room_index !== undefined ? `room_${d.adjacent_room_index}` : null,
    center: d.center || [0, 0],
    width_m: d.width_px ? Math.round((d.width_px / pxPerMeter) * 100) / 100 : 0.9,
    height_m: 2.1,
    type: d.type || 'single',
    swing_direction: 'unknown',
    swing_angle: d.swing_angle ?? 90,
    confidence: d.confidence ?? 0.8,
  } as AIDoor))

  // ── Windows ────────────────────────────────────────────────────────────────
  const windows: AIWindow[] = (raw.windows || []).map((win: any, idx: number) => ({
    id: win.id || `window_${idx}`,
    wall_id: win.wall_index !== null && win.wall_index !== undefined ? `wall_${win.wall_index}` : null,
    room_id: win.room_index !== null && win.room_index !== undefined ? `room_${win.room_index}` : null,
    center: win.center || [0, 0],
    width_m: win.width_px ? Math.round((win.width_px / pxPerMeter) * 100) / 100 : 1.2,
    height_m: 1.2,
    sill_height_m: 0.9,
    confidence: win.confidence ?? 0.8,
  } as AIWindow))

  // ── Summary stats ──────────────────────────────────────────────────────────
  const totalAreaM2 = rooms.reduce((s, r) => s + r.area_m2, 0)
  const lowConfRooms = rooms.filter(r => r.classification.low_confidence_flag)
  const overallConf = rooms.length > 0
    ? rooms.reduce((s, r) => s + r.classification.confidence.overall, 0) / rooms.length
    : 0.85

  return {
    id: `analysis_${Date.now()}`,
    plan_id: planId,
    project_id: projectId,
    analyzed_at: now,
    pipeline_version: '2.0.0',
    scale,
    rooms,
    walls,
    doors,
    windows,
    ocr_regions: ocrRegions,
    raw_ocr_texts: rawOcrTexts,
    total_area_m2: Math.round(totalAreaM2 * 10) / 10,
    total_area_sqft: Math.round(totalAreaM2 * 10.7639),
    room_count: rooms.length,
    door_count: doors.length,
    window_count: windows.length,
    wall_count: walls.length,
    floor_height_m: floorHeightM,
    wall_thickness_m: wallThicknessM,
    overall_confidence: Math.round(overallConf * 100) / 100,
    low_confidence_room_ids: lowConfRooms.map(r => r.id),
    needs_user_review: lowConfRooms.length > 0,
    geometry_validation: {
      is_valid: true,
      issues: [],
      rooms_validated: rooms.length,
      walls_validated: walls.length,
      auto_corrections_applied: 0,
    },
    raw_ai_response: JSON.stringify(raw),
  }
}

// ── API Key validation ──────────────────────────────────────────────────────

export async function validateGeminiKey(apiKey: string, model: GeminiModel = 'gemini-3.5-flash'): Promise<boolean> {
  try {
    const url = `${GEMINI_API_BASE}/models/${model}:generateContent?key=${apiKey}`
    const body = {
      contents: [{ role: 'user', parts: [{ text: 'Reply with the single word: OK' }] }],
      generation_config: { max_output_tokens: 5 }
    }
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    
    // Status 200 means valid key. Status 429 (Quota Exceeded) also means key is valid but rate-limited.
    // Status 400 means key is invalid (API_KEY_INVALID).
    if (res.ok || res.status === 429) {
      if (res.status === 429) {
        console.warn('Gemini API key is valid but has exceeded its quota limits (429).')
      }
      return true
    }
    return false
  } catch {
    return false
  }
}

// ── Get stored API key ──────────────────────────────────────────────────────

export function getGeminiApiKey(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('bw_gemini_key') ||
    (process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? '')
}

export function setGeminiApiKey(key: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('bw_gemini_key', key)
}
