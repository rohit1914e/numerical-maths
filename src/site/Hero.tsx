import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { MODULES } from '../app/modules'
import { PageHeader } from '../components/ui/primitives'
import { LiveNetwork } from '../components/network/LiveNetwork'
import { LiveTrace } from '../components/network/LiveTrace'
import { useInView } from '../hooks/useViewport'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { computeLiveStats, type LiveRecord } from '../simulation/networkSimulation/liveEngine'
import { useDataset } from '../state/DatasetContext'
import { METHOD_SHORT_LABELS } from '../types/interpolation'
import { fmt } from '../utils/format'
import { Stat } from './Section'

/** The dashboard page: headline numbers for the current dataset, the live network, and the way into each module. */
export function Hero() {
  const panel = useRef<HTMLDivElement>(null)
  const inView = useInView(panel)
  const reduced = useReducedMotion()
  const [records, setRecords] = useState<readonly LiveRecord[]>([])
  const stats = computeLiveStats(records)
  const { bundle, experiment, method } = useDataset()
  const best = experiment?.tiedBest.map((m) => METHOD_SHORT_LABELS[m]).join(' / ')
  const bestRmse = experiment?.results.find((r) => r.method === experiment.bestByRmse)?.metrics?.rmse

  return (
    <section id="overview" aria-labelledby="overview-title">
      <PageHeader id="overview" eyebrow="Overview" title="Network Latency Predictor">
        Recovering missing network measurements through numerical interpolation. Ping monitors record round-trip times every second, but some records never arrive; this project rebuilds them with Lagrange, Newton and natural cubic spline interpolation and measures how accurate the estimates really are.
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4" data-testid="dataset-metrics">
        <Stat label="Measurements" value={`${bundle.observed.measurements.length}`} />
        <Stat label="Missing records" value={`${bundle.missingIndices.length}`} alert />
        <Stat label="Lowest RMSE" value={bestRmse === undefined ? '—' : fmt(bestRmse, 2)} unit={bestRmse === undefined ? undefined : 'ms'} />
        <Stat label="Best method" value={best ?? '—'} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)] [&>*]:min-w-0">
        <div ref={panel} className="panel-dark p-4 sm:p-6" aria-label="Live network">
          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
            <div>
              <div className="eyebrow">Live network</div>
              <p className="display mt-1 text-[1.35rem]">Client → router → server</p>
            </div>
            <p className="flex items-center gap-2 text-xs text-panel-muted">
              <span className={`inline-block h-2 w-2 ${inView && !reduced ? 'bg-success' : 'bg-panel-line'}`} />
              {reduced ? 'Paused for reduced motion' : 'One probe per second'}
            </p>
          </div>
          <div className="mt-3">
            <LiveNetwork running={inView && !reduced} onRecords={(r) => setRecords(r)} seed={77} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4" data-testid="hero-metrics">
            <Stat tone="dark" label="Latest RTT" value={stats.latest?.rtt == null ? 'timeout' : fmt(stats.latest.rtt, 1)} unit={stats.latest?.rtt == null ? undefined : 'ms'} alert={stats.latest?.rtt == null} />
            <Stat tone="dark" label="Average" value={fmt(stats.mean, 1)} unit="ms" />
            <Stat tone="dark" label="Jitter" value={fmt(stats.jitter, 1)} unit="ms" />
            <Stat tone="dark" label="Timeouts" value={`${stats.timeouts}`} unit={`of ${stats.count}`} alert={stats.timeouts > 0} />
          </div>
          <div className="mt-3">
            <LiveTrace records={records} height={96} />
          </div>
        </div>

        <div className="card p-5">
          <div className="eyebrow">Modules</div>
          <p className="mt-1 text-sm text-text-2">
            Current method: <span className="text-red">{METHOD_SHORT_LABELS[method]}</span>. Every module reads the same dataset.
          </p>
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {MODULES.slice(1).map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <Link to={to} className="group flex items-center gap-3 py-2.5 text-sm text-text-2 hover:text-text">
                  <Icon size={15} className="text-red" aria-hidden />
                  <span className="flex-1">{label}</span>
                  <ArrowRight size={14} className="opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
          <Link to="/simulation" className="btn btn-primary mt-5 w-full">
            Explore the simulation
          </Link>
        </div>
      </div>
    </section>
  )
}
