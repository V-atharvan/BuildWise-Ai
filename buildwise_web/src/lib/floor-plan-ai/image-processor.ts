// ══════════════════════════════════════════════════════════════════════════════
// BuildWise AI — Floor Plan Understanding Engine
// Step 1: Image Enhancement (Browser Canvas API)
// ══════════════════════════════════════════════════════════════════════════════

import type { ImageEnhancementResult } from './types'

const MAX_DIMENSION = 2048    // Max px for Gemini API
const MAX_FILE_SIZE_B = 4_000_000  // 4 MB limit for inline base64

// ── Convolution kernel helpers ──────────────────────────────────────────────

function applyKernel(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  kernel: number[][],
  factor: number = 1,
  bias: number = 0
): Uint8ClampedArray<ArrayBuffer> {
  const kSize = kernel.length
  const kHalf = Math.floor(kSize / 2)
  const output = new Uint8ClampedArray(data.length) as Uint8ClampedArray<ArrayBuffer>

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0
      for (let ky = 0; ky < kSize; ky++) {
        for (let kx = 0; kx < kSize; kx++) {
          const px = Math.min(width - 1, Math.max(0, x + kx - kHalf))
          const py = Math.min(height - 1, Math.max(0, y + ky - kHalf))
          const idx = (py * width + px) * 4
          const w = kernel[ky][kx]
          r += data[idx] * w
          g += data[idx + 1] * w
          b += data[idx + 2] * w
        }
      }
      const idx = (y * width + x) * 4
      output[idx] = Math.min(255, Math.max(0, r * factor + bias))
      output[idx + 1] = Math.min(255, Math.max(0, g * factor + bias))
      output[idx + 2] = Math.min(255, Math.max(0, b * factor + bias))
      output[idx + 3] = data[idx + 3]
    }
  }
  return output
}

// ── Auto-contrast (stretch histogram) ──────────────────────────────────────

function autoContrast(data: Uint8ClampedArray): Uint8ClampedArray<ArrayBuffer> {
  let minVal = 255, maxVal = 0
  for (let i = 0; i < data.length; i += 4) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    if (lum < minVal) minVal = lum
    if (lum > maxVal) maxVal = lum
  }
  const range = maxVal - minVal || 1
  const out = new Uint8ClampedArray(data.length) as Uint8ClampedArray<ArrayBuffer>
  for (let i = 0; i < data.length; i += 4) {
    out[i] = Math.min(255, Math.max(0, ((data[i] - minVal) / range) * 255))
    out[i + 1] = Math.min(255, Math.max(0, ((data[i + 1] - minVal) / range) * 255))
    out[i + 2] = Math.min(255, Math.max(0, ((data[i + 2] - minVal) / range) * 255))
    out[i + 3] = data[i + 3]
  }
  return out
}

// ── Sharpen kernel ──────────────────────────────────────────────────────────

const SHARPEN_KERNEL = [
  [ 0, -1,  0],
  [-1,  5, -1],
  [ 0, -1,  0],
]

// ── Noise reduction (Gaussian blur 3x3) ────────────────────────────────────

const GAUSSIAN_KERNEL = [
  [1/16, 2/16, 1/16],
  [2/16, 4/16, 2/16],
  [1/16, 2/16, 1/16],
]

// ── Estimate rotation from bright lines (simplified Hough) ─────────────────

function estimateDominantAngle(
  data: Uint8ClampedArray,
  width: number,
  height: number
): number {
  // Sample rows and check for long horizontal runs of dark pixels
  // For architectural drawings, lines should be at 0° or 90°
  // We detect if image appears significantly rotated by checking aspect
  // In practice, Gemini handles slight rotation well — we skip heavy Hough here
  return 0
}

// ── Load image from File into canvas ───────────────────────────────────────

async function fileToCanvas(file: File): Promise<{ canvas: HTMLCanvasElement; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      URL.revokeObjectURL(url)
      resolve({ canvas, width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = reject
    img.src = url
  })
}

// ── Resize if too large ─────────────────────────────────────────────────────

function resizeCanvas(
  canvas: HTMLCanvasElement,
  maxDim: number
): { canvas: HTMLCanvasElement; scale: number } {
  const { width, height } = canvas
  const maxSide = Math.max(width, height)
  if (maxSide <= maxDim) return { canvas, scale: 1 }

  const scale = maxDim / maxSide
  const newW = Math.round(width * scale)
  const newH = Math.round(height * scale)
  const out = document.createElement('canvas')
  out.width = newW
  out.height = newH
  const ctx = out.getContext('2d')!
  ctx.drawImage(canvas, 0, 0, newW, newH)
  return { canvas: out, scale }
}

// ── PDF: render first page via pdf.js (dynamically imported) ───────────────

async function pdfToCanvas(file: File): Promise<{ canvas: HTMLCanvasElement; width: number; height: number }> {
  try {
    // Dynamically load pdfjs-dist if available
    const pdfjsLib = await import('pdfjs-dist' as any).catch(() => null)
    if (!pdfjsLib) {
      throw new Error('PDF.js not available. Please install pdfjs-dist.')
    }
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    const page = await pdf.getPage(1)
    const viewport = page.getViewport({ scale: 2.0 })  // 2x for quality
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext('2d')!
    await page.render({ canvasContext: ctx, viewport }).promise
    return { canvas, width: canvas.width, height: canvas.height }
  } catch (err) {
    throw new Error(`Failed to render PDF: ${err}`)
  }
}

// ── Main Enhancement Function ───────────────────────────────────────────────

export async function enhanceFloorPlanImage(file: File): Promise<ImageEnhancementResult> {
  const enhancements: string[] = []
  const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')

  let sourceCanvas: HTMLCanvasElement
  let originalWidth: number
  let originalHeight: number

  // Step 1: Load image or render PDF
  if (isPDF) {
    const result = await pdfToCanvas(file)
    sourceCanvas = result.canvas
    originalWidth = result.width
    originalHeight = result.height
    enhancements.push('PDF rendered at 2x resolution')
  } else {
    const result = await fileToCanvas(file)
    sourceCanvas = result.canvas
    originalWidth = result.width
    originalHeight = result.height
  }

  // Step 2: Resize if too large (Gemini has a 4MB inline limit)
  const { canvas: resizedCanvas, scale: resizeScale } = resizeCanvas(sourceCanvas, MAX_DIMENSION)
  if (resizeScale < 1) {
    enhancements.push(`Downsampled to ${resizedCanvas.width}×${resizedCanvas.height}px (scale: ${resizeScale.toFixed(2)})`)
  }

  const ctx = resizedCanvas.getContext('2d')!
  let imageData = ctx.getImageData(0, 0, resizedCanvas.width, resizedCanvas.height)
  // Copy into an ArrayBuffer-backed typed array to satisfy TypeScript strict mode
  let pixels = new Uint8ClampedArray(imageData.data) as Uint8ClampedArray<ArrayBuffer>
  const w = resizedCanvas.width
  const h = resizedCanvas.height

  // Step 3: Noise reduction (Gaussian blur to remove scan artifacts)
  const isLowRes = w < 800 || h < 600
  if (isLowRes) {
    pixels = applyKernel(pixels, w, h, GAUSSIAN_KERNEL)
    enhancements.push('Noise reduction (Gaussian blur)')
  }

  // Step 4: Auto-contrast stretching
  const hasLowContrast = (() => {
    let min = 255, max = 0
    for (let i = 0; i < pixels.length; i += 4) {
      const v = pixels[i]
      if (v < min) min = v
      if (v > max) max = v
    }
    return (max - min) < 180
  })()

  if (hasLowContrast) {
    pixels = autoContrast(pixels)
    enhancements.push('Auto-contrast enhancement')
  }

  // Step 5: Sharpen for cleaner lines (critical for architectural drawings)
  pixels = applyKernel(pixels, w, h, SHARPEN_KERNEL)
  enhancements.push('Architectural line sharpening')

  // Write back to canvas
  const outImageData = new ImageData(new Uint8ClampedArray(pixels.buffer), w, h)
  ctx.putImageData(outImageData, 0, 0)

  // Step 6: Check size and compress further if needed
  let dataUrl = resizedCanvas.toDataURL('image/png')
  const sizeBytes = Math.round((dataUrl.length * 3) / 4)

  if (sizeBytes > MAX_FILE_SIZE_B) {
    // Re-export as JPEG at progressive quality to stay under limit
    let quality = 0.92
    do {
      dataUrl = resizedCanvas.toDataURL('image/jpeg', quality)
      quality -= 0.05
    } while (((dataUrl.length * 3) / 4) > MAX_FILE_SIZE_B && quality > 0.40)
    enhancements.push(`Compressed to JPEG (quality: ${Math.round(quality * 100 + 5)}%)`)
  }

  return {
    enhanced_data_url: dataUrl,
    original_width: originalWidth,
    original_height: originalHeight,
    enhanced_width: w,
    enhanced_height: h,
    rotation_applied_deg: 0,
    enhancements_applied: enhancements,
  }
}

// ── Extract base64 from data URL (strips header) ───────────────────────────

export function dataUrlToBase64(dataUrl: string): { base64: string; mimeType: string } {
  const [header, base64] = dataUrl.split(',')
  const mimeType = header.match(/data:([^;]+)/)?.[1] || 'image/png'
  return { base64, mimeType }
}
