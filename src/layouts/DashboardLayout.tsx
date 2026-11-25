import { Suspense, useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Info } from 'lucide-react'
import { MODULES } from '../app/modules'
import { Brand } from '../components/ui/Brand'
import { Badge } from '../components/ui/primitives'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { useDataset } from '../state/DatasetContext'
import { METHOD_SHORT_LABELS } from '../types/interpolation'
import { fmt } from '../utils/format'

/** The application shell: module sidebar, a sticky status bar for the current dataset, and the page. */
export default function DashboardLayout() {
  const location = useLocation()
  const reduced = useReducedMotion()
  const { bundle, method, experiment } = useDataset()
  const best = experiment?.results.find((r) => r.method === experiment.bestByRmse)?.metrics?.rmse
  const synthetic = bundle.source.type === 'synthetic'

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="border-b border-line bg-paper-2 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between px-5 py-4 lg:block lg:py-7">
          <Link to="/" aria-label="Latency Predictor home">
            <Brand />
          </Link>
          <div className="eyebrow mt-1 hidden lg:block">Network latency predictor</div>
        </div>
        <nav aria-label="Main" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:block lg:space-y-0.5 lg:pb-0">
          {MODULES.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-3 border-l-2 px-3 py-2.5 text-[0.8rem] transition-colors ${
                  isActive ? 'border-red bg-red/10 text-red' : 'border-transparent text-text-2 hover:bg-brown/5 hover:text-text'
                }`
              }
            >
              <Icon size={15} aria-hidden /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden px-5 pt-8 pb-6 text-[0.68rem] leading-relaxed text-text-2 lg:block">
          <Info size={14} className="mb-2 text-sage" aria-hidden />
          Packet traffic is simulated and every estimate comes from the interpolation code running in your browser. No real network is probed.
        </div>
      </aside>

      <div className="min-w-0">
        <div className="sticky top-0 z-20 flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-line bg-paper/92 px-6 py-3 backdrop-blur lg:px-10" data-testid="status-bar">
          <div className="flex min-w-0 items-center gap-3">
            <span className="num truncate text-sm text-text" title="Current dataset">
              {synthetic ? 'Synthetic series' : bundle.observed.label}
            </span>
            <Badge tone={synthetic ? 'default' : 'red'}>{synthetic ? 'seeded' : 'imported'}</Badge>
          </div>
          <div className="num hidden text-[0.7rem] text-text-2 sm:block">
            {bundle.observed.measurements.length} records · <span className="text-missing-ink">{bundle.missingIndices.length} missing</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <Badge tone="red">{METHOD_SHORT_LABELS[method]}</Badge>
            <span className="num hidden text-[0.7rem] text-text-2 md:inline">lowest RMSE {best === undefined ? '—' : `${fmt(best, 2)} ms`}</span>
          </div>
        </div>
        <main className="px-6 pt-6 pb-16 lg:px-10 lg:pt-8">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={location.pathname} initial={reduced ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={reduced ? undefined : { opacity: 0 }} transition={{ duration: 0.22, ease: 'easeOut' }}>
              <Suspense fallback={<p className="py-8 text-center text-sm text-text-2">Loading…</p>}>
                <Outlet />
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
