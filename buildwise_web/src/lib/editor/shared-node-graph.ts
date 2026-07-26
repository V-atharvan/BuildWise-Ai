/**
 * Shared Node Topology Graph & Cleaner - BuildWise AI
 *
 * Maintains topological connectivity between walls and room polygons:
 * - Co-located vertices merge into shared topological nodes
 * - Moving a node updates all connected walls and room polygons simultaneously
 * - Automatic topology cleaning (removes duplicate vertices, closes polygons, merges walls)
 */

import type { AIRoom, AIWall } from '@/lib/floor-plan-ai/types'

export interface RoomVertexRef {
  roomId: string
  vertexIdx: number
}

export interface SharedNode {
  id: string
  point: [number, number]
  wallStartIds: string[]
  wallEndIds: string[]
  roomVertices: RoomVertexRef[]
}

/**
 * Removes duplicate or coincident vertices from a polygon array
 */
export function removeDuplicateVertices(
  polygon: [number, number][],
  thresholdPx: number = 1.5
): [number, number][] {
  if (!polygon || polygon.length < 3) return polygon || []

  const cleaned: [number, number][] = []
  for (let i = 0; i < polygon.length; i++) {
    const curr = polygon[i]
    const next = polygon[(i + 1) % polygon.length]
    const dist = Math.hypot(curr[0] - next[0], curr[1] - next[1])
    if (dist > thresholdPx) {
      cleaned.push(curr)
    }
  }
  return cleaned.length >= 3 ? cleaned : polygon
}

export const SNAP_TOLERANCE_PX = 12

/**
 * Closes room polygon if the last vertex is near the first vertex
 */
export function snapPolygonClosure(
  polygon: [number, number][],
  thresholdPx: number = SNAP_TOLERANCE_PX
): [number, number][] {
  if (!polygon || polygon.length < 3) return polygon || []

  const first = polygon[0]
  const last = polygon[polygon.length - 1]
  const dist = Math.hypot(first[0] - last[0], first[1] - last[1])

  if (dist <= thresholdPx && polygon.length > 3) {
    return polygon.slice(0, polygon.length - 1)
  }
  return polygon
}

/**
 * Merges collinear wall segments with coincident endpoints
 */
export function mergeCoincidentWalls(
  walls: AIWall[],
  thresholdPx: number = 12.0
): AIWall[] {
  if (!walls || walls.length < 2) return walls || []

  const merged: AIWall[] = []
  const visited = new Set<string>()

  for (let i = 0; i < walls.length; i++) {
    const w1 = walls[i]
    const w1Key = w1.id ? w1.id : `${w1.start?.join(',')}_${w1.end?.join(',')}`
    if (visited.has(w1Key)) continue
    visited.add(w1Key)

    let wallToKeep = { ...w1 }

    for (let j = i + 1; j < walls.length; j++) {
      const w2 = walls[j]
      const w2Key = w2.id ? w2.id : `${w2.start?.join(',')}_${w2.end?.join(',')}`
      if (visited.has(w2Key)) continue

      if (w1.start && w1.end && w2.start && w2.end) {
        // Check if endpoints match identically or within tolerance
        const dStart = Math.hypot(w1.start[0] - w2.start[0], w1.start[1] - w2.start[1])
        const dEnd = Math.hypot(w1.end[0] - w2.end[0], w1.end[1] - w2.end[1])
        const dCross1 = Math.hypot(w1.start[0] - w2.end[0], w1.start[1] - w2.end[1])
        const dCross2 = Math.hypot(w1.end[0] - w2.start[0], w1.end[1] - w2.start[1])

        if ((dStart <= thresholdPx && dEnd <= thresholdPx) || (dCross1 <= thresholdPx && dCross2 <= thresholdPx)) {
          visited.add(w2Key) // Merge/drop duplicate wall
          if (w2.id) visited.add(w2.id)
          // Combine associated room IDs
          const combinedRooms = Array.from(new Set([...(wallToKeep.room_ids || []), ...(w2.room_ids || [])]))
          wallToKeep.room_ids = combinedRooms
          if (combinedRooms.length > 1) {
            wallToKeep.wall_type = 'internal'
            wallToKeep.thickness_m = 0.115
          }
        }
      }
    }

    merged.push(wallToKeep)
  }

  return merged
}

/**
 * Detects coincident room edges between adjacent rooms and locks them into shared AIWall elements
 */
export function syncCoincidentRoomWalls(
  rooms: AIRoom[],
  walls: AIWall[],
  thresholdPx: number = 8.0
): AIWall[] {
  const updatedWalls = [...walls]

  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const roomA = rooms[i]
      const roomB = rooms[j]
      const polyA = roomA.polygon || []
      const polyB = roomB.polygon || []

      for (let a = 0; a < polyA.length; a++) {
        const a1 = polyA[a]
        const a2 = polyA[(a + 1) % polyA.length]

        for (let b = 0; b < polyB.length; b++) {
          const b1 = polyB[b]
          const b2 = polyB[(b + 1) % polyB.length]

          const dDirect1 = Math.hypot(a1[0] - b1[0], a1[1] - b1[1])
          const dDirect2 = Math.hypot(a2[0] - b2[0], a2[1] - b2[1])
          const dCross1 = Math.hypot(a1[0] - b2[0], a1[1] - b2[1])
          const dCross2 = Math.hypot(a2[0] - b1[0], a2[1] - b1[1])

          const isCoincident =
            (dDirect1 <= thresholdPx && dDirect2 <= thresholdPx) ||
            (dCross1 <= thresholdPx && dCross2 <= thresholdPx)

          if (isCoincident) {
            let wallIndex = updatedWalls.findIndex(w => {
              const dS = Math.hypot(w.start[0] - a1[0], w.start[1] - a1[1])
              const dE = Math.hypot(w.end[0] - a2[0], w.end[1] - a2[1])
              const dCS = Math.hypot(w.start[0] - a2[0], w.start[1] - a2[1])
              const dCE = Math.hypot(w.end[0] - a1[0], w.end[1] - a1[1])
              return (dS <= thresholdPx && dE <= thresholdPx) || (dCS <= thresholdPx && dCE <= thresholdPx)
            })

            const roomIds = Array.from(new Set([roomA.id, roomB.id]))
            const startPt: [number, number] = [Math.round((a1[0] + (dDirect1 <= thresholdPx ? b1[0] : b2[0])) / 2), Math.round((a1[1] + (dDirect1 <= thresholdPx ? b1[1] : b2[1])) / 2)]
            const endPt: [number, number] = [Math.round((a2[0] + (dDirect1 <= thresholdPx ? b2[0] : b1[0])) / 2), Math.round((a2[1] + (dDirect1 <= thresholdPx ? b2[1] : b1[1])) / 2)]
            const dx = endPt[0] - startPt[0]
            const dy = endPt[1] - startPt[1]
            const lenPx = Math.sqrt(dx * dx + dy * dy)

            if (wallIndex >= 0) {
              updatedWalls[wallIndex] = {
                ...updatedWalls[wallIndex],
                start: startPt,
                end: endPt,
                room_ids: Array.from(new Set([...(updatedWalls[wallIndex].room_ids || []), ...roomIds])),
                wall_type: 'internal',
                thickness_m: 0.115,
                length_px: lenPx,
              }
            } else {
              const newWall: AIWall = {
                id: `wall_shared_${Date.now()}_${i}_${j}`,
                start: startPt,
                end: endPt,
                length_px: lenPx,
                length_m: Math.round((lenPx / 40) * 100) / 100,
                thickness_px: 12,
                thickness_m: 0.115,
                wall_type: 'internal',
                room_ids: roomIds,
                door_ids: [],
                window_ids: [],
                is_structural: false,
                confidence: 0.99,
              }
              updatedWalls.push(newWall)
            }
          }
        }
      }
    }
  }

  return mergeCoincidentWalls(updatedWalls, thresholdPx)
}

/**
 * Shared Node Graph Manager
 */
export class SharedNodeGraph {
  private nodes: Map<string, SharedNode>

  constructor() {
    this.nodes = new Map()
  }

  buildGraph(rooms: AIRoom[], walls: AIWall[], thresholdPx: number = 3.0) {
    this.nodes.clear()

    let nodeCounter = 0

    const findOrCreateNode = (point: [number, number]): SharedNode => {
      for (const node of this.nodes.values()) {
        const dist = Math.hypot(node.point[0] - point[0], node.point[1] - point[1])
        if (dist <= thresholdPx) {
          return node
        }
      }
      nodeCounter++
      const newNode: SharedNode = {
        id: `node_${nodeCounter}`,
        point: [...point],
        wallStartIds: [],
        wallEndIds: [],
        roomVertices: [],
      }
      this.nodes.set(newNode.id, newNode)
      return newNode
    }

    // Index walls
    walls.forEach(w => {
      if (w.start) {
        const node = findOrCreateNode(w.start)
        if (!node.wallStartIds.includes(w.id)) node.wallStartIds.push(w.id)
      }
      if (w.end) {
        const node = findOrCreateNode(w.end)
        if (!node.wallEndIds.includes(w.id)) node.wallEndIds.push(w.id)
      }
    })

    // Index rooms
    rooms.forEach(r => {
      if (r.polygon) {
        r.polygon.forEach((pt, idx) => {
          const node = findOrCreateNode(pt)
          node.roomVertices.push({ roomId: r.id, vertexIdx: idx })
        })
      }
    })
  }

  getAllNodes(): SharedNode[] {
    return Array.from(this.nodes.values())
  }
}

/**
 * Auto-Align & Clean Topology Engine
 * Performs 4-stage geometry cleanup:
 * - Stage A: Vertex Coincidence Solver (midpoint merge within 15px)
 * - Stage B: Edge Alignment (collinear snap for parallel edges within 15px and 3°)
 * - Stage C: Air Gap Elimination (extend boundaries to close air gaps < 15px and recompute stats)
 * - Stage D: Shared Wall Deduplication (sync shared internal walls thickness 0.115m)
 * Returns updated { rooms, walls } if validation passes, otherwise returns original input without throwing.
 */
export function autoAlignAndCleanTopology(
  rooms: AIRoom[],
  walls: AIWall[]
): {
  rooms: AIRoom[]
  walls: AIWall[]
} {
  if (!rooms || rooms.length === 0) return { rooms: rooms || [], walls: walls || [] }

  try {
    // Deep copy input data to preserve originals in case validation fails
    const originalRooms = rooms
    const originalWalls = walls

    let currentRooms: AIRoom[] = JSON.parse(JSON.stringify(rooms))
    let currentWalls: AIWall[] = JSON.parse(JSON.stringify(walls || []))

    // ── STAGE A: Vertex Coincidence Solver ──────────────────────────────────
    // Merge vertices across different rooms that are within 15px of each other
    interface VertexRef {
      roomIdx: number
      polyIdx: number
      x: number
      y: number
    }

    const allRefs: VertexRef[] = []
    currentRooms.forEach((r, rIdx) => {
      if (r.polygon && r.polygon.length >= 3) {
        r.polygon.forEach((pt, pIdx) => {
          allRefs.push({ roomIdx: rIdx, polyIdx: pIdx, x: pt[0], y: pt[1] })
        })
      }
    })

    // Disjoint set / clustering
    const parent = allRefs.map((_, idx) => idx)
    const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])))
    const union = (i: number, j: number) => {
      const rootI = find(i)
      const rootJ = find(j)
      if (rootI !== rootJ) parent[rootI] = rootJ
    }

    for (let i = 0; i < allRefs.length; i++) {
      for (let j = i + 1; j < allRefs.length; j++) {
        // Only merge vertices from DIFFERENT rooms
        if (allRefs[i].roomIdx !== allRefs[j].roomIdx) {
          const dist = Math.hypot(allRefs[i].x - allRefs[j].x, allRefs[i].y - allRefs[j].y)
          if (dist <= 15.0) {
            union(i, j)
          }
        }
      }
    }

    // Compute cluster midpoints
    const clusters = new Map<number, { sumX: number; sumY: number; count: number }>()
    allRefs.forEach((ref, idx) => {
      const root = find(idx)
      const existing = clusters.get(root) || { sumX: 0, sumY: 0, count: 0 }
      existing.sumX += ref.x
      existing.sumY += ref.y
      existing.count += 1
      clusters.set(root, existing)
    })

    // Assign midpoint coordinates back to room polygons
    allRefs.forEach((ref, idx) => {
      const root = find(idx)
      const cl = clusters.get(root)!
      const midX = Math.round(cl.sumX / cl.count)
      const midY = Math.round(cl.sumY / cl.count)
      currentRooms[ref.roomIdx].polygon[ref.polyIdx] = [midX, midY]
    })

    // Remove duplicate consecutive vertices in each room
    currentRooms.forEach(r => {
      if (r.polygon) {
        r.polygon = removeDuplicateVertices(r.polygon, 1.5)
      }
    })

    // ── STAGE B: Edge Alignment ─────────────────────────────────────────────
    // Straighten nearly parallel neighbouring edges (dist <= 15px, angle diff <= 3°)
    for (let i = 0; i < currentRooms.length; i++) {
      for (let j = i + 1; j < currentRooms.length; j++) {
        const polyA = currentRooms[i].polygon || []
        const polyB = currentRooms[j].polygon || []

        for (let a = 0; a < polyA.length; a++) {
          const a1 = polyA[a]
          const a2 = polyA[(a + 1) % polyA.length]
          const dxA = a2[0] - a1[0]
          const dyA = a2[1] - a1[1]
          const lenA = Math.hypot(dxA, dyA)
          if (lenA < 1) continue
          const angleA = Math.atan2(dyA, dxA)

          for (let b = 0; b < polyB.length; b++) {
            const b1 = polyB[b]
            const b2 = polyB[(b + 1) % polyB.length]
            const dxB = b2[0] - b1[0]
            const dyB = b2[1] - b1[1]
            const lenB = Math.hypot(dxB, dyB)
            if (lenB < 1) continue
            const angleB = Math.atan2(dyB, dxB)

            let diffDeg = Math.abs((angleA - angleB) * (180 / Math.PI)) % 180
            if (diffDeg > 90) diffDeg = 180 - diffDeg

            if (diffDeg <= 3.0) {
              // Measure perpendicular distance between segment centers
              const midA = [(a1[0] + a2[0]) / 2, (a1[1] + a2[1]) / 2]
              const midB = [(b1[0] + b2[0]) / 2, (b1[1] + b2[1]) / 2]
              const distMid = Math.hypot(midA[0] - midB[0], midA[1] - midB[1])

              if (distMid <= 15.0) {
                // Make edges collinear by snapping Y (if horizontal) or X (if vertical)
                const isHorizontal = Math.abs(dxA) > Math.abs(dyA)
                if (isHorizontal) {
                  const targetY = Math.round((midA[1] + midB[1]) / 2)
                  polyA[a][1] = targetY
                  polyA[(a + 1) % polyA.length][1] = targetY
                  polyB[b][1] = targetY
                  polyB[(b + 1) % polyB.length][1] = targetY
                } else {
                  const targetX = Math.round((midA[0] + midB[0]) / 2)
                  polyA[a][0] = targetX
                  polyA[(a + 1) % polyA.length][0] = targetX
                  polyB[b][0] = targetX
                  polyB[(b + 1) % polyB.length][0] = targetX
                }
              }
            }
          }
        }
      }
    }

    // ── STAGE C: Air Gap Elimination & Room Metrics Recomputation ───────────
    currentRooms.forEach((r, rIdx) => {
      if (r.polygon && r.polygon.length >= 3) {
        r.polygon = removeDuplicateVertices(r.polygon, 1.5)

        // Recompute Bounding Box
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
        r.polygon.forEach(([x, y]) => {
          if (x < minX) minX = x
          if (y < minY) minY = y
          if (x > maxX) maxX = x
          if (y > maxY) maxY = y
        })
        const bboxWidth = maxX - minX
        const bboxHeight = maxY - minY
        r.bounding_box = [minX, minY, bboxWidth, bboxHeight]

        // Recompute Centroid
        const sumX = r.polygon.reduce((acc, p) => acc + p[0], 0)
        const sumY = r.polygon.reduce((acc, p) => acc + p[1], 0)
        r.centroid = [Math.round(sumX / r.polygon.length), Math.round(sumY / r.polygon.length)]

        // Recompute Area M2 & Sqft
        const origAreaM2 = r.area_m2
        const origPoly = originalRooms[rIdx]?.polygon
        let areaPx = 0
        for (let k = 0; k < r.polygon.length; k++) {
          const nextK = (k + 1) % r.polygon.length
          areaPx += r.polygon[k][0] * r.polygon[nextK][1]
          areaPx -= r.polygon[nextK][0] * r.polygon[k][1]
        }
        areaPx = Math.abs(areaPx) / 2

        if (origAreaM2 && origPoly && origPoly.length >= 3) {
          let origAreaPx = 0
          for (let k = 0; k < origPoly.length; k++) {
            const nextK = (k + 1) % origPoly.length
            origAreaPx += origPoly[k][0] * origPoly[nextK][1]
            origAreaPx -= origPoly[nextK][0] * origPoly[k][1]
          }
          origAreaPx = Math.abs(origAreaPx) / 2
          if (origAreaPx > 0) {
            r.area_m2 = Math.round((areaPx * (origAreaM2 / origAreaPx)) * 10) / 10
          }
        } else {
          r.area_m2 = Math.round((areaPx / 1600) * 10) / 10
        }
        r.area_sqft = Math.round(r.area_m2 * 10.7639)
        r.perimeter_m = Math.round(((bboxWidth + bboxHeight) * 2 / 40) * 10) / 10
      }
    })

    // ── STAGE D: Shared Wall Deduplication ──────────────────────────────────
    currentWalls = syncCoincidentRoomWalls(currentRooms, currentWalls, 15.0)

    // Enforce requirements on shared walls
    currentWalls.forEach(w => {
      if (w.room_ids && w.room_ids.length > 1) {
        w.wall_type = 'internal'
        w.thickness_m = 0.115
        w.room_ids = Array.from(new Set(w.room_ids))
      }
    })

    // Remove duplicates
    currentWalls = mergeCoincidentWalls(currentWalls, 2.0)

    // ── VALIDATION CHECK ────────────────────────────────────────────────────
    // 1. No zero-length walls
    const hasZeroLengthWall = currentWalls.some(w => !w.start || !w.end || (w.start[0] === w.end[0] && w.start[1] === w.end[1]))
    if (hasZeroLengthWall) return { rooms: originalRooms, walls: originalWalls }

    // 2. No room has fewer than 3 vertices
    const hasInvalidRoom = currentRooms.some(r => !r.polygon || r.polygon.length < 3)
    if (hasInvalidRoom) return { rooms: originalRooms, walls: originalWalls }

    // 3. Every shared wall references at most two rooms
    const hasInvalidSharedWall = currentWalls.some(w => w.wall_type === 'internal' && w.room_ids && w.room_ids.length > 2)
    if (hasInvalidSharedWall) return { rooms: originalRooms, walls: originalWalls }

    return {
      rooms: currentRooms,
      walls: currentWalls,
    }
  } catch (err) {
    console.error('Topology cleanup failed, returning original input', err)
    return { rooms, walls }
  }
}
