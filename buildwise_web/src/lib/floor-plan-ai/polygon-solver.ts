// ══════════════════════════════════════════════════════════════════════════════
// BuildWise AI — Floor Plan Understanding Engine
// Polygon Constraint Solver — Fixes overlaps, gaps, and alignment issues
// ══════════════════════════════════════════════════════════════════════════════

import type {
  AIRoom, AIWall, PixelPoint, PolygonSolverResult
} from './types'

// ── Configuration ─────────────────────────────────────────────────────────────

const SNAP_THRESHOLD_PX = 15        // Max distance to snap vertices together
const WALL_ALIGN_THRESHOLD_PX = 20  // Max distance to snap edge to wall
const GAP_THRESHOLD_PX = 25         // Max gap width to auto-fill
const ANGLE_REGULARIZE_DEG = 5      // Straighten edges within this angle of axis
const AREA_CHANGE_LIMIT = 0.08      // Max 8% total area change allowed

// ── Vector Math Helpers ───────────────────────────────────────────────────────

function dist(a: PixelPoint, b: PixelPoint): number {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2)
}

function polygonArea(pts: PixelPoint[]): number {
  let area = 0
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length
    area += pts[i][0] * pts[j][1]
    area -= pts[j][0] * pts[i][1]
  }
  return Math.abs(area) / 2
}

function polygonCentroid(pts: PixelPoint[]): PixelPoint {
  if (pts.length === 0) return [0, 0]
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length
  const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length
  return [cx, cy]
}

function pointToSegmentDist(
  pt: PixelPoint, segA: PixelPoint, segB: PixelPoint
): { dist: number; projection: PixelPoint; t: number } {
  const dx = segB[0] - segA[0]
  const dy = segB[1] - segA[1]
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) {
    const d = dist(pt, segA)
    return { dist: d, projection: [...segA] as PixelPoint, t: 0 }
  }
  let t = ((pt[0] - segA[0]) * dx + (pt[1] - segA[1]) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))
  const proj: PixelPoint = [segA[0] + t * dx, segA[1] + t * dy]
  return { dist: dist(pt, proj), projection: proj, t }
}

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

// ── Sutherland-Hodgman Polygon Clipping ───────────────────────────────────────

function lineIntersection(
  p1: PixelPoint, p2: PixelPoint,
  p3: PixelPoint, p4: PixelPoint
): PixelPoint | null {
  const d1x = p2[0] - p1[0], d1y = p2[1] - p1[1]
  const d2x = p4[0] - p3[0], d2y = p4[1] - p3[1]
  const cross = d1x * d2y - d1y * d2x
  if (Math.abs(cross) < 1e-10) return null
  const t = ((p3[0] - p1[0]) * d2y - (p3[1] - p1[1]) * d2x) / cross
  return [p1[0] + t * d1x, p1[1] + t * d1y]
}

function isInsideEdge(pt: PixelPoint, edgeA: PixelPoint, edgeB: PixelPoint): boolean {
  return (edgeB[0] - edgeA[0]) * (pt[1] - edgeA[1]) - (edgeB[1] - edgeA[1]) * (pt[0] - edgeA[0]) >= 0
}

function clipPolygon(subject: PixelPoint[], clip: PixelPoint[]): PixelPoint[] {
  let output = [...subject]
  if (output.length === 0 || clip.length === 0) return []

  for (let i = 0; i < clip.length; i++) {
    if (output.length === 0) return []
    const edgeA = clip[i]
    const edgeB = clip[(i + 1) % clip.length]
    const input = [...output]
    output = []

    for (let j = 0; j < input.length; j++) {
      const current = input[j]
      const prev = input[(j + input.length - 1) % input.length]
      const currInside = isInsideEdge(current, edgeA, edgeB)
      const prevInside = isInsideEdge(prev, edgeA, edgeB)

      if (currInside) {
        if (!prevInside) {
          const inter = lineIntersection(prev, current, edgeA, edgeB)
          if (inter) output.push(inter)
        }
        output.push(current)
      } else if (prevInside) {
        const inter = lineIntersection(prev, current, edgeA, edgeB)
        if (inter) output.push(inter)
      }
    }
  }
  return output
}

// Invert polygon winding for subtraction
function invertWinding(poly: PixelPoint[]): PixelPoint[] {
  return [...poly].reverse()
}

// ══════════════════════════════════════════════════════════════════════════════
// STEP 1: VERTEX SNAPPING
// Snap room polygon vertices that are very close to each other so adjacent
// rooms share exact coordinates instead of nearly-overlapping ones.
// ══════════════════════════════════════════════════════════════════════════════

function snapVertices(rooms: AIRoom[], threshold: number): number {
  // Collect ALL vertices from ALL rooms
  const allVertices: { roomIdx: number; vertIdx: number; pt: PixelPoint }[] = []
  rooms.forEach((room, ri) => {
    room.polygon.forEach((pt, vi) => {
      allVertices.push({ roomIdx: ri, vertIdx: vi, pt: [...pt] as PixelPoint })
    })
  })

  let snappedCount = 0

  // Group nearby vertices — sort by X for efficient neighbor search
  allVertices.sort((a, b) => a.pt[0] - b.pt[0])

  const merged = new Map<number, PixelPoint>() // flat index → snapped coord

  for (let i = 0; i < allVertices.length; i++) {
    const vi = allVertices[i]
    const key_i = vi.roomIdx * 10000 + vi.vertIdx

    if (merged.has(key_i)) continue

    // Find all vertices within threshold (using X-sort to limit search window)
    const cluster: typeof allVertices = [vi]

    for (let j = i + 1; j < allVertices.length; j++) {
      const vj = allVertices[j]
      // X-distance pruning
      if (vj.pt[0] - vi.pt[0] > threshold) break

      // Skip same room
      if (vj.roomIdx === vi.roomIdx) continue

      const d = dist(vi.pt, vj.pt)
      if (d < threshold && d > 0) {
        cluster.push(vj)
      }
    }

    if (cluster.length > 1) {
      // Compute average position for the cluster
      const avgX = cluster.reduce((s, v) => s + v.pt[0], 0) / cluster.length
      const avgY = cluster.reduce((s, v) => s + v.pt[1], 0) / cluster.length
      const snapPt: PixelPoint = [Math.round(avgX), Math.round(avgY)]

      for (const v of cluster) {
        const key = v.roomIdx * 10000 + v.vertIdx
        if (!merged.has(key)) {
          rooms[v.roomIdx].polygon[v.vertIdx] = [...snapPt]
          merged.set(key, snapPt)
          snappedCount++
        }
      }
    }
  }

  return snappedCount
}

// ══════════════════════════════════════════════════════════════════════════════
// STEP 2: WALL-EDGE ALIGNMENT
// Snap room polygon edges to nearby detected wall lines, so rooms are
// bounded by actual walls instead of approximate lines.
// ══════════════════════════════════════════════════════════════════════════════

function alignEdgesToWalls(rooms: AIRoom[], walls: AIWall[], threshold: number): number {
  if (walls.length === 0) return 0
  let alignedCount = 0

  for (const room of rooms) {
    for (let i = 0; i < room.polygon.length; i++) {
      const ptA = room.polygon[i]
      const ptB = room.polygon[(i + 1) % room.polygon.length]

      // Edge midpoint
      const mid: PixelPoint = [(ptA[0] + ptB[0]) / 2, (ptA[1] + ptB[1]) / 2]

      // Find nearest wall to this edge
      let bestWall: AIWall | null = null
      let bestDist = Infinity

      for (const wall of walls) {
        const { dist: d } = pointToSegmentDist(mid, wall.start, wall.end)
        if (d < bestDist) {
          bestDist = d
          bestWall = wall
        }
      }

      if (bestWall && bestDist < threshold) {
        // Project both edge endpoints onto the wall line
        const projA = pointToSegmentDist(ptA, bestWall.start, bestWall.end)
        const projB = pointToSegmentDist(ptB, bestWall.start, bestWall.end)

        // Only snap if both endpoints are reasonably close to the wall
        if (projA.dist < threshold * 1.5 && projB.dist < threshold * 1.5) {
          // Snap to wall line — offset by half wall thickness toward room centroid
          const centroid = polygonCentroid(room.polygon)
          const wallDx = bestWall.end[0] - bestWall.start[0]
          const wallDy = bestWall.end[1] - bestWall.start[1]
          const wallLen = Math.sqrt(wallDx * wallDx + wallDy * wallDy)

          if (wallLen > 0) {
            // Normal vector of wall (pointing toward room centroid)
            let nx = -wallDy / wallLen
            let ny = wallDx / wallLen

            // Ensure normal points toward room centroid
            const wallMid: PixelPoint = [
              (bestWall.start[0] + bestWall.end[0]) / 2,
              (bestWall.start[1] + bestWall.end[1]) / 2
            ]
            const toCentroidX = centroid[0] - wallMid[0]
            const toCentroidY = centroid[1] - wallMid[1]
            if (nx * toCentroidX + ny * toCentroidY < 0) {
              nx = -nx
              ny = -ny
            }

            // Offset by half wall thickness
            const offset = (bestWall.thickness_px || 10) / 2

            room.polygon[i] = [
              Math.round(projA.projection[0] + nx * offset),
              Math.round(projA.projection[1] + ny * offset)
            ]
            room.polygon[(i + 1) % room.polygon.length] = [
              Math.round(projB.projection[0] + nx * offset),
              Math.round(projB.projection[1] + ny * offset)
            ]
            alignedCount++
          }
        }
      }
    }
  }

  return alignedCount
}

// ══════════════════════════════════════════════════════════════════════════════
// STEP 3: OVERLAP RESOLUTION
// When two room polygons overlap, compute the intersection and assign it
// to the room whose centroid is closer, trimming the other.
// ══════════════════════════════════════════════════════════════════════════════

function resolveOverlaps(rooms: AIRoom[]): number {
  let resolvedCount = 0

  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const polyA = rooms[i].polygon
      const polyB = rooms[j].polygon

      if (polyA.length < 3 || polyB.length < 3) continue

      // Quick check: do centroids of either fall inside the other?
      const centA = polygonCentroid(polyA)
      const centB = polygonCentroid(polyB)

      const aInB = pointInPolygon(centA, polyB)
      const bInA = pointInPolygon(centB, polyA)

      if (!aInB && !bInA) {
        // Check if any vertices cross
        const anyAinB = polyA.some(pt => pointInPolygon(pt, polyB))
        const anyBinA = polyB.some(pt => pointInPolygon(pt, polyA))
        if (!anyAinB && !anyBinA) continue
      }

      // Compute intersection
      const intersection = clipPolygon(polyA, polyB)
      if (intersection.length < 3) continue

      const interArea = polygonArea(intersection)
      const areaA = polygonArea(polyA)
      const areaB = polygonArea(polyB)

      // Only resolve if overlap is significant (> 2% of smaller room)
      const smallerArea = Math.min(areaA, areaB)
      if (interArea < smallerArea * 0.02) continue

      // Determine which room "owns" the overlap
      // The larger room loses the overlapping area
      const interCentroid = polygonCentroid(intersection)
      const distToA = dist(interCentroid, centA)
      const distToB = dist(interCentroid, centB)

      // The room whose centroid is FURTHER from the overlap centroid gets trimmed
      const trimIdx = distToA > distToB ? i : j
      const keepIdx = distToA > distToB ? j : i

      // Subtract the intersection from the trimmed room
      // Use clipping against the inverted keep polygon
      const keepPoly = rooms[keepIdx].polygon
      const trimPoly = rooms[trimIdx].polygon

      // Simple subtraction: clip the trim polygon against the inverted keep polygon
      // This is approximated by removing vertices that fall inside the keep polygon
      // and replacing them with intersection boundary points
      const newTrimPoly = subtractPolygon(trimPoly, keepPoly)

      if (newTrimPoly.length >= 3) {
        rooms[trimIdx].polygon = newTrimPoly
        resolvedCount++
      }
    }
  }

  return resolvedCount
}

/**
 * Approximate polygon subtraction: A - B
 * Returns the portion of polygon A that is outside polygon B.
 */
function subtractPolygon(subject: PixelPoint[], clip: PixelPoint[]): PixelPoint[] {
  // Approach: Walk around subject polygon. For each edge:
  // - If both endpoints are outside clip: keep the edge
  // - If going from outside to inside: keep entry point up to intersection
  // - If going from inside to outside: start keeping from intersection
  // - If both inside: skip

  const result: PixelPoint[] = []

  for (let i = 0; i < subject.length; i++) {
    const curr = subject[i]
    const next = subject[(i + 1) % subject.length]
    const currInside = pointInPolygon(curr, clip)
    const nextInside = pointInPolygon(next, clip)

    if (!currInside) {
      result.push([...curr] as PixelPoint)

      if (nextInside) {
        // Find intersection point with clip boundary
        const inter = findPolygonEdgeIntersection(curr, next, clip)
        if (inter) result.push(inter)
      }
    } else {
      // Current inside clip
      if (!nextInside) {
        // Find exit intersection
        const inter = findPolygonEdgeIntersection(curr, next, clip)
        if (inter) result.push(inter)
      }
    }
  }

  // Remove duplicates
  return deduplicatePoints(result)
}

function findPolygonEdgeIntersection(
  a: PixelPoint, b: PixelPoint, poly: PixelPoint[]
): PixelPoint | null {
  let bestT = Infinity
  let bestPt: PixelPoint | null = null

  for (let i = 0; i < poly.length; i++) {
    const c = poly[i]
    const d = poly[(i + 1) % poly.length]

    const inter = segmentIntersection(a, b, c, d)
    if (inter) {
      const t = dist(a, inter)
      if (t < bestT) {
        bestT = t
        bestPt = inter
      }
    }
  }

  return bestPt
}

function segmentIntersection(
  p1: PixelPoint, p2: PixelPoint,
  p3: PixelPoint, p4: PixelPoint
): PixelPoint | null {
  const d1x = p2[0] - p1[0], d1y = p2[1] - p1[1]
  const d2x = p4[0] - p3[0], d2y = p4[1] - p3[1]
  const cross = d1x * d2y - d1y * d2x
  if (Math.abs(cross) < 1e-10) return null

  const t = ((p3[0] - p1[0]) * d2y - (p3[1] - p1[1]) * d2x) / cross
  const u = ((p3[0] - p1[0]) * d1y - (p3[1] - p1[1]) * d1x) / cross

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return [
      Math.round(p1[0] + t * d1x),
      Math.round(p1[1] + t * d1y)
    ]
  }
  return null
}

function deduplicatePoints(pts: PixelPoint[], threshold: number = 2): PixelPoint[] {
  if (pts.length === 0) return []
  const result: PixelPoint[] = [pts[0]]
  for (let i = 1; i < pts.length; i++) {
    if (dist(pts[i], result[result.length - 1]) > threshold) {
      result.push(pts[i])
    }
  }
  // Check last vs first
  if (result.length > 1 && dist(result[0], result[result.length - 1]) < threshold) {
    result.pop()
  }
  return result
}

// ══════════════════════════════════════════════════════════════════════════════
// STEP 4: GAP FILLING
// When adjacent rooms have a thin gap between them (< wall thickness),
// extend both polygons to meet at the wall centerline.
// ══════════════════════════════════════════════════════════════════════════════

function fillGaps(rooms: AIRoom[], walls: AIWall[], gapThreshold: number): number {
  let filledCount = 0

  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const polyA = rooms[i].polygon
      const polyB = rooms[j].polygon

      if (polyA.length < 3 || polyB.length < 3) continue

      // Find edges of A and B that are nearly parallel and close
      for (let ai = 0; ai < polyA.length; ai++) {
        const a1 = polyA[ai]
        const a2 = polyA[(ai + 1) % polyA.length]
        const aMid: PixelPoint = [(a1[0] + a2[0]) / 2, (a1[1] + a2[1]) / 2]

        for (let bi = 0; bi < polyB.length; bi++) {
          const b1 = polyB[bi]
          const b2 = polyB[(bi + 1) % polyB.length]
          const bMid: PixelPoint = [(b1[0] + b2[0]) / 2, (b1[1] + b2[1]) / 2]

          // Check if midpoints are close but edges are roughly parallel
          const midDist = dist(aMid, bMid)
          if (midDist > gapThreshold * 3) continue

          // Check edge-to-edge distance (not midpoint distance)
          const d1 = pointToSegmentDist(a1, b1, b2).dist
          const d2 = pointToSegmentDist(a2, b1, b2).dist
          const edgeDist = Math.min(d1, d2)

          if (edgeDist > 0 && edgeDist < gapThreshold) {
            // Check if there's a wall between them
            let wallBetween: AIWall | null = null
            for (const wall of walls) {
              const wDistA = pointToSegmentDist(aMid, wall.start, wall.end).dist
              const wDistB = pointToSegmentDist(bMid, wall.start, wall.end).dist
              if (wDistA < gapThreshold && wDistB < gapThreshold) {
                wallBetween = wall
                break
              }
            }

            if (wallBetween) {
              // Move both edges to the wall centerline ± half thickness
              const halfThick = (wallBetween.thickness_px || 10) / 2

              // Project edge A endpoints onto wall
              const projA1 = pointToSegmentDist(a1, wallBetween.start, wallBetween.end)
              const projA2 = pointToSegmentDist(a2, wallBetween.start, wallBetween.end)

              // Determine which side each room is on
              const wallDx = wallBetween.end[0] - wallBetween.start[0]
              const wallDy = wallBetween.end[1] - wallBetween.start[1]
              const wallLen = Math.sqrt(wallDx * wallDx + wallDy * wallDy)

              if (wallLen > 0) {
                let nx = -wallDy / wallLen
                let ny = wallDx / wallLen

                // Room A's centroid should determine which side of the wall it's on
                const centA = polygonCentroid(polyA)
                const wallMid: PixelPoint = [
                  (wallBetween.start[0] + wallBetween.end[0]) / 2,
                  (wallBetween.start[1] + wallBetween.end[1]) / 2
                ]
                const dotA = (centA[0] - wallMid[0]) * nx + (centA[1] - wallMid[1]) * ny

                const signA = dotA >= 0 ? 1 : -1

                // Move A's edge to wall + halfThick toward A
                polyA[ai] = [
                  Math.round(projA1.projection[0] + signA * nx * halfThick),
                  Math.round(projA1.projection[1] + signA * ny * halfThick)
                ]
                polyA[(ai + 1) % polyA.length] = [
                  Math.round(projA2.projection[0] + signA * nx * halfThick),
                  Math.round(projA2.projection[1] + signA * ny * halfThick)
                ]

                // Move B's edge to wall - halfThick (opposite side)
                const projB1 = pointToSegmentDist(b1, wallBetween.start, wallBetween.end)
                const projB2 = pointToSegmentDist(b2, wallBetween.start, wallBetween.end)

                polyB[bi] = [
                  Math.round(projB1.projection[0] - signA * nx * halfThick),
                  Math.round(projB1.projection[1] - signA * ny * halfThick)
                ]
                polyB[(bi + 1) % polyB.length] = [
                  Math.round(projB2.projection[0] - signA * nx * halfThick),
                  Math.round(projB2.projection[1] - signA * ny * halfThick)
                ]

                filledCount++
              }
            }
          }
        }
      }
    }
  }

  return filledCount
}

// ══════════════════════════════════════════════════════════════════════════════
// STEP 5: EDGE REGULARIZATION
// Straighten edges that are nearly axis-aligned (within a few degrees of
// horizontal or vertical) to produce clean rectangular room shapes.
// ══════════════════════════════════════════════════════════════════════════════

function regularizeEdges(rooms: AIRoom[], angleDeg: number): number {
  const angleRad = (angleDeg * Math.PI) / 180
  let regularizedCount = 0

  for (const room of rooms) {
    for (let i = 0; i < room.polygon.length; i++) {
      const j = (i + 1) % room.polygon.length
      const ptA = room.polygon[i]
      const ptB = room.polygon[j]

      const dx = ptB[0] - ptA[0]
      const dy = ptB[1] - ptA[1]
      const len = Math.sqrt(dx * dx + dy * dy)

      if (len < 5) continue // Skip very short edges

      const angle = Math.atan2(Math.abs(dy), Math.abs(dx))

      // Near-horizontal: angle close to 0
      if (angle < angleRad) {
        // Snap to horizontal — average Y coordinates
        const avgY = Math.round((ptA[1] + ptB[1]) / 2)
        room.polygon[i] = [ptA[0], avgY]
        room.polygon[j] = [ptB[0], avgY]
        regularizedCount++
      }
      // Near-vertical: angle close to π/2
      else if (Math.abs(angle - Math.PI / 2) < angleRad) {
        // Snap to vertical — average X coordinates
        const avgX = Math.round((ptA[0] + ptB[0]) / 2)
        room.polygon[i] = [avgX, ptA[1]]
        room.polygon[j] = [avgX, ptB[1]]
        regularizedCount++
      }
    }
  }

  return regularizedCount
}

// ══════════════════════════════════════════════════════════════════════════════
// STEP 6: RECOMPUTE ROOM GEOMETRY
// After all polygon modifications, recompute area, perimeter, centroid, etc.
// ══════════════════════════════════════════════════════════════════════════════

function recomputeRoomGeometry(rooms: AIRoom[], pxPerMeter: number): void {
  for (const room of rooms) {
    const poly = room.polygon
    if (poly.length < 3) continue

    // Area via Shoelace
    const areaPx2 = polygonArea(poly)
    const areaM2 = areaPx2 / (pxPerMeter * pxPerMeter)
    room.area_m2 = Math.round(areaM2 * 10) / 10
    room.area_sqft = Math.round(areaM2 * 10.7639)

    // Perimeter
    let perimeterPx = 0
    for (let i = 0; i < poly.length; i++) {
      perimeterPx += dist(poly[i], poly[(i + 1) % poly.length])
    }
    room.perimeter_m = Math.round((perimeterPx / pxPerMeter) * 10) / 10

    // Centroid
    room.centroid = polygonCentroid(poly)

    // Bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const [x, y] of poly) {
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }
    room.bounding_box = [minX, minY, maxX - minX, maxY - minY]

    const w = (maxX - minX) / pxPerMeter
    const h = (maxY - minY) / pxPerMeter
    room.length_m = Math.round(Math.max(w, h) * 100) / 100
    room.width_m = Math.round(Math.min(w, h) * 100) / 100
    room.aspect_ratio = room.length_m > 0 && room.width_m > 0
      ? Math.round((room.length_m / room.width_m) * 100) / 100
      : 1
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN SOLVER ENTRY POINT
// ══════════════════════════════════════════════════════════════════════════════

export function solvePolygonConstraints(
  rooms: AIRoom[],
  walls: AIWall[],
  pxPerMeter: number,
): PolygonSolverResult {
  const startTime = performance.now()

  // Compute total area before
  const totalAreaBefore = rooms.reduce((sum, r) => {
    if (r.polygon.length < 3) return sum
    return sum + polygonArea(r.polygon)
  }, 0)

  // Deep-clone polygons so we can track changes
  const originalPolygons = rooms.map(r => r.polygon.map(pt => [...pt] as PixelPoint))

  // Run solver steps in order
  const verticesSnapped = snapVertices(rooms, SNAP_THRESHOLD_PX)
  const edgesAligned = alignEdgesToWalls(rooms, walls, WALL_ALIGN_THRESHOLD_PX)
  const overlapsResolved = resolveOverlaps(rooms)
  const gapsFilled = fillGaps(rooms, walls, GAP_THRESHOLD_PX)
  const edgesRegularized = regularizeEdges(rooms, ANGLE_REGULARIZE_DEG)

  // Compute total area after
  const totalAreaAfter = rooms.reduce((sum, r) => {
    if (r.polygon.length < 3) return sum
    return sum + polygonArea(r.polygon)
  }, 0)

  const areaChangePct = totalAreaBefore > 0
    ? Math.abs(totalAreaAfter - totalAreaBefore) / totalAreaBefore * 100
    : 0

  // If area change is too large, revert to original polygons
  if (areaChangePct > AREA_CHANGE_LIMIT * 100) {
    console.warn(
      `[PolygonSolver] Area changed by ${areaChangePct.toFixed(1)}% ` +
      `(limit: ${AREA_CHANGE_LIMIT * 100}%). Reverting polygon changes.`
    )
    rooms.forEach((room, i) => {
      room.polygon = originalPolygons[i]
    })
  }

  // Recompute room geometry with corrected polygons
  recomputeRoomGeometry(rooms, pxPerMeter)

  const duration = performance.now() - startTime

  return {
    vertices_snapped: verticesSnapped,
    edges_aligned_to_walls: edgesAligned,
    overlaps_resolved: overlapsResolved,
    gaps_filled: gapsFilled,
    edges_regularized: edgesRegularized,
    total_area_before: Math.round(totalAreaBefore),
    total_area_after: Math.round(totalAreaAfter),
    area_change_percent: Math.round(areaChangePct * 10) / 10,
    solver_duration_ms: Math.round(duration),
  }
}
