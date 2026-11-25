import { Suspense, useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { smooth } from './gpu'
import { NetworkGlobe } from './NetworkGlobe'
import SceneCanvas, { SceneFallback } from './SceneCanvas'

function InvalidateOnScroll() {
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => {
    const on = () => invalidate()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [invalidate])
  return null
}

/**
 * The landing's single fixed 3D stage behind every chapter. Scrolling the hero pushes the camera in on the
 * network; once the chapters begin the planet settles to the right so the reading column stays clear.
 */
export default function GlobeStage() {
  const hero = useRef(0)
  const after = useRef(0)

  useEffect(() => {
    let raf = 0
    const loop = () => {
      raf = requestAnimationFrame(loop)
      const el = document.getElementById('chapter-1')
      if (!el) return
      const vh = window.innerHeight
      const y = window.scrollY
      const top = el.getBoundingClientRect().top + y
      const span = Math.max(1, el.offsetHeight - vh)
      hero.current = Math.min(1, Math.max(0, (y - top) / span))
      after.current = smooth(top + span, top + span + vh * 0.9, y)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className="fixed inset-0 z-0" data-testid="globe-stage">
      <SceneCanvas
        camera={{ position: [0, 0, 3.15], fov: 38, near: 0.1, far: 100 }}
        bloom={{ intensity: 0.6, threshold: 0.82 }}
        label="A rotating photographic Earth with latency probes travelling between data-centre cities; some packets are lost on the way"
        fallback={<SceneFallback title="The network">The 3D globe is unavailable on this device. Every chapter's numbers remain live.</SceneFallback>}
      >
        <InvalidateOnScroll />
        <Suspense fallback={null}>
          <NetworkGlobe hero={hero} after={after} />
        </Suspense>
      </SceneCanvas>
      {/* left-side falloff keeps type readable over the globe; a soft top edge keeps the header clear */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,var(--color-paper)_0%,color-mix(in_srgb,var(--color-paper)_55%,transparent)_34%,transparent_60%)] max-md:bg-[color-mix(in_srgb,var(--color-paper)_45%,transparent)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--color-paper)_80%,transparent),transparent)]" />
    </div>
  )
}
