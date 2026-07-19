// ══════════════════════════════════════════════════════════════════════════════
// BuildWise AI — Floor Plan Understanding Engine
// Step 1: Image Enhancement (Browser Canvas API)
// ══════════════════════════════════════════════════════════════════════════════

import type { ImageEnhancementResult, ImageQualityResult } from './types'

const MAX_DIMENSION = 2048    // Max px for Gemini API
const MAX_FILE_SIZE_B = 4_000_000  // 4 MB limit for inline base64

// ── Image Quality Analysis ──────────────────────────────────────────────────

export function analyzeImageQuality(
  pixels: Uint8ClampedArray,
  width: number,
  height: number
): ImageQualityResult {
  let totalLum = 0
  let minLum = 255
  let maxLum = 0
  
  // Sample every 4th pixel for speed
  const step = 4 * 4 // 4 components per pixel, sample every 4th pixel
  let sampleCount = 0
  
  for (let i = 0; i < pixels.length; i += step) {
    const r = pixels[i]
    const g = pixels[i + 1]
    const b = pixels[i + 2]
    const lum = 0.299 * r + 0.587 * g + 0.114 * b
    totalLum += lum
    if (lum < minLum) minLum = lum
    if (lum > maxLum) maxLum = lum
    sampleCount++
  }
  
  const avgBrightness = sampleCount > 0 ? totalLum / sampleCount : 127
  const avgContrast = maxLum - minLum
  
  // Calculate blur index: average difference between adjacent pixels
  let edgeDiffSum = 0
  let diffCount = 0
  const rowBytes = width * 4
  
  // Sample a grid of pixels
  for (let y = 4; y < height - 4; y += 8) {
    for (let x = 4; x < width - 4; x += 8) {
      const idx = (y * width + x) * 4
      if (idx + 4 >= pixels.length || idx + rowBytes >= pixels.length) continue
      
      const currentLum = 0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2]
      
      const rightIdx = idx + 4
      const rightLum = 0.299 * pixels[rightIdx] + 0.587 * pixels[rightIdx + 1] + 0.114 * pixels[rightIdx + 2]
      
      const downIdx = idx + rowBytes
      const downLum = 0.299 * pixels[downIdx] + 0.587 * pixels[downIdx + 1] + 0.114 * pixels[downIdx + 2]
      
      edgeDiffSum += Math.abs(currentLum - rightLum) + Math.abs(currentLum - downLum)
      diffCount += 2
    }
  }
  
  const blurIndex = diffCount > 0 ? edgeDiffSum / diffCount : 10
  
  // Image Quality Scoring Rules
  let score = 100
  const problems: string[] = []
  const recommendations: string[] = []
  
  const isLowRes = width < 1200 || height < 900
  if (isLowRes) {
    score -= 25
    problems.push('Low Resolution')
    recommendations.push('Upload a higher resolution drawing (min 1500px wide) for accurate text OCR.')
  }
  
  const isDim = avgBrightness < 80
  const isTooBright = avgBrightness > 220
  if (isDim) {
    score -= 10
    problems.push('Low Brightness (Dim Image)')
    recommendations.push('Improve lighting or brighten the plan so fine wall lines are clear.')
  } else if (isTooBright) {
    score -= 10
    problems.push('Overexposed Image')
    recommendations.push('Reduce glare or use a scanned version of the blueprint.')
  }
  
  const isLowContrast = avgContrast < 120
  if (isLowContrast) {
    score -= 15
    problems.push('Poor Contrast')
    recommendations.push('Apply contrast enhancement or use a binary black-and-white scan.')
  }
  
  const isBlurry = blurIndex < 6
  if (isBlurry) {
    score -= 20
    problems.push('Blurry Details')
    recommendations.push('Ensure the drawing is sharp and lines are not fuzzy.')
  }
  
  // Cap score
  score = Math.max(10, Math.min(100, score))
  
  if (score < 80) {
    recommendations.push('Enhance image quality or re-scan before starting structural estimation.')
  } else {
    recommendations.push('Image quality is optimal. Ready for AI processing.')
  }
  
  return {
    score,
    problems,
    recommendations,
    brightness: Math.round(avgBrightness),
    contrast: Math.round(avgContrast),
    blur_index: Math.round(blurIndex * 10) / 10,
    is_skewed: false, // Default skew detection
  }
}

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
    const pdfjsLib = await import('pdfjs-dist' as any).catch(() => null)
    if (!pdfjsLib) {
      throw new Error('PDF.js not available. Please install pdfjs-dist.')
    }
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`
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

  // Analyze quality on the raw/resized pixels
  const quality = analyzeImageQuality(pixels, w, h)

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
    let qualityVal = 0.92
    do {
      dataUrl = resizedCanvas.toDataURL('image/jpeg', qualityVal)
      qualityVal -= 0.05
    } while (((dataUrl.length * 3) / 4) > MAX_FILE_SIZE_B && qualityVal > 0.40)
    enhancements.push(`Compressed to JPEG (quality: ${Math.round(qualityVal * 100 + 5)}%)`)
  }

  return {
    enhanced_data_url: dataUrl,
    original_width: originalWidth,
    original_height: originalHeight,
    enhanced_width: w,
    enhanced_height: h,
    rotation_applied_deg: 0,
    enhancements_applied: enhancements,
    image_quality: quality,
  }
}

// ── Extract base64 from data URL (strips header) ───────────────────────────

export function dataUrlToBase64(dataUrl: string): { base64: string; mimeType: string } {
  const [header, base64] = dataUrl.split(',')
  const mimeType = header.match(/data:([^;]+)/)?.[1] || 'image/png'
  return { base64, mimeType }
}
