export type GpuTier = 'high' | 'low' | 'none'

let cached: GpuTier | null = null

/** Rough GPU capability, decided once. `?gpu=none|low|high` forces a tier (used by tests). */
export function gpuTier(): GpuTier {
  if (cached) return cached
  cached = detect()
  return cached
}

function detect(): GpuTier {
  if (typeof document === 'undefined' || typeof navigator === 'undefined') return 'none'
  try {
    const forced = new URLSearchParams(window.location.search).get('gpu')
    if (forced === 'none' || forced === 'low' || forced === 'high') return forced
    if (/jsdom/i.test(navigator.userAgent)) return 'none'
    const c = document.createElement('canvas')
    const gl = (c.getContext('webgl2') || c.getContext('webgl')) as WebGLRenderingContext | null
    if (!gl) return 'none'
    const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8
    const cores = navigator.hardwareConcurrency ?? 8
    const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent)
    // software renderers (no real GPU, e.g. SwiftShader) can draw the scene but slowly: use the light tier
    const info = gl.getExtension('WEBGL_debug_renderer_info')
    const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL) || '') : ''
    if (/swiftshader|llvmpipe|softpipe|software|basic render/i.test(renderer)) return 'low'
    return mobile || mem <= 4 || cores <= 4 ? 'low' : 'high'
  } catch {
    return 'none'
  }
}

/** Frame-rate independent smoothing factor: value += (target - value) * damp(rate, dt). */
export const damp = (rate: number, dt: number): number => 1 - Math.exp(-rate * Math.min(dt, 0.1))

export const smooth = (e0: number, e1: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)))
  return t * t * (3 - 2 * t)
}
