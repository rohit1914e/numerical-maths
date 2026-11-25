/**
 * Colour tokens for SVG charts and illustrations. These mirror the CSS variables in
 * index.css (@theme), which are the source of truth for everything styled with classes.
 * Keep the two in step: components must not use colour literals of their own.
 */
export const COLORS = {
  canvas: '#191A18',
  surface: '#242521',
  ink: '#F1EEE7',
  muted: '#AAA69C',
  axis: '#6E6A60',
  grid: '#36352F',
  accent: '#D97745',

  actual: '#F1EEE7',
  estimate: '#E6B76A',
  estimateInk: '#E6B76A',
  missing: '#E0644A',
  missingInk: '#EF7A5F',
  success: '#97A182',
  failure: '#E0644A',

  panel: '#121311',
  panel2: '#1F201D',
  panelLine: '#3A3833',
  panelInk: '#F1EEE7',
  panelMuted: '#AAA69C',
  panelAccent: '#E6B76A',
  panelAlert: '#EF7A5F',
  panelDevice: '#CFC9BC',
} as const

/** One colour per interpolation method, used for series that compare methods. */
export const METHOD_COLORS = {
  lagrange: '#D97745',
  newton: '#E6B76A',
  spline: '#97A182',
} as const

/** Distinct but quiet line colours for the Lagrange basis polynomials (warm family, readable on charcoal). */
export const BASIS_COLORS = ['#D97745', '#E6B76A', '#97A182', '#F1EEE7', '#B66A45', '#C9A27A', '#7F8C6E', '#AAA69C', '#E89A6B', '#D8CBB0'] as const
