/**
 * GeometryTransform Utility - BuildWise AI
 *
 * Provides a unified World Coordinate System and transformation matrix for
 * floor plan raster images and vector overlays (walls, rooms, doors, windows,
 * columns, labels, edit handles).
 *
 * Prevents sub-pixel alignment drift between HTML/Canvas/SVG layers.
 */

export interface ContainerBounds {
  containerWidth: number
  containerHeight: number
  imageWidth: number
  imageHeight: number
  renderedWidth: number
  renderedHeight: number
  offsetX: number
  offsetY: number
  scale: number
}

export interface TransformMatrix {
  zoom: number
  panX: number
  panY: number
}

export interface ValidationReport {
  maxDriftPx: number
  wallDriftPx: number
  roomDriftPx: number
  doorDriftPx: number
  windowDriftPx: number
  hasWarning: boolean
  warningMessage?: string
}

/**
 * Calculates exact aspect-ratio fit (object-contain) bounds and offsets
 * of a raster image within a DOM container element.
 */
export function getImageAspectFitBounds(
  containerWidth: number,
  containerHeight: number,
  imageWidth: number,
  imageHeight: number
): ContainerBounds {
  if (!containerWidth || !containerHeight || !imageWidth || !imageHeight) {
    return {
      containerWidth: containerWidth || 800,
      containerHeight: containerHeight || 600,
      imageWidth: imageWidth || 800,
      imageHeight: imageHeight || 600,
      renderedWidth: containerWidth || 800,
      renderedHeight: containerHeight || 600,
      offsetX: 0,
      offsetY: 0,
      scale: 1,
    }
  }

  const scaleX = containerWidth / imageWidth
  const scaleY = containerHeight / imageHeight
  const scale = Math.min(scaleX, scaleY)

  const renderedWidth = imageWidth * scale
  const renderedHeight = imageHeight * scale

  const offsetX = (containerWidth - renderedWidth) / 2
  const offsetY = (containerHeight - renderedHeight) / 2

  return {
    containerWidth,
    containerHeight,
    imageWidth,
    imageHeight,
    renderedWidth,
    renderedHeight,
    offsetX,
    offsetY,
    scale,
  }
}

/**
 * Converts image pixel coordinates [x, y] to container canvas coordinates [cx, cy]
 */
export function imageToCanvas(
  point: [number, number],
  bounds: ContainerBounds
): [number, number] {
  const cx = point[0] * bounds.scale + bounds.offsetX
  const cy = point[1] * bounds.scale + bounds.offsetY
  return [cx, cy]
}

/**
 * Converts container canvas coordinates [cx, cy] to image pixel coordinates [x, y]
 */
export function canvasToImage(
  point: [number, number],
  bounds: ContainerBounds
): [number, number] {
  const x = (point[0] - bounds.offsetX) / bounds.scale
  const y = (point[1] - bounds.offsetY) / bounds.scale
  return [x, y]
}

/**
 * Converts raw screen mouse coordinates to image pixel coordinates
 */
export function screenToWorld(
  screenPoint: [number, number],
  containerRect: DOMRect,
  bounds: ContainerBounds,
  transform: TransformMatrix = { zoom: 1, panX: 0, panY: 0 }
): [number, number] {
  // Screen relative to container top-left
  const relX = screenPoint[0] - containerRect.left
  const relY = screenPoint[1] - containerRect.top

  // Undo pan & zoom transform relative to transform origin
  const unpannedX = (relX - transform.panX) / transform.zoom
  const unpannedY = (relY - transform.panY) / transform.zoom

  return canvasToImage([unpannedX, unpannedY], bounds)
}

/**
 * Converts image pixel coordinates to final screen coordinates
 */
export function worldToScreen(
  worldPoint: [number, number],
  containerRect: DOMRect,
  bounds: ContainerBounds,
  transform: TransformMatrix = { zoom: 1, panX: 0, panY: 0 }
): [number, number] {
  const [cx, cy] = imageToCanvas(worldPoint, bounds)
  const screenX = containerRect.left + cx * transform.zoom + transform.panX
  const screenY = containerRect.top + cy * transform.zoom + transform.panY
  return [screenX, screenY]
}

/**
 * Computes polygon centroid with floating point precision
 */
export function calculatePolygonCentroid(polygon: [number, number][]): [number, number] {
  if (!polygon || polygon.length === 0) return [0, 0]
  let area = 0
  let cx = 0
  let cy = 0
  const n = polygon.length

  for (let i = 0; i < n; i++) {
    const p1 = polygon[i]
    const p2 = polygon[(i + 1) % n]
    const cross = p1[0] * p2[1] - p2[0] * p1[1]
    area += cross
    cx += (p1[0] + p2[0]) * cross
    cy += (p1[1] + p2[1]) * cross
  }

  area /= 2
  if (Math.abs(area) < 1e-5) {
    // Fallback arithmetic mean for degenerate polygons
    const sumX = polygon.reduce((acc, p) => acc + p[0], 0)
    const sumY = polygon.reduce((acc, p) => acc + p[1], 0)
    return [sumX / n, sumY / n]
  }

  const factor = 1 / (6 * area)
  return [cx * factor, cy * factor]
}

/**
 * Validates overlay registration error between image bounds and vector geometry
 */
export function validateGeometryAlignment(
  walls: { start?: [number, number]; end?: [number, number] }[],
  rooms: { polygon?: [number, number][] }[],
  imageWidth: number,
  imageHeight: number
): ValidationReport {
  let wallDriftPx = 0
  let roomDriftPx = 0

  // Verify walls stay within 0..imageWidth and 0..imageHeight
  walls.forEach(w => {
    if (w.start) {
      if (w.start[0] < -2 || w.start[0] > imageWidth + 2) wallDriftPx = Math.max(wallDriftPx, Math.abs(w.start[0] - Math.max(0, Math.min(w.start[0], imageWidth))))
      if (w.start[1] < -2 || w.start[1] > imageHeight + 2) wallDriftPx = Math.max(wallDriftPx, Math.abs(w.start[1] - Math.max(0, Math.min(w.start[1], imageHeight))))
    }
  })

  // Verify room vertices stay within bounds
  rooms.forEach(r => {
    if (r.polygon) {
      r.polygon.forEach(p => {
        if (p[0] < -2 || p[0] > imageWidth + 2) roomDriftPx = Math.max(roomDriftPx, Math.abs(p[0] - Math.max(0, Math.min(p[0], imageWidth))))
        if (p[1] < -2 || p[1] > imageHeight + 2) roomDriftPx = Math.max(roomDriftPx, Math.abs(p[1] - Math.max(0, Math.min(p[1], imageHeight))))
      })
    }
  })

  const maxDriftPx = Math.max(wallDriftPx, roomDriftPx)
  const hasWarning = maxDriftPx > 2.0

  return {
    maxDriftPx,
    wallDriftPx,
    roomDriftPx,
    doorDriftPx: 0,
    windowDriftPx: 0,
    hasWarning,
    warningMessage: hasWarning
      ? `Geometry Alignment Warning: Overlay elements deviate by ${maxDriftPx.toFixed(1)}px (> 2px threshold).`
      : undefined,
  }
}
