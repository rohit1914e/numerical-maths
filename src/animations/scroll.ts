import { useEffect, useLayoutEffect, type RefObject } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { useReducedMotion } from '../hooks/useReducedMotion'

gsap.registerPlugin(ScrollTrigger)
export { gsap, ScrollTrigger }

interface Opts {
  readonly start?: string
  readonly end?: string
  /** called with scroll progress 0..1 while the section scrolls (scrubbed) */
  readonly onUpdate?: (progress: number) => void
  /** progress reported when motion is reduced (no triggers are created) */
  readonly staticProgress?: number
}

/** Scrubbed ScrollTrigger bound to an element; under reduced motion it reports a fixed, readable state. */
export function useScrollProgress(ref: RefObject<HTMLElement | null>, { start = 'top bottom', end = 'bottom top', onUpdate, staticProgress = 0.5 }: Opts) {
  const reduced = useReducedMotion()
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    if (reduced) {
      onUpdate?.(staticProgress)
      return
    }
    const ctx = gsap.context(() => {
      const proxy = { p: 0 }
      gsap.to(proxy, { p: 1, ease: 'none', scrollTrigger: { trigger: el, start, end, scrub: 0.8 }, onUpdate: () => onUpdate?.(proxy.p) })
    }, el)
    return () => ctx.revert()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, start, end])
}

/** Fades children matching `selector` in as they enter (skipped when motion is reduced). */
export function useRevealOnScroll(ref: RefObject<HTMLElement | null>, selector = '[data-reveal]') {
  const reduced = useReducedMotion()
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || reduced) return
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>(selector).forEach((node) => {
        gsap.from(node, { y: 36, opacity: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: node, start: 'top 88%', toggleActions: 'play none none reverse' } })
      })
    }, el)
    return () => ctx.revert()
  }, [reduced, selector, ref])
}

/** Smooth scrolling wired into the GSAP ticker so ScrollTrigger stays in sync. Disabled for reduced motion. */
export function useLenis() {
  const reduced = useReducedMotion()
  useEffect(() => {
    if (reduced) return
    const lenis = new Lenis({ lerp: 0.09, smoothWheel: true })
    const onScroll = () => ScrollTrigger.update()
    lenis.on('scroll', onScroll)
    const tick = (t: number) => lenis.raf(t * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)
    return () => {
      gsap.ticker.remove(tick)
      lenis.off('scroll', onScroll)
      lenis.destroy()
    }
  }, [reduced])
}
