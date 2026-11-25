import { Activity, Database, FileText, Gauge, LayoutDashboard, Sigma, Spline, WifiOff } from 'lucide-react'

/** The application's modules, in sidebar order. `section` is the id of the page's root section. */
export const MODULES = [
  { to: '/dashboard', section: 'overview', label: 'Dashboard', eyebrow: 'Overview', icon: LayoutDashboard },
  { to: '/simulation', section: 'simulation', label: 'Network simulation', eyebrow: 'Live network', icon: Activity },
  { to: '/missing-data', section: 'missing-data', label: 'Missing data', eyebrow: 'The problem', icon: WifiOff },
  { to: '/dataset', section: 'dataset', label: 'Dataset', eyebrow: 'Data preparation', icon: Database },
  { to: '/methods', section: 'methods', label: 'Interpolation methods', eyebrow: 'Mathematical laboratory', icon: Sigma },
  { to: '/reconstruction', section: 'reconstruction', label: 'Reconstruction', eyebrow: 'Filling the gaps', icon: Spline },
  { to: '/evaluation', section: 'evaluation', label: 'Evaluation', eyebrow: 'Accuracy', icon: Gauge },
  { to: '/report', section: 'conclusion', label: 'Report', eyebrow: 'Conclusion', icon: FileText },
] as const

export type Module = (typeof MODULES)[number]

export const moduleForSection = (id: string): Module | undefined => MODULES.find((m) => m.section === id)
