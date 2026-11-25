import { useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useRevealOnScroll } from '../../animations/scroll'
import { MODULES } from '../../app/modules'
import { useInView } from '../../hooks/useViewport'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { chooseFocusGap } from '../../reconstruction/focus'
import { mergeReconstructions, reconstruct } from '../../reconstruction/reconstruct'
import { computeLiveStats, type LiveRecord } from '../../simulation/networkSimulation/liveEngine'
import { useDataset } from '../../state/DatasetContext'
import { METHOD_LABELS, METHOD_SHORT_LABELS, METHODS, type InterpolationMethod } from '../../types/interpolation'
import type { Measurement } from '../../types/measurement'
import { fmt, fmtSeconds } from '../../utils/format'
import { LatencyPlot, type PlotMeasurement } from '../graphs/LatencyPlot'
import { LiveNetwork } from '../network/LiveNetwork'
import { LiveTrace } from '../network/LiveTrace'
import { Tex } from '../typography/Tex'
import { Readout } from '../ui/primitives'

function Chapter({ n, title, kicker, children }: { n: number; title: string; kicker: string; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null)
  useRevealOnScroll(ref)
  return (
    <section ref={ref} id={`chapter-${n}`} data-chapter={n} aria-label={`Chapter ${n}: ${title}`} className="relative px-5 py-24 sm:px-9 sm:py-32">
      <div className="mx-auto max-w-7xl">
        <div data-reveal className="mb-10 max-w-3xl">
          <div className="eyebrow mb-3">
            Chapter {String(n).padStart(2, '0')} — {title}
          </div>
          <h2 className="display text-[2.4rem] leading-[1.05] sm:text-[3.6rem]">{kicker}</h2>
        </div>
        {children}
      </div>
    </section>
  )
}

function Prose({ children }: { children: ReactNode }) {
  return (
    <p data-reveal className="max-w-md text-[0.95rem] leading-relaxed text-text-2">
      {children}
    </p>
  )
}

function DeepLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} data-reveal className="mt-6 inline-flex items-center gap-2 text-[0.7rem] tracking-[0.18em] text-red uppercase hover:text-amber">
      {children} <ArrowRight size={14} aria-hidden />
    </Link>
  )
}

const plotRows = (rows: readonly Measurement[]): PlotMeasurement[] =>
  rows.map((m) => ({ index: m.index, x: m.timestamp, y: m.status === 'reconstructed' ? m.reconstructedPingMs : m.observedPingMs, status: m.status }))

export function ChapterSimulation() {
  const panel = useRef<HTMLDivElement>(null)
  const inView = useInView(panel)
  const reduced = useReducedMotion()
  const [records, setRecords] = useState<readonly LiveRecord[]>([])
  const stats = computeLiveStats(records)
  return (
    <Chapter n={2} title="Network simulation" kicker="Every second, a probe crosses the network.">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div>
          <Prose>A client sends an ICMP echo through a router to a server and times the reply. The round-trip time wanders with queueing and jitter, and now and then a reply never comes back: a timeout.</Prose>
          <div data-reveal className="mt-8 grid max-w-md grid-cols-2 gap-5">
            <Readout label="Latest RTT" value={stats.latest?.rtt == null ? 'timeout' : fmt(stats.latest.rtt, 1)} unit={stats.latest?.rtt == null ? undefined : 'ms'} tone={stats.latest?.rtt == null ? 'text-missing-ink' : 'text-text'} />
            <Readout label="Average" value={fmt(stats.mean, 1)} unit="ms" />
            <Readout label="Jitter" value={fmt(stats.jitter, 1)} unit="ms" />
            <Readout label="Timeouts" value={`${stats.timeouts}`} unit={`of ${stats.count}`} tone={stats.timeouts > 0 ? 'text-missing-ink' : 'text-text'} />
          </div>
          <DeepLink to="/simulation">Open the simulation</DeepLink>
        </div>
        <div ref={panel} data-reveal className="world-panel p-4 sm:p-6" aria-label="Live network">
          <LiveNetwork running={inView && !reduced} onRecords={(r) => setRecords(r)} seed={77} />
          <div className="mt-3">
            <LiveTrace records={records} height={96} />
          </div>
        </div>
      </div>
    </Chapter>
  )
}

export function ChapterMissing() {
  const { bundle } = useDataset()
  const n = bundle.observed.measurements.length
  const missing = bundle.missingIndices.length
  return (
    <Chapter n={3} title="Missing data" kicker="Some measurements never arrive.">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div>
          <Prose>A lost reply leaves a hole in the time series. Averages, alerts and capacity plans computed from the series quietly go wrong unless the holes are handled honestly.</Prose>
          <div data-reveal className="mt-8 grid max-w-md grid-cols-3 gap-5">
            <Readout label="Records" value={`${n}`} />
            <Readout label="Missing" value={`${missing}`} tone="text-missing-ink" />
            <Readout label="Share" value={fmt((missing / Math.max(1, n)) * 100, 0)} unit="%" />
          </div>
          <DeepLink to="/missing-data">See how data goes missing</DeepLink>
        </div>
        <div data-reveal className="world-panel p-3 sm:p-5">
          <LatencyPlot data={plotRows(bundle.observed.measurements)} height={300} label="The incomplete latency series" />
        </div>
      </div>
    </Chapter>
  )
}

const FORMULAS: Record<InterpolationMethod, string> = {
  lagrange: String.raw`P(t)=\sum_{i=0}^{n} y_i\prod_{j\ne i}\frac{t-t_j}{t_i-t_j}`,
  newton: String.raw`P(t)=f[t_0]+\sum_{k=1}^{n} f[t_0,\dots,t_k]\prod_{j<k}(t-t_j)`,
  spline: String.raw`S_i(t)=a_i+b_i\,\Delta t+c_i\,\Delta t^2+d_i\,\Delta t^3`,
}

export function ChapterMethods() {
  const { bundle, nodeCount } = useDataset()
  const focus = useMemo(() => chooseFocusGap(bundle), [bundle])
  const estimates = useMemo(
    () =>
      Object.fromEntries(
        METHODS.map((m) => {
          if (focus === null) return [m, null]
          const [o] = reconstruct(bundle.observed, [focus], { method: m, nodeCount })
          return [m, o.ok ? o.value : null]
        }),
      ) as Record<InterpolationMethod, number | null>,
    [bundle, focus, nodeCount],
  )
  const t = focus === null ? null : bundle.observed.measurements[focus].timestamp
  return (
    <Chapter n={4} title="Interpolation" kicker="Three ways to draw a curve through the neighbours.">
      <Prose>
        Each method fits a smooth curve through measured neighbours of a gap and reads the missing value off it{t !== null && <> — here for the gap at t = {fmtSeconds(t)} s</>}. Lagrange and Newton build the same polynomial in two forms; the spline joins cubic pieces with no bend at the ends.
      </Prose>
      <div className="mt-10 grid gap-4 lg:grid-cols-3 [&>*]:min-w-0">
        {METHODS.map((m) => (
          <div key={m} data-reveal className="world-panel flex min-w-0 flex-col p-5">
            <div className="eyebrow">{METHOD_SHORT_LABELS[m]}</div>
            <h3 className="display mt-1 text-[1.4rem]">{METHOD_LABELS[m]}</h3>
            <div className="mt-4 overflow-x-auto border border-line bg-paper px-3 py-3 text-brown">
              <Tex tex={FORMULAS[m]} display />
            </div>
            <div className="mt-auto pt-5">
              <div className="label">Estimate at the gap</div>
              <div className="num text-2xl text-estimate">{estimates[m] === null ? '—' : `${fmt(estimates[m], 2)}`}<span className="ml-1 text-xs text-text-2">ms</span></div>
            </div>
          </div>
        ))}
      </div>
      <DeepLink to="/methods">Step through the arithmetic</DeepLink>
    </Chapter>
  )
}

export function ChapterReconstruction() {
  const { bundle, method, nodeCount } = useDataset()
  const outcomes = useMemo(() => reconstruct(bundle.observed, bundle.missingIndices, { method, nodeCount }), [bundle, method, nodeCount])
  const merged = useMemo(() => mergeReconstructions(bundle.observed, new Map(outcomes.map((o) => [o.index, o]))), [bundle, outcomes])
  const filled = outcomes.filter((o) => o.ok).length
  return (
    <Chapter n={5} title="Reconstruction" kicker="Every gap, filled from measured values only.">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div>
          <Prose>Estimates are drawn as amber diamonds and are never reused as nodes, so one guess cannot contaminate the next. Gaps at the very start or end stay empty: there is nothing to interpolate between.</Prose>
          <div data-reveal className="mt-8 grid max-w-md grid-cols-2 gap-5">
            <Readout label="Gaps filled" value={`${filled}`} unit={`of ${outcomes.length}`} tone="text-estimate" />
            <Readout label="Method" value={METHOD_SHORT_LABELS[method]} />
          </div>
          <DeepLink to="/reconstruction">Watch the reconstruction</DeepLink>
        </div>
        <div data-reveal className="world-panel p-3 sm:p-5">
          <LatencyPlot data={plotRows(merged)} height={300} connectReconstructed label="The series with reconstructed values" />
        </div>
      </div>
    </Chapter>
  )
}

export function ChapterEvaluation() {
  const { experiment, experimentError } = useDataset()
  return (
    <Chapter n={6} title="Evaluation" kicker="Hide what we know, and measure the error.">
      <Prose>To score the methods honestly, known measurements are hidden, reconstructed, and compared with the true values. Lower RMSE is better.</Prose>
      {experiment ? (
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {experiment.results.map((r) => {
            const best = experiment.tiedBest.includes(r.method)
            return (
              <div key={r.method} data-reveal className={`world-panel p-5 ${best ? 'border-line-strong' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="eyebrow">{METHOD_SHORT_LABELS[r.method]}</div>
                  {best && <span className="border border-line-strong px-2 py-[3px] text-[0.6rem] tracking-[0.16em] text-red uppercase">Lowest RMSE</span>}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <Readout label="RMSE" value={r.metrics ? fmt(r.metrics.rmse, 3) : '—'} unit="ms" tone={best ? 'text-red' : 'text-text'} />
                  <Readout label="MAE" value={r.metrics ? fmt(r.metrics.mae, 3) : '—'} unit="ms" />
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p data-reveal className="mt-8 text-sm text-missing-ink">{experimentError}</p>
      )}
      <DeepLink to="/evaluation">Read the full evaluation</DeepLink>
    </Chapter>
  )
}

export function ChapterDashboard() {
  return (
    <Chapter n={7} title="Dashboard" kicker="Now try it yourself.">
      <Prose>Import your own ping CSV, change the method and the number of nodes, and watch every module recompute from the same data.</Prose>
      <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {MODULES.map(({ to, label, eyebrow, icon: Icon }) => (
          <Link key={to} to={to} data-reveal className="world-panel group flex items-start gap-3 p-4 transition-colors hover:border-line-strong">
            <Icon size={18} className="mt-0.5 text-red" aria-hidden />
            <span>
              <span className="label block">{eyebrow}</span>
              <span className="text-sm text-text group-hover:text-red">{label}</span>
            </span>
          </Link>
        ))}
      </div>
      <div data-reveal className="mt-10">
        <Link to="/dashboard" className="btn btn-primary">
          Open the dashboard <ArrowRight size={14} aria-hidden />
        </Link>
      </div>
    </Chapter>
  )
}
