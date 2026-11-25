import type { ReactNode } from 'react'
import { moduleForSection } from '../app/modules'
import { PageHeader } from '../components/ui/primitives'

interface SectionProps {
  readonly id: string
  readonly title: string
  readonly intro?: ReactNode
  readonly children: ReactNode
  /** content placed to the right of the heading (controls) */
  readonly aside?: ReactNode
}

/** A module page: anchored, with the page title band (eyebrow, serif title, short intro) and its content. */
export function Section({ id, title, intro, children, aside }: SectionProps) {
  return (
    <section id={id} aria-labelledby={`${id}-title`}>
      <PageHeader id={id} eyebrow={moduleForSection(id)?.eyebrow ?? 'Module'} title={title} aside={aside}>
        {intro}
      </PageHeader>
      <div>{children}</div>
    </section>
  )
}

export function Stat({ label, value, unit, tone = 'light', alert = false, testId }: { label: string; value: string; unit?: string; tone?: 'light' | 'dark'; alert?: boolean; testId?: string }) {
  const dark = tone === 'dark'
  return (
    <div className={dark ? 'border border-panel-line bg-panel-2 px-3.5 py-3' : 'card px-4 py-3.5'} data-testid={testId}>
      <p className={`label ${dark ? 'text-panel-muted' : ''}`}>{label}</p>
      <p className={`num mt-1.5 text-[1.5rem] leading-none ${alert ? (dark ? 'text-panel-alert' : 'text-missing-ink') : 'text-text'}`}>
        {value}
        {unit && <span className="ml-1 text-xs text-text-2">{unit}</span>}
      </p>
    </div>
  )
}
