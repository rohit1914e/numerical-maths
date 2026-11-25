import { Activity } from 'lucide-react'

/** Word mark: a pulse icon and the project name set in the display serif. */
export function Brand({ size = 'md' }: { size?: 'sm' | 'md' }) {
  return (
    <span className="flex items-center gap-2.5">
      <Activity size={size === 'sm' ? 16 : 18} className="text-red" aria-hidden />
      <span className={`display tracking-wide text-text ${size === 'sm' ? 'text-xl' : 'text-[1.6rem]'}`}>LATENCY</span>
    </span>
  )
}
