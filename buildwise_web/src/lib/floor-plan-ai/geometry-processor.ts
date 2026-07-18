// ══════════════════════════════════════════════════════════════════════════════
// BuildWise AI — Floor Plan Understanding Engine
// Step 9: Geometry Validation & Post-Processing
// ══════════════════════════════════════════════════════════════════════════════

import type {
  FloorPlanAnalysisResult, AIRoom, AIWall, AIDoor, AIWindow,
  GeometryValidation, GeometryIssue, PixelPoint,
} from './types'

const GAP_THRESHOLD_PX = 8   // Max gap to auto-close between wall endpoints
const OVERLAP_TOLERANCE_PX2 = 100  // Min overlap area to flag as issue

// ── Polygon area via Shoelace formula ───────────────────────────────────────

function polygonArea(pts: PixelPoint[]): number {
  let area = 0
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length
    area += pts[i][0] * pts[j][1]
    area -= pts[j][0] * pts[i][1]
  }
  return Math.abs(area) / 2
}

// ── Point in polygon test ───────────────────────────────────────────────────

function pointInPolygon(pt: PixelPoint, poly: PixelPoint[]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1]
    const xj = poly[j][0], yj = poly[j][1]
    if (yi > pt[1] !== yj > pt[1] && pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

// ── Polygon centroid ────────────────────────────────────────────────────────

function polygonCentroid(pts: PixelPoint[]): PixelPoint {
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length
  const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length
  return [cx, cy]
}

// ── Check if two polygons overlap ──────────────────────────────────────────

function polygonsOverlap(polyA: PixelPoint[], polyB: PixelPoint[]): boolean {
  // Quick test: check if any vertex of B is inside A or vice versa
  const centB = polygonCentroid(polyB)
  if (pointInPolygon(centB, polyA)) return true
  const centA = polygonCentroid(polyA)
  if (pointInPolygon(centA, polyB)) return true
  return false
}

// ── Validate polygon is closed and has enough vertices ─────────────────────

function isPolygonValid(pts: PixelPoint[]): boolean {
  if (!pts || pts.length < 3) return false
  // Check for NaN or zero coords
  return pts.every(([x, y]) => isFinite(x) && isFinite(y))
}

// ── Compute bounding box from polygon ──────────────────────────────────────

function polygonBoundingBox(pts: PixelPoint[]): [number, number, number, number] {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const [x, y] of pts) {
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
  }
  return [minX, minY, maxX - minX, maxY - minY]
}

// ── Fix degenerate polygons ─────────────────────────────────────────────────

function sanitizePolygon(pts: PixelPoint[], fallbackCentroid: PixelPoint, fallbackSize: number = 60): PixelPoint[] {
  // Remove duplicate consecutive points
  const deduped = pts.filter((pt, i) => {
    if (i === 0) return true
    return pt[0] !== pts[i - 1][0] || pt[1] !== pts[i - 1][1]
  })

  if (deduped.length >= 3) return deduped

  // Fallback: generate a rectangle around the centroid
  const [cx, cy] = fallbackCentroid
  const s = fallbackSize
  return [
    [cx - s, cy - s],
    [cx + s, cy - s],
    [cx + s, cy + s],
    [cx - s, cy + s],
  ]
}

// ── Validate and correct walls ──────────────────────────────────────────────

function validateWalls(walls: AIWall[], issues: GeometryIssue[]): AIWall[] {
  const validWalls = walls.filter(w => {
    const dx = w.end[0] - w.start[0]
    const dy = w.end[1] - w.start[1]
    const len = Math.sqrt(dx * dx + dy * dy)
    if (len < 5) {
      issues.push({
        type: 'floating_wall',
        severity: 'warning',
        element_ids: [w.id],
        description: `Wall ${w.id} is too short (${len.toFixed(1)}px) and was removed`,
        auto_corrected: true,
      })
      return false
    }
    return true
  })
  return validWalls
}

// ── Associate doors/windows with walls ─────────────────────────────────────

function associateDoorsWithWalls(doors: AIDoor[], walls: AIWall[], issues: GeometryIssue[]): AIDoor[] {
  return doors.map(door => {
    if (door.wall_id) return door

    // Find nearest wall
    let nearestWallId: string | null = null
    let minDist = Infinity

    for (const wall of walls) {
      const [cx, cy] = door.center
      // Distance from point to line segment
      const dx = wall.end[0] - wall.start[0]
      const dy = wall.end[1] - wall.start[1]
      const lenSq = dx * dx + dy * dy
      let t = lenSq > 0
        ? ((cx - wall.start[0]) * dx + (cy - wall.start[1]) * dy) / lenSq
        : 0
      t = Math.max(0, Math.min(1, t))
      const px = wall.start[0] + t * dx
      const py = wall.start[1] + t * dy
      const dist = Math.sqrt((cx - px) ** 2 + (cy - py) ** 2)

      if (dist < minDist) {
        minDist = dist
        nearestWallId = wall.id
      }
    }

    if (nearestWallId && minDist < 50) {
      return { ...door, wall_id: nearestWallId }
    }

    if (minDist >= 50) {
      issues.push({
        type: 'orphan_door',
        severity: 'warning',
        element_ids: [door.id],
        description: `Door ${door.id} could not be associated with any wall (nearest: ${minDist.toFixed(1)}px away)`,
        auto_corrected: false,
      })
    }

    return door
  })
}

// ── Main Geometry Validation ────────────────────────────────────────────────

export function validateAndCorrectGeometry(
  result: Omit<FloorPlanAnalysisResult, 'image_enhancement' | 'geometry_validation'>
): GeometryValidation {
  const issues: GeometryIssue[] = []
  let autoCorrections = 0

  // 1. Validate room polygons
  const validatedRooms = result.rooms.map(room => {
    const polygon = room.polygon
    if (!isPolygonValid(polygon)) {
      issues.push({
        type: 'unclosed_polygon',
        severity: 'warning',
        element_ids: [room.id],
        description: `Room ${room.label} (${room.id}) has invalid polygon — auto-generating fallback rectangle`,
        auto_corrected: true,
      })
      autoCorrections++
      room.polygon = sanitizePolygon(polygon, room.centroid)
    }
    return room
  })

  // 2. Check for overlapping rooms
  for (let i = 0; i < validatedRooms.length; i++) {
    for (let j = i + 1; j < validatedRooms.length; j++) {
      const a = validatedRooms[i]
      const b = validatedRooms[j]
      if (polygonsOverlap(a.polygon, b.polygon)) {
        const areaA = polygonArea(a.polygon)
        const areaB = polygonArea(b.polygon)
        if (Math.min(areaA, areaB) > OVERLAP_TOLERANCE_PX2) {
          issues.push({
            type: 'overlapping_rooms',
            severity: 'warning',
            element_ids: [a.id, b.id],
            description: `Rooms "${a.label}" and "${b.label}" have overlapping boundaries`,
            auto_corrected: false,
          })
        }
      }
    }
  }

  // 3. Validate walls
  validateWalls(result.walls, issues)

  // 4. Associate orphan doors/windows with walls
  associateDoorsWithWalls(result.doors, result.walls, issues)

  return {
    is_valid: issues.filter(i => i.severity === 'error').length === 0,
    issues,
    rooms_validated: validatedRooms.length,
    walls_validated: result.walls.length,
    auto_corrections_applied: autoCorrections,
  }
}

// ── Build Room Adjacency Graph ──────────────────────────────────────────────

export function buildAdjacencyGraph(rooms: AIRoom[]): Map<string, string[]> {
  const graph = new Map<string, string[]>()
  rooms.forEach(r => graph.set(r.id, []))

  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const a = rooms[i]
      const b = rooms[j]
      // Check if centroids suggest adjacency (shared wall means centroids are close relative to room sizes)
      const dx = a.centroid[0] - b.centroid[0]
      const dy = a.centroid[1] - b.centroid[1]
      const dist = Math.sqrt(dx * dx + dy * dy)
      const maxDim = Math.max(
        Math.sqrt(polygonArea(a.polygon)),
        Math.sqrt(polygonArea(b.polygon))
      )
      if (dist < maxDim * 2.5) {
        graph.get(a.id)!.push(b.id)
        graph.get(b.id)!.push(a.id)
      }
    }
  }

  return graph
}

// ── Estimate pixel-per-meter from room sizes ────────────────────────────────
// Used as fallback when Gemini couldn't detect the scale

export function estimatePxPerMeterFromRooms(rooms: AIRoom[]): number {
  // Use known average room sizes as reference:
  // Bedroom ≈ 12 m², Living Room ≈ 18 m², Kitchen ≈ 10 m², Bathroom ≈ 5 m²
  const TYPICAL_AREAS: Record<string, number> = {
    bedroom: 12,
    master_bedroom: 16,
    living_room: 20,
    kitchen: 10,
    bathroom: 5,
    toilet: 3.5,
    dining_room: 14,
    passage: 5,
    balcony: 6,
  }

  let totalRatio = 0
  let count = 0

  for (const room of rooms) {
    const typicalM2 = TYPICAL_AREAS[room.room_type]
    if (!typicalM2 || room.polygon.length < 3) continue
    const areaPx2 = polygonArea(room.polygon)
    if (areaPx2 <= 0) continue
    const ratio = Math.sqrt(areaPx2 / typicalM2)
    totalRatio += ratio
    count++
  }

  if (count === 0) return 50  // Default: 50px = 1m (1:50 scale at 96dpi)
  return totalRatio / count
}
