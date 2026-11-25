import { useLayoutEffect, useRef } from 'react'
import { ChevronDown } from 'lucide-react'
import { gsap, useScrollProgress } from '../../animations/scroll'
import { useReducedMotion } from '../../hooks/useReducedMotion'

const WORD = 'LATENCY'

/**
 * Opening scene. The globe is drawn by the landing's fixed GlobeStage behind this section: the title rises in
 * once, and scrolling pushes the camera in on the network while the title lifts away.
 */
export default function Hero() {
  const ref = useRef<HTMLElement>(null)
  const head = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()

  useScrollProgress(ref, {
    start: 'top top',
    end: 'bottom bottom',
    staticProgress: 0,
    onUpdate: (p) => {
      const h = head.current
      if (h) {
        h.style.opacity = String(1 - Math.min(1, p * 2.2))
        h.style.transform = `translateY(${p * -160}px)`
      }
    },
  })

  useLayoutEffect(() => {
    if (reduced || !head.current) return
    const ctx = gsap.context(() => {
      gsap.from('[data-letter]', { yPercent: 115, duration: 1.4, ease: 'power4.out', stagger: 0.07, delay: 0.25 })
      gsap.from('[data-hero-fade]', { opacity: 0, y: 16, duration: 1.2, ease: 'power2.out', delay: 1.15, stagger: 0.14 })
    }, head)
    return () => ctx.revert()
  }, [reduced])

  return (
    <section ref={ref} id="chapter-1" data-chapter={1} aria-label="Introduction" className="relative h-[220vh]">
      <div className="sticky top-0 h-screen overflow-hidden">
        <div ref={head} className="absolute inset-x-0 bottom-[12vh] px-5 sm:px-9">
          <div className="mx-auto max-w-7xl">
            <div className="eyebrow mb-4" data-hero-fade>
              Numerical Methods capstone
            </div>
            <h1 className="display text-[clamp(3.6rem,13vw,12rem)] leading-[0.86] tracking-[-0.02em]" aria-label="Network Latency Predictor">
              <span className="inline-block overflow-hidden pb-[0.06em] align-bottom" aria-hidden>
                {WORD.split('').map((c, i) => (
                  <span key={i} data-letter className="inline-block">
                    {c}
                  </span>
                ))}
              </span>
              <span className="mt-2 block text-[clamp(1.6rem,3.4vw,3rem)] leading-tight tracking-normal text-red italic" aria-hidden data-hero-fade>
                predictor
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-[clamp(1.05rem,1.6vw,1.45rem)] leading-snug text-text" data-hero-fade>
              Recovering missing network measurements through numerical interpolation.
            </p>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-text-2" data-hero-fade>
              Ping monitors record a round-trip time every second, but some replies never arrive. Lagrange, Newton and natural cubic splines rebuild what was lost, and the site measures how accurate they really are.
            </p>
            <div className="mt-9 flex items-center gap-3 text-text-2" data-hero-fade>
              <ChevronDown size={16} className="text-red" />
              <span className="label">Scroll to begin</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
