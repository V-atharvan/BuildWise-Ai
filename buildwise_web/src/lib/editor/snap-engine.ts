/**
 * CAD Snap Engine & Spatial Indexing - BuildWise AI
 *
 * Implements AutoCAD/Revit/Figma/Blender-style intelligent snapping:
 * - Spatial Hash Grid for O(1) spatial queries (< 2ms lookup at 60 FPS)
 * - Priority Cascade: Endpoint -> Vertex -> Intersection -> Midpoint -> Ortho Angle -> Grid
 * - Screen-space zoom independence
 */

import type { AIRoom, AIWall } from '@/lib/floor-plan-ai/types'

export type SnapType = 'endpoint' | 'vertex' | 'intersection' | 'midpoint' | 'ortho_angle' | 'grid' | 'magnetic_edge'

export interface SnapTarget {
  type: SnapType
  point: [number, number]
  distancePx: number
  label: string
  color: string
  sourceId?: string
  angleDeg?: number
  guideSegment?: { p1: [number, number]; p2: [number, number] }
}

export interface SnapConfig {
  enabled: boolean
  snapRadiusPx: number // Screen pixels (default 8)
  enableEndpoint: boolean
  enableMidpoint: boolean
  enableIntersection: boolean
  enableOrthoAngle: boolean
  enableGrid: boolean
  gridSizeMm: number // e.g. 100mm
}

export const DEFAULT_SNAP_CONFIG: SnapConfig = {
  enabled: true,
  snapRadiusPx: 6, // Subtle, precise attraction (6px screen radius)
  enableEndpoint: true,
  enableMidpoint: true,
  enableIntersection: true,
  enableOrthoAngle: true,
  enableGrid: true,
  gridSizeMm: 100,
}

/**
 * Spatial Hash Grid for fast 2D spatial queries
 */
export class SpatialHashGrid {
  private cellSize: number
  private grid: Map<string, { id: string; point: [number, number]; type: 'endpoint' | 'vertex' | 'midpoint'; sourceId?: string }[]>

  constructor(cellSize: number = 50) {
    this.cellSize = cellSize
    this.grid = new Map()
  }

  private getKey(x: number, y: number): string {
    const cx = Math.floor(x / this.cellSize)
    const cy = Math.floor(y / this.cellSize)
    return `${cx}:${cy}`
  }

  clear() {
    this.grid.clear()
  }

  insertPoint(id: string, point: [number, number], type: 'endpoint' | 'vertex' | 'midpoint', sourceId?: string) {
    const key = this.getKey(point[0], point[1])
    if (!this.grid.has(key)) {
      this.grid.set(key, [])
    }
    this.grid.get(key)!.push({ id, point, type, sourceId })
  }

  getNearbyPoints(point: [number, number], radius: number) {
    const minCx = Math.floor((point[0] - radius) / this.cellSize)
    const maxCx = Math.floor((point[0] + radius) / this.cellSize)
    const minCy = Math.floor((point[1] - radius) / this.cellSize)
    const maxCy = Math.floor((point[1] + radius) / this.cellSize)

    const results: { id: string; point: [number, number]; type: 'endpoint' | 'vertex' | 'midpoint'; sourceId?: string }[] = []

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const key = `${cx}:${cy}`
        const cell = this.grid.get(key)
        if (cell) {
          results.push(...cell)
        }
      }
    }
    return results
  }
}

/**
 * Calculates geometric line-line intersection point if lines intersect
 */
export function getLineIntersection(
  line1: { p1: [number, number]; p2: [number, number] },
  line2: { p1: [number, number]; p2: [number, number] }
): [number, number] | null {
  const [x1, y1] = line1.p1
  const [x2, y2] = line1.p2
  const [x3, y3] = line2.p1
  const [x4, y4] = line2.p2

  const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1)
  if (Math.abs(denom) < 1e-6) return null // Parallel lines

  const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom
  const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom

  if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
    const ix = x1 + ua * (x2 - x1)
    const iy = y1 + ua * (y2 - y1)
    return [ix, iy]
  }
  return null
}

function pointToSegmentDistance(
  pt: [number, number],
  p1: [number, number],
  p2: [number, number]
): { dist: number; proj: [number, number] } {
  const [x, y] = pt
  const [x1, y1] = p1
  const [x2, y2] = p2
  const dx = x2 - x1
  const dy = y2 - y1
  const lenSq = dx * dx + dy * dy
  let t = lenSq > 0 ? ((x - x1) * dx + (y - y1) * dy) / lenSq : 0
  t = Math.max(0, Math.min(1, t))
  const px = x1 + t * dx
  const py = y1 + t * dy
  return { dist: Math.hypot(x - px, y - py), proj: [px, py] }
}

/**
 * Main Priority Cascade Snap Solver
 */
export function findNearestSnapTarget(
  mouseWorldPoint: [number, number],
  rooms: AIRoom[],
  walls: AIWall[],
  zoom: number,
  pxPerMeter: number,
  config: SnapConfig = DEFAULT_SNAP_CONFIG,
  activeStartPoint?: [number, number] | null
): SnapTarget | null {
  if (!config.enabled) return null

  // Zoom-scaled snap radius in world image coordinates
  const worldRadius = config.snapRadiusPx / Math.max(0.1, zoom)
  const [mx, my] = mouseWorldPoint

  // Populate Spatial Hash Grid
  const spatialGrid = new SpatialHashGrid(Math.max(50, worldRadius * 4))

  // Index wall endpoints & midpoints
  walls.forEach(w => {
    if (w.start) {
      spatialGrid.insertPoint(`${w.id}_start`, w.start, 'endpoint', w.id)
    }
    if (w.end) {
      spatialGrid.insertPoint(`${w.id}_end`, w.end, 'endpoint', w.id)
    }
    if (w.start && w.end) {
      const mid: [number, number] = [(w.start[0] + w.end[0]) / 2, (w.start[1] + w.end[1]) / 2]
      spatialGrid.insertPoint(`${w.id}_mid`, mid, 'midpoint', w.id)
    }
  })

  // Index room polygon vertices
  rooms.forEach(r => {
    if (r.polygon) {
      r.polygon.forEach((pt, idx) => {
        spatialGrid.insertPoint(`${r.id}_v${idx}`, pt, 'vertex', r.id)
      })
    }
  })

  // 0. MAGNETIC EDGE ATTRACTION (5px attraction tolerance)
  const magRadiusWorld = 5 / Math.max(0.1, zoom)
  let bestMagnetic: SnapTarget | null = null
  let minMagDist = magRadiusWorld

  const allSegments: { p1: [number, number]; p2: [number, number]; id: string }[] = []
  rooms.forEach(r => {
    const poly = r.polygon || []
    for (let i = 0; i < poly.length; i++) {
      allSegments.push({ p1: poly[i], p2: poly[(i + 1) % poly.length], id: r.id })
    }
  })
  walls.forEach(w => {
    if (w.start && w.end) {
      allSegments.push({ p1: w.start, p2: w.end, id: w.id })
    }
  })

  for (const seg of allSegments) {
    const { dist, proj } = pointToSegmentDistance(mouseWorldPoint, seg.p1, seg.p2)
    if (dist < minMagDist) {
      minMagDist = dist
      bestMagnetic = {
        type: 'magnetic_edge',
        point: proj,
        distancePx: dist * zoom,
        label: 'Magnetic Edge Snap',
        color: '#A855F7',
        sourceId: seg.id,
        guideSegment: { p1: seg.p1, p2: seg.p2 },
      }
    }
  }

  // 1. ENDPOINT SNAP (Priority 1)
  if (config.enableEndpoint) {
    const candidatePoints = spatialGrid.getNearbyPoints(mouseWorldPoint, worldRadius)
    let bestEndpoint: SnapTarget | null = null
    let minDist = worldRadius
    for (const cand of candidatePoints) {
      if (cand.type === 'endpoint') {
        const dist = Math.hypot(cand.point[0] - mx, cand.point[1] - my)
        if (dist < minDist) {
          minDist = dist
          bestEndpoint = {
            type: 'endpoint',
            point: cand.point,
            distancePx: dist * zoom,
            label: 'Endpoint',
            color: '#3B82F6', // Blue
            sourceId: cand.sourceId,
          }
        }
      }
    }
    if (bestEndpoint) return bestEndpoint
  }

  // 2. EXISTING VERTEX SNAP (Priority 2)
  if (config.enableEndpoint) {
    const candidatePoints = spatialGrid.getNearbyPoints(mouseWorldPoint, worldRadius)
    let bestVertex: SnapTarget | null = null
    let minDist = worldRadius
    for (const cand of candidatePoints) {
      if (cand.type === 'vertex') {
        const dist = Math.hypot(cand.point[0] - mx, cand.point[1] - my)
        if (dist < minDist) {
          minDist = dist
          bestVertex = {
            type: 'vertex',
            point: cand.point,
            distancePx: dist * zoom,
            label: 'Vertex',
            color: '#A855F7', // Purple
            sourceId: cand.sourceId,
          }
        }
      }
    }
    if (bestVertex) return bestVertex
  }

  // 3. WALL INTERSECTION SNAP (Priority 3)
  if (config.enableIntersection) {
    let bestIntersection: SnapTarget | null = null
    let minDist = worldRadius

    for (let i = 0; i < walls.length; i++) {
      for (let j = i + 1; j < walls.length; j++) {
        const w1 = walls[i]
        const w2 = walls[j]
        if (w1.start && w1.end && w2.start && w2.end) {
          const ix = getLineIntersection(
            { p1: w1.start, p2: w1.end },
            { p1: w2.start, p2: w2.end }
          )
          if (ix) {
            const dist = Math.hypot(ix[0] - mx, ix[1] - my)
            if (dist < minDist) {
              minDist = dist
              bestIntersection = {
                type: 'intersection',
                point: ix,
                distancePx: dist * zoom,
                label: 'Intersection',
                color: '#F97316', // Orange
              }
            }
          }
        }
      }
    }
    if (bestIntersection) return bestIntersection
  }

  // 4. MIDPOINT SNAP (Priority 4)
  if (config.enableMidpoint) {
    const candidatePoints = spatialGrid.getNearbyPoints(mouseWorldPoint, worldRadius)
    let bestMidpoint: SnapTarget | null = null
    let minDist = worldRadius

    for (const cand of candidatePoints) {
      if (cand.type === 'midpoint') {
        const dist = Math.hypot(cand.point[0] - mx, cand.point[1] - my)
        if (dist < minDist) {
          minDist = dist
          bestMidpoint = {
            type: 'midpoint',
            point: cand.point,
            distancePx: dist * zoom,
            label: 'Midpoint',
            color: '#10B981', // Green
            sourceId: cand.sourceId,
          }
        }
      }
    }
    if (bestMidpoint) return bestMidpoint
  }

  // 5. ORTHOGONAL ANGLE SNAP (Priority 5 - when drawing/moving relative to active start point)
  if (config.enableOrthoAngle && activeStartPoint) {
    const dx = mx - activeStartPoint[0]
    const dy = my - activeStartPoint[1]
    const dist = Math.hypot(dx, dy)

    if (dist > 5) {
      let angleRad = Math.atan2(dy, dx)
      let angleDeg = (angleRad * 180) / Math.PI
      if (angleDeg < 0) angleDeg += 360

      const orthoAngles = [0, 45, 90, 135, 180, 225, 270, 315, 360]
      const toleranceDeg = 5.0

      for (const targetDeg of orthoAngles) {
        const diff = Math.abs(angleDeg - targetDeg)
        if (diff <= toleranceDeg || Math.abs(diff - 360) <= toleranceDeg) {
          const rad = (targetDeg * Math.PI) / 180
          const snappedX = activeStartPoint[0] + dist * Math.cos(rad)
          const snappedY = activeStartPoint[1] + dist * Math.sin(rad)
          return {
            type: 'ortho_angle',
            point: [snappedX, snappedY],
            distancePx: Math.abs(angleDeg - targetDeg) * zoom,
            label: `${targetDeg % 360}° Ortho`,
            color: '#EAB308', // Yellow
            angleDeg: targetDeg % 360,
          }
        }
      }
    }
  }

  // 6. GRID SNAP (Priority 6)
  if (config.enableGrid && config.gridSizeMm > 0) {
    const gridPx = (config.gridSizeMm / 1000) * pxPerMeter
    if (gridPx > 2) {
      const gx = Math.round(mx / gridPx) * gridPx
      const gy = Math.round(my / gridPx) * gridPx
      const dist = Math.hypot(gx - mx, gy - my)
      if (dist < worldRadius) {
        return {
          type: 'grid',
          point: [gx, gy],
          distancePx: dist * zoom,
          label: `Grid ${config.gridSizeMm}mm`,
          color: '#64748B', // Slate
        }
      }
    }
  }

  if (bestMagnetic) return bestMagnetic
  return null
}

// ── Canva Smart Edge Alignment & Magnetism ─────────────────────────────────

export interface CanvaAlignmentResult {
  snappedPos: number
  guideSegment?: { p1: [number, number]; p2: [number, number] }
  label: string
}

export function findCanvaEdgeMagneticSnap(
  handle: 'top' | 'bottom' | 'left' | 'right',
  currentVal: number,
  initialBounds: { minX: number; maxX: number; minY: number; maxY: number },
  rooms: AIRoom[],
  walls: AIWall[],
  ignoreRoomId: string,
  tolerancePx: number = 8
): CanvaAlignmentResult | null {
  const isVertical = handle === 'left' || handle === 'right'
  let bestDist = tolerancePx
  let bestVal: number | null = null
  let bestGuide: { p1: [number, number]; p2: [number, number] } | null = null
  let bestLabel = ''

  const targets: { coord: number; minOther: number; maxOther: number; label: string }[] = []

  rooms.forEach(r => {
    if (r.id === ignoreRoomId || !r.polygon) return
    const poly = r.polygon
    for (let i = 0; i < poly.length; i++) {
      const p1 = poly[i]
      const p2 = poly[(i + 1) % poly.length]

      if (isVertical && Math.abs(p1[0] - p2[0]) < 1e-3) {
        const targetX = p1[0]
        const minY = Math.min(p1[1], p2[1])
        const maxY = Math.max(p1[1], p2[1])
        targets.push({ coord: targetX, minOther: minY, maxOther: maxY, label: `Boundary Snap` })
      } else if (!isVertical && Math.abs(p1[1] - p2[1]) < 1e-3) {
        const targetY = p1[1]
        const minX = Math.min(p1[0], p2[0])
        const maxX = Math.max(p1[0], p2[0])
        targets.push({ coord: targetY, minOther: minX, maxOther: maxX, label: `Boundary Snap` })
      }
    }
  })

  walls.forEach(w => {
    if (!w.start || !w.end) return
    if (isVertical && Math.abs(w.start[0] - w.end[0]) < 1e-3) {
      const targetX = w.start[0]
      const minY = Math.min(w.start[1], w.end[1])
      const maxY = Math.max(w.start[1], w.end[1])
      targets.push({ coord: targetX, minOther: minY, maxOther: maxY, label: 'Wall Alignment' })
    } else if (!isVertical && Math.abs(w.start[1] - w.end[1]) < 1e-3) {
      const targetY = w.start[1]
      const minX = Math.min(w.start[0], w.end[0])
      const maxX = Math.max(w.start[0], w.end[0])
      targets.push({ coord: targetY, minOther: minX, maxOther: maxX, label: 'Wall Alignment' })
    }
  })

  for (const t of targets) {
    const dist = Math.abs(currentVal - t.coord)
    if (dist < bestDist) {
      bestDist = dist
      bestVal = t.coord
      bestLabel = t.label
      if (isVertical) {
        const guideMinY = Math.min(initialBounds.minY, t.minOther) - 15
        const guideMaxY = Math.max(initialBounds.maxY, t.maxOther) + 15
        bestGuide = { p1: [t.coord, guideMinY], p2: [t.coord, guideMaxY] }
      } else {
        const guideMinX = Math.min(initialBounds.minX, t.minOther) - 15
        const guideMaxX = Math.max(initialBounds.maxX, t.maxOther) + 15
        bestGuide = { p1: [guideMinX, t.coord], p2: [guideMaxX, t.coord] }
      }
    }
  }

  if (bestVal !== null && bestGuide) {
    return { snappedPos: bestVal, guideSegment: bestGuide, label: bestLabel }
  }
  return null
}

// ── Door & Window Wall Line Magnetism ───────────────────────────────────────

export interface DoorWindowSnapResult {
  center: [number, number]
  guideSegment: { p1: [number, number]; p2: [number, number] }
  label: string
}

export function findDoorWindowSnapTarget(
  mousePos: [number, number],
  rooms: AIRoom[],
  walls: AIWall[],
  tolerancePx: number = 14
): DoorWindowSnapResult | null {
  const allSegments: { p1: [number, number]; p2: [number, number]; id: string; label: string }[] = []

  rooms.forEach(r => {
    const poly = r.polygon || []
    for (let i = 0; i < poly.length; i++) {
      allSegments.push({
        p1: poly[i],
        p2: poly[(i + 1) % poly.length],
        id: r.id,
        label: `Boundary of ${r.label}`,
      })
    }
  })

  walls.forEach(w => {
    if (w.start && w.end) {
      allSegments.push({ p1: w.start, p2: w.end, id: w.id, label: 'Wall Vector' })
    }
  })

  let bestDist = tolerancePx
  let bestResult: DoorWindowSnapResult | null = null

  for (const seg of allSegments) {
    const { dist, proj } = pointToSegmentDistance(mousePos, seg.p1, seg.p2)
    if (dist < bestDist) {
      bestDist = dist
      bestResult = {
        center: [Math.round(proj[0]), Math.round(proj[1])],
        guideSegment: { p1: seg.p1, p2: seg.p2 },
        label: seg.label,
      }
    }
  }

  return bestResult
}
