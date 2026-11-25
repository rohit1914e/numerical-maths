import type { ReactNode } from 'react'

/** The page title band used by every module page: warm light falling in from the top right, a horizon line below. */
export function PageHeader({ id, eyebrow, title, children, aside }: { id?: string; eyebrow: string; title: string; children?: ReactNode; aside?: ReactNode }) {
  return (
    <header className="sunwash relative -mx-6 -mt-6 mb-8 overflow-hidden border-b border-line px-6 pt-12 pb-9 lg:-mx-10 lg:-mt-8 lg:px-10">
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,transparent,var(--color-red)_70%,var(--color-amber))] opacity-60" />
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-4xl">
          <div className="eyebrow mb-3">{eyebrow}</div>
          <h1 id={id ? `${id}-title` : undefined} className="display text-[2.4rem] sm:text-[3.4rem]">
            {title}
          </h1>
          {children && <div className="mt-4 max-w-2xl text-[0.95rem] leading-relaxed text-text-2">{children}</div>}
        </div>
        {aside}
      </div>
    </header>
  )
}

/** Short, plain-language explanation shown at the top of a module page. */
export function Explain({ title = 'What is this page showing?', steps }: { title?: string; steps: ReactNode[] }) {
  return (
    <aside className="card mb-8 px-5 py-4" aria-label={title} data-testid="explain">
      <div className="eyebrow mb-3">{title}</div>
      <ol className="grid gap-x-8 gap-y-3 text-[0.84rem] leading-relaxed text-text-2 md:grid-cols-2 xl:grid-cols-3">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-3">
            <span className="num mt-0.5 text-red">{i + 1}</span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
    </aside>
  )
}

type Tone = 'default' | 'red' | 'warn' | 'danger' | 'sage'

export function Badge({ children, tone = 'default' }: { children: ReactNode; tone?: Tone }) {
  const color = { default: 'text-text-2 border-line', red: 'text-red border-line-strong', warn: 'text-warn border-warn/50', danger: 'text-danger border-danger/50', sage: 'text-sage border-sage/60' }[tone]
  return <span className={`inline-flex items-center gap-1.5 border px-2 py-[3px] text-[0.62rem] tracking-[0.16em] uppercase ${color}`}>{children}</span>
}

export function Readout({ label, value, unit, tone = 'text-text' }: { label: string; value: string; unit?: string; tone?: string }) {
  return (
    <div className="border-l border-line-strong pl-3">
      <div className="label">{label}</div>
      <div className={`num text-2xl ${tone}`}>
        {value}
        {unit && <span className="ml-1 text-xs text-text-2">{unit}</span>}
      </div>
    </div>
  )
}
