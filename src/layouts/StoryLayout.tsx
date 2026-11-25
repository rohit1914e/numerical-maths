import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useLenis } from '../animations/scroll'
import { Brand } from '../components/ui/Brand'
import { useReducedMotion } from '../hooks/useReducedMotion'

const CHAPTERS = ['Introduction', 'Network simulation', 'Missing data', 'Interpolation', 'Reconstruction', 'Evaluation', 'Dashboard']

/** Immersive layout: smooth scrolling, a fixed chapter rail and a fixed 3D stage behind the chapters. */
export default function StoryLayout({ children, stage }: { children: ReactNode; stage?: ReactNode }) {
  useLenis()
  const reduced = useReducedMotion()
  const [active, setActive] = useState(0)

  useEffect(() => {
    window.scrollTo(0, 0)
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-chapter]'))
    if (!els.length || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.chapter) - 1)
        })
      },
      { rootMargin: '-45% 0px -45% 0px' },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  return (
    <div className="relative bg-paper" data-testid="story">
      <header className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-center justify-between px-5 py-4 sm:px-9">
        <Link to="/" className="pointer-events-auto" aria-label="Latency Predictor">
          <Brand size="sm" />
        </Link>
        <div className="pointer-events-auto flex items-center gap-4">
          <span className="eyebrow hidden sm:inline" data-testid="chapter-label">
            {String(active + 1).padStart(2, '0')} · {CHAPTERS[active]}
          </span>
          <Link to="/dashboard" className="border border-line-strong bg-paper/60 px-3.5 py-1.5 text-[0.66rem] tracking-[0.18em] text-red uppercase backdrop-blur hover:bg-red/10" data-testid="enter-platform">
            Open dashboard
          </Link>
        </div>
      </header>
      <nav aria-label="Chapters" className="fixed top-1/2 right-4 z-40 hidden -translate-y-1/2 flex-col gap-2.5 md:flex">
        {CHAPTERS.map((c, i) => (
          <a
            key={c}
            href={`#chapter-${i + 1}`}
            aria-label={`Chapter ${i + 1}: ${c}`}
            aria-current={i === active}
            className={`block h-[3px] transition-all ${i === active ? 'w-7 bg-red' : 'w-3.5 bg-line-strong hover:bg-brown'}`}
            onClick={(e) => {
              e.preventDefault()
              document.getElementById(`chapter-${i + 1}`)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' })
            }}
          />
        ))}
      </nav>
      {stage}
      <main className="relative z-10">{children}</main>
    </div>
  )
}
