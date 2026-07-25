// ══════════════════════════════════════════════════════════════════════════════
// BuildWise AI — Intelligent Room Detection & Semantic Recognition Engine (Document 2)
// Architect-Level Multi-Source Evidence Fusion (OCR, Fixtures, Adjacency, Dimensions)
// ══════════════════════════════════════════════════════════════════════════════

import type { RoomType } from './types'

export interface RoomSemanticEvidence {
  ocr_score: number         // 0 - 100 (Weight: 25%)
  furniture_score: number   // 0 - 100 (Weight: 25%)
  fixture_score: number     // 0 - 100 (Weight: 25%)
  adjacency_score: number   // 0 - 100 (Weight: 15%)
  dimension_score: number   // 0 - 100 (Weight: 10%)
  detected_fixtures: string[]
  detected_furniture: string[]
  ocr_text_found?: string
  confidence_rating: 'High' | 'Medium' | 'Low'
  overall_score: number     // 0.0 - 1.0
}

export interface RoomHypothesisCandidate {
  room_type: RoomType
  label: string
  confidence: number
}

export interface SemanticRoomClassificationResult {
  classified_label: string
  room_type: RoomType
  confidence: number
  evidence: RoomSemanticEvidence
  candidates: RoomHypothesisCandidate[]
}

/**
 * Classifies room type using Architect-Level Multi-Source Evidence Fusion:
 * Score = OCR(25%) + Furniture(25%) + Fixtures(25%) + Adjacency(15%) + Dimensions(10%)
 */
export function classifyRoomSemantics(params: {
  polygon: number[][]
  area_m2: number
  perimeter_m: number
  ocr_text?: string
  fixtures?: string[]
  furniture?: string[]
  adjacent_room_types?: RoomType[]
}): SemanticRoomClassificationResult {
  const area = params.area_m2
  const text = (params.ocr_text || '').toLowerCase().trim()
  const fixtures = params.fixtures || []
  const furniture = params.furniture || []

  // 1. OCR Evidence Score (25% Weight)
  let ocrScore = 0
  let detectedType: RoomType = 'living_room'
  let labelText = 'Living Room'

  if (text.includes('bath') || text.includes('toilet') || text.includes('w.c') || text.includes('wc')) {
    ocrScore = 95
    detectedType = 'bathroom'
    labelText = text.includes('bath') && text.includes('toilet') ? 'Bathroom & Toilet' : 'Bathroom'
  } else if (text.includes('kitchen') || text.includes('dinning') || text.includes('dining')) {
    ocrScore = 95
    detectedType = 'kitchen'
    labelText = 'Kitchen cum Dinning'
  } else if (text.includes('bed') || text.includes('bedroom')) {
    ocrScore = 95
    detectedType = 'bedroom'
    labelText = 'Bedroom'
  } else if (text.includes('stair') || text.includes('stairs')) {
    ocrScore = 95
    detectedType = 'staircase'
    labelText = 'Stairs'
  } else if (text.includes('drawing') || text.includes('living') || text.includes('hall')) {
    ocrScore = 95
    detectedType = 'living_room'
    labelText = 'Drawing Room'
  } else if (text.includes('pooja') || text.includes('prayer')) {
    ocrScore = 95
    detectedType = 'pooja_room'
    labelText = 'Pooja Room'
  } else if (text.includes('balcony') || text.includes('terrace')) {
    ocrScore = 95
    detectedType = 'balcony'
    labelText = 'Balcony'
  } else if (text.includes('store')) {
    ocrScore = 95
    detectedType = 'store_room'
    labelText = 'Store Room'
  }

  // 2. Fixture Evidence Score (25% Weight)
  let fixtureScore = 50
  if (fixtures.includes('wc') || fixtures.includes('wash_basin') || fixtures.includes('shower')) {
    fixtureScore = 98
    if (ocrScore < 50) { detectedType = 'bathroom'; labelText = 'Bathroom'; }
  } else if (fixtures.includes('sink') || fixtures.includes('stove')) {
    fixtureScore = 95
    if (ocrScore < 50) { detectedType = 'kitchen'; labelText = 'Kitchen'; }
  } else if (fixtures.includes('staircase_flight')) {
    fixtureScore = 99
    if (ocrScore < 50) { detectedType = 'staircase'; labelText = 'Stairs'; }
  }

  // 3. Furniture Evidence Score (25% Weight)
  let furnitureScore = 50
  if (furniture.includes('bed') || furniture.includes('wardrobe')) {
    furnitureScore = 95
    if (ocrScore < 50 && fixtureScore < 60) { detectedType = 'bedroom'; labelText = 'Bedroom'; }
  } else if (furniture.includes('sofa') || furniture.includes('tv_unit')) {
    furnitureScore = 92
    if (ocrScore < 50 && fixtureScore < 60) { detectedType = 'living_room'; labelText = 'Living Room'; }
  }

  // 4. Adjacency Score (15% Weight)
  let adjScore = 80
  const adjTypes = params.adjacent_room_types || []
  if (detectedType === 'kitchen' && (adjTypes.includes('living_room') || adjTypes.includes('bathroom'))) {
    adjScore = 95
  } else if (detectedType === 'bathroom' && (adjTypes.includes('bedroom') || adjTypes.includes('kitchen'))) {
    adjScore = 95
  }

  // 5. Dimension & Soft Rules (10% Weight)
  let dimScore = 85
  if (detectedType === 'bathroom' && area >= 2.0 && area <= 8.0) dimScore = 98
  else if (detectedType === 'kitchen' && area >= 6.0 && area <= 20.0) dimScore = 98
  else if (detectedType === 'bedroom' && area >= 9.0 && area <= 30.0) dimScore = 98
  else if (detectedType === 'living_room' && area >= 12.0 && area <= 50.0) dimScore = 98

  // Weighted fusion calculation
  const overallScore = Math.round((
    (ocrScore * 0.25) +
    (furnitureScore * 0.25) +
    (fixtureScore * 0.25) +
    (adjScore * 0.15) +
    (dimScore * 0.10)
  ) * 10) / 1000 // 0.0 - 1.0

  // Graceful fallback: If overall score is too low, label as Unknown Room
  const finalType = overallScore < 0.40 ? 'unknown' : detectedType
  const finalLabel = overallScore < 0.40 ? 'Unknown Room' : labelText

  const rating = overallScore >= 0.90 ? 'High' : overallScore >= 0.75 ? 'Medium' : 'Low'

  return {
    classified_label: finalLabel,
    room_type: finalType,
    confidence: overallScore,
    evidence: {
      ocr_score: ocrScore,
      furniture_score: furnitureScore,
      fixture_score: fixtureScore,
      adjacency_score: adjScore,
      dimension_score: dimScore,
      detected_fixtures: fixtures,
      detected_furniture: furniture,
      ocr_text_found: params.ocr_text,
      confidence_rating: rating,
      overall_score: overallScore
    },
    candidates: [
      { room_type: finalType, label: finalLabel, confidence: overallScore },
      { room_type: 'living_room', label: 'Living Room', confidence: 0.20 },
      { room_type: 'bedroom', label: 'Bedroom', confidence: 0.15 }
    ]
  }
}
