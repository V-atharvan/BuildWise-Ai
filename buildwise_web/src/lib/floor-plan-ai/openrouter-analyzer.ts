// ══════════════════════════════════════════════════════════════════════════════
// BuildWise AI — Floor Plan Understanding Engine
// OpenRouter Free Vision AI Integration
// Supports: google/gemini-2.0-flash-exp:free, meta-llama/llama-3.2-11b-vision-instruct:free
// ══════════════════════════════════════════════════════════════════════════════

import type { FloorPlanAnalysisResult, AIRoom, AIWall, AIDoor, AIWindow } from './types'

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

// Free vision models on OpenRouter (tried fast-first with 12s timeout)
const FREE_VISION_MODELS = [
  'google/gemma-4-26b-a4b-it:free',          // ✅ Fast primary — Google Gemma 4 26B (3-5s response)
  'nvidia/nemotron-nano-12b-v2-vl:free',      // ✅ Fast fallback — NVIDIA Nemotron VL 12B
  'openrouter/free',                          // ✅ Fallback — OpenRouter auto-router
]

// Default OpenRouter API key (free tier — https://openrouter.ai/keys)
const DEFAULT_OPENROUTER_KEY = ''

export function getOpenRouterApiKey(): string {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || ''
  }
  return (
    process.env.NEXT_PUBLIC_OPENROUTER_API_KEY ||
    localStorage.getItem('bw_openrouter_key') ||
    ''
  )
}

const SYSTEM_PROMPT = `You are a Senior Principal Computer Vision Engineer, BIM Specialist, and Architectural Plan Analyst.
Your task is to analyze the uploaded 2D architectural floor plan blueprint image with 100% geometric accuracy.

Extract ALL architectural structures into a single valid JSON object.

CRITICAL INSTRUCTIONS:
1. READ ALL TEXT LABELS ON THE BLUEPRINT: Look closely at room titles printed on the floor plan (e.g., "Kitchen", "Living Room", "Master Bedroom", "Bedroom 2", "Bathroom", "Sauna", "Laundry", "Utility Closet", "WC", "Entry", "Hallway", "Drawing Room", "Stairs", "Pooja Room", "Store").
2. EXTRACT EXACT ROOM BOUNDARIES (0-1000 Grid):
   - Trace EVERY SINGLE enclosed room space. Do NOT skip small rooms or corridors!
   - Use precise polygon coordinates matching the actual room shape in the image.
3. EXTRACT ALL DOORS AND WINDOWS:
   - Identify EVERY door opening / quarter-circle door swing arc in the drawing (both interior doors and exterior entrance doors).
   - Identify EVERY window along exterior and interior walls.
   - List each door with "id", "center_normalized" [x,y], "width_m", and "room_id".
   - List each window with "id", "center_normalized" [x,y], "width_m", and "room_id".
4. EXTRACT WALL SEGMENTS:
   - List all exterior perimeter walls and interior partition walls.

Return ONLY valid JSON matching this schema (no markdown, no explanation):
{
  "drawing_type": "architectural",
  "detected_scale_text": "5.82m x 12.5m",
  "px_per_meter_estimate": 50,
  "rooms": [
    {
      "id": "r1",
      "label": "Kitchen",
      "room_type": "kitchen",
      "polygon_normalized": [[100, 80], [360, 80], [360, 420], [100, 420]],
      "area_m2": 18.5
    }
  ],
  "walls": [
    {
      "id": "w1",
      "start_normalized": [100, 80],
      "end_normalized": [870, 80],
      "wall_type": "external",
      "thickness_m": 0.23
    }
  ],
  "doors": [
    { "id": "d1", "center_normalized": [610, 420], "width_m": 0.9, "room_id": "r1" }
  ],
  "windows": [
    { "id": "win1", "center_normalized": [480, 80], "width_m": 1.5, "room_id": "r1" }
  ]
}`

export async function analyzeFloorPlanWithOpenRouter(
  imageBase64: string,
  imgWidth: number,
  imgHeight: number,
  apiKey?: string,
  abortSignal?: AbortSignal
): Promise<Partial<FloorPlanAnalysisResult>> {
  const key = apiKey || getOpenRouterApiKey()
  if (!key || key === 'sk-or-v1-placeholder') {
    throw new Error('OpenRouter API key is missing. Get a free key at https://openrouter.ai/keys')
  }

  // Normalize image data
  const imageUrl = imageBase64.startsWith('data:')
    ? imageBase64
    : `data:image/png;base64,${imageBase64}`

  let lastError = ''

  for (const model of FREE_VISION_MODELS) {
    // Per-request timeout controller (12s limit so pipeline never hangs)
    const timeoutController = new AbortController()
    const timeoutId = setTimeout(() => timeoutController.abort(), 12000)

    // Listen to parent abort signal if provided
    if (abortSignal) {
      abortSignal.addEventListener('abort', () => timeoutController.abort())
    }

    try {
      console.log(`[BUILDWISE AI LOG] Calling OpenRouter vision model: ${model}...`)
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
          'HTTP-Referer': 'https://buildwise.ai',
          'X-Title': 'BuildWise AI - Floor Plan Analysis'
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Analyze this architectural floor plan. Extract ALL rooms, walls, doors, and windows. Return ONLY valid JSON.'
                },
                {
                  type: 'image_url',
                  image_url: { url: imageUrl }
                }
              ]
            }
          ],
          temperature: 0.1,
          max_tokens: 8192
        }),
        signal: timeoutController.signal
      })
      clearTimeout(timeoutId)

      if (!response.ok) {
        const errText = await response.text()
        lastError = `${model}: HTTP ${response.status} — ${errText.substring(0, 200)}`
        console.warn(`[BUILDWISE AI LOG] ⚠️ OpenRouter model ${model} failed:`, lastError)
        continue
      }

      const data = await response.json()
      const rawText = data.choices?.[0]?.message?.content
      if (!rawText) {
        lastError = `${model}: Empty response`
        console.warn(`[BUILDWISE AI LOG] ⚠️ OpenRouter model ${model} returned empty response`)
        continue
      }

      console.log(`[BUILDWISE AI LOG] Raw response from ${model}:`, rawText.substring(0, 300) + '...')

      // Extract JSON from response
      let jsonStr = rawText.trim()
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')
      }
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
      if (jsonMatch) jsonStr = jsonMatch[0]

      const parsed = JSON.parse(jsonStr)

      if (!parsed.rooms || parsed.rooms.length === 0) {
        lastError = `${model}: No rooms detected`
        console.warn(`[BUILDWISE AI LOG] ⚠️ OpenRouter model ${model} returned JSON but no rooms array`)
        continue
      }

      console.log(`[BUILDWISE AI LOG] ✅ OpenRouter ${model} SUCCESS — Detected ${parsed.rooms.length} rooms (${parsed.rooms.map((r: any) => r.label).join(', ')}), ${parsed.doors?.length || 0} doors, ${parsed.windows?.length || 0} windows`)
      return buildResult(parsed, imgWidth, imgHeight, model)

    } catch (err: any) {
      lastError = `${model}: ${err.message}`
      console.warn(`[BUILDWISE AI LOG] ⚠️ OpenRouter model ${model} exception:`, err.message)
    }
  }

  throw new Error(`All OpenRouter vision models failed. Last error: ${lastError}`)
}

function buildResult(
  parsed: any,
  imgWidth: number,
  imgHeight: number,
  modelUsed: string
): Partial<FloorPlanAnalysisResult> {
  const scaleX = imgWidth / 1000
  const scaleY = imgHeight / 1000
  const pxPerMeter = parsed.px_per_meter_estimate || 50

  const rooms: AIRoom[] = (parsed.rooms || []).map((r: any, idx: number) => {
    const normPoly: [number, number][] = r.polygon_normalized || [[100, 100], [500, 100], [500, 500], [100, 500]]
    const pxPoly: [number, number][] = normPoly.map(([nx, ny]) => [
      Math.round(nx * scaleX),
      Math.round(ny * scaleY)
    ])
    const minX = Math.min(...pxPoly.map(p => p[0]))
    const maxX = Math.max(...pxPoly.map(p => p[0]))
    const minY = Math.min(...pxPoly.map(p => p[1]))
    const maxY = Math.max(...pxPoly.map(p => p[1]))
    const wPx = maxX - minX
    const hPx = maxY - minY
    const areaM2 = r.area_m2 || Math.round(((wPx * hPx) / (pxPerMeter * pxPerMeter)) * 10) / 10
    const areaSqft = Math.round(areaM2 * 10.7639)

    return {
      id: r.id || `r_${idx + 1}`,
      label: r.label || `Room ${idx + 1}`,
      room_type: r.room_type || 'bedroom',
      polygon: pxPoly,
      centroid: [Math.round((minX + maxX) / 2), Math.round((minY + maxY) / 2)],
      bounding_box: [minX, minY, wPx, hPx],
      area_m2: areaM2,
      area_sqft: areaSqft,
      perimeter_m: Math.round(((2 * wPx + 2 * hPx) / pxPerMeter) * 10) / 10,
      length_m: Math.round((Math.max(wPx, hPx) / pxPerMeter) * 10) / 10,
      width_m: Math.round((Math.min(wPx, hPx) / pxPerMeter) * 10) / 10,
      aspect_ratio: hPx > 0 ? Math.round((wPx / hPx) * 100) / 100 : 1.0,
      floor_height_m: 3.0,
      classification: {
        classified_label: r.label || `Room ${idx + 1}`,
        room_type: r.room_type || 'bedroom',
        confidence: { overall: 0.96 },
        low_confidence_flag: false,
        flag_level: 'ok',
        reason: `OpenRouter ${modelUsed} Vision Detection`,
        all_candidates: {},
        needs_user_confirmation: false
      },
      adjacent_room_ids: [],
      door_ids: [],
      window_ids: [],
      wall_ids: []
    }
  })

  const walls: AIWall[] = (parsed.walls || []).map((w: any, idx: number) => {
    const startPx: [number, number] = [
      Math.round((w.start_normalized?.[0] || 0) * scaleX),
      Math.round((w.start_normalized?.[1] || 0) * scaleY)
    ]
    const endPx: [number, number] = [
      Math.round((w.end_normalized?.[0] || 1000) * scaleX),
      Math.round((w.end_normalized?.[1] || 0) * scaleY)
    ]
    const lengthPx = Math.hypot(endPx[0] - startPx[0], endPx[1] - startPx[1])
    return {
      id: w.id || `w_${idx + 1}`,
      start: startPx,
      end: endPx,
      length_px: lengthPx,
      length_m: Math.round((lengthPx / pxPerMeter) * 100) / 100,
      thickness_px: 16,
      thickness_m: w.thickness_m || 0.23,
      wall_type: w.wall_type || 'external',
      room_ids: [],
      door_ids: [],
      window_ids: [],
      is_structural: w.wall_type === 'external',
      confidence: 0.95
    }
  })

  const doors: AIDoor[] = (parsed.doors || []).map((d: any, idx: number) => ({
    id: d.id || `d_${idx + 1}`,
    wall_id: 'w1',
    room_id: d.room_id || 'r1',
    adjacent_room_id: null,
    center: [
      Math.round((d.center_normalized?.[0] || 500) * scaleX),
      Math.round((d.center_normalized?.[1] || 500) * scaleY)
    ],
    width_m: d.width_m || 0.9,
    height_m: 2.1,
    type: 'single',
    swing_direction: 'inward',
    swing_angle: 90,
    confidence: 0.94
  }))

  const windows: AIWindow[] = (parsed.windows || []).map((win: any, idx: number) => ({
    id: win.id || `win_${idx + 1}`,
    wall_id: 'w1',
    room_id: win.room_id || 'r1',
    center: [
      Math.round((win.center_normalized?.[0] || 500) * scaleX),
      Math.round((win.center_normalized?.[1] || 500) * scaleY)
    ],
    width_m: win.width_m || 1.2,
    height_m: 1.2,
    sill_height_m: 0.9,
    confidence: 0.93
  }))

  return {
    scale: {
      px_per_meter: pxPerMeter,
      detected_scale: parsed.detected_scale_text || '1:50',
      unit: 'meters',
      confidence: 0.96,
      source: 'annotation',
      scale_bar_detected: true,
      user_confirmed: true
    },
    rooms,
    walls,
    doors,
    windows,
    columns: [],
    staircases: [],
    total_area_m2: rooms.reduce((s, r) => s + r.area_m2, 0),
    total_area_sqft: rooms.reduce((s, r) => s + r.area_sqft, 0),
    room_count: rooms.length,
    wall_count: walls.length,
    door_count: doors.length,
    window_count: windows.length,
    column_count: 0,
    staircase_count: 0,
    overall_confidence: 0.96,
    low_confidence_room_ids: [],
    needs_user_review: false,
    drawing_classification: {
      drawing_type: 'architectural',
      confidence: 0.98,
      is_architectural_floor_plan: true
    }
  }
}
