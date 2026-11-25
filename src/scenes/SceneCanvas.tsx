import { Component, useEffect, useRef, useState, type ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { COLORS } from '../styles/tokens'
import { gpuTier } from './gpu'

class Boundary extends Component<{ fallback: ReactNode; children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    this.props.onError()
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

interface Props {
  readonly children: ReactNode
  /** shown instead of WebGL when the device has no/weak GPU, WebGL fails or the context is lost */
  readonly fallback: ReactNode
  readonly camera?: { position: [number, number, number]; fov?: number; near?: number; far?: number }
  readonly label: string
  readonly bloom?: { intensity?: number; threshold?: number }
}

/**
 * Mounts a WebGL canvas only while near the viewport, adapts the pixel ratio to the measured frame rate,
 * renders on demand under reduced motion, and degrades to `fallback` when WebGL is unavailable or lost.
 */
export default function SceneCanvas({ children, fallback, camera = { position: [0, 0, 6], fov: 40 }, label, bloom }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [near, setNear] = useState(false)
  const [failed, setFailed] = useState(false)
  const tier = gpuTier()
  const reduced = useReducedMotion()
  const maxDpr = tier === 'high' ? 1.75 : 1
  const [dpr, setDpr] = useState(maxDpr)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      setNear(true)
      return
    }
    const io = new IntersectionObserver(([e]) => setNear(e.isIntersecting), { rootMargin: '300px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const useGl = tier !== 'none' && !failed
  const effects = tier === 'high'
  return (
    <div ref={ref} className="relative h-full w-full" role="img" aria-label={label} data-testid="scene" data-webgl={useGl ? 'true' : 'false'}>
      {!useGl ? (
        fallback
      ) : near ? (
        <Boundary fallback={fallback} onError={() => setFailed(true)}>
          <Canvas
            camera={camera}
            dpr={dpr}
            frameloop={reduced ? 'demand' : 'always'}
            gl={{ antialias: tier === 'high', alpha: true, powerPreference: 'high-performance' }}
            onCreated={({ gl }) => {
              gl.setClearColor(COLORS.canvas, 0)
              gl.domElement.addEventListener('webglcontextlost', (e) => {
                e.preventDefault()
                setFailed(true)
              })
            }}
          >
            {!reduced && (
              <PerformanceMonitor
                ms={250}
                iterations={6}
                flipflops={3}
                onDecline={() => setDpr((d) => Math.max(0.75, +(d - 0.25).toFixed(2)))}
                onIncline={() => setDpr((d) => Math.min(maxDpr, +(d + 0.25).toFixed(2)))}
              />
            )}
            {effects && <color attach="background" args={[COLORS.canvas]} />}
            {children}
            {effects && (
              <EffectComposer multisampling={4}>
                <Bloom mipmapBlur intensity={bloom?.intensity ?? 0.6} luminanceThreshold={bloom?.threshold ?? 0.82} luminanceSmoothing={0.25} radius={0.72} />
                <Vignette offset={0.42} darkness={0.38} eskil={false} />
              </EffectComposer>
            )}
          </Canvas>
        </Boundary>
      ) : null}
    </div>
  )
}

export function SceneFallback({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex h-full w-full flex-col items-end justify-center px-8 text-right sm:px-16" data-testid="scene-fallback">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(45%_60%_at_78%_45%,color-mix(in_srgb,var(--color-red)_22%,transparent),transparent_70%)]" />
      <div className="relative eyebrow">{title}</div>
      <div className="relative mt-2 max-w-xs text-sm leading-relaxed text-text-2">{children}</div>
    </div>
  )
}
