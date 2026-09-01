/**
 * The chart palette — the one thing every consumer of this package was missing.
 *
 * Until now `src/charts/*` defaulted every stroke to `currentColor` and there
 * was no series token anywhere in ui.css or themes.css, so each portal picked
 * its own hues by hand. The EFFICIENT Observability console is the worked
 * example: it chose cyan/green/violet/magenta, and two of its four legend
 * entries came out the same green.
 *
 * Three rules, and each one is load-bearing:
 *
 * 1. **Slots are assigned in fixed order and never cycled.** Color follows the
 *    entity, not its rank — a reader who learned "Acme is blue" must not see
 *    Acme repainted when a filter drops the row above it. A ninth series is
 *    never a generated hue; fold the tail into "Other" or facet instead.
 *
 * 2. **Series color does NOT follow the accent theme.** themes.css remaps the
 *    blue accent utilities for the pink/green/grey/blue variants and the custom
 *    picker. Charts sit outside that on purpose: identity encoding that moves
 *    with a cosmetic preference is not identity encoding. The tokens below are
 *    declared once under `:root` and once under `[data-theme="dark"]`, and no
 *    accent variant touches them.
 *
 * 3. **Status is a separate reservation.** `good`/`warning`/`serious`/`critical`
 *    mean a state, never an identity, and never double as "series 5". A chart
 *    that colors 2xx/4xx/5xx uses the status set; a chart that colors three
 *    tenants uses the categorical set.
 *
 * The eight hues and their two sets of steps are not a taste call. They were
 * run through a colour-vision-deficiency validator against THIS package's real
 * surfaces — white in light, `--surface` (#1e1e2e) in dark — and the ordering
 * is the CVD-safety mechanism rather than decoration:
 *
 *   light  worst adjacent CVD ΔE 9.1, normal-vision ΔE 19.6  (targets 8 / 15)
 *   dark   worst adjacent CVD ΔE 8.4, normal-vision ΔE 19.3
 *
 * Three light steps (aqua, yellow, magenta) sit under 3:1 against white. That
 * is a documented WARN, not a pass — it obliges every chart using them to ship
 * visible labels or a table view, which is why `ChartFrame` takes a `table`
 * slot rather than leaving it to each caller's good intentions.
 */

/** How many categorical slots exist. A 9th series folds into "Other". */
export const SERIES_SLOT_COUNT = 8;

/**
 * CSS custom properties for the categorical slots, in assignment order.
 *
 * Values live in ui.css so a consumer can restyle them without a rebuild, and
 * so the light/dark pair resolves through the same `[data-theme]` mechanism as
 * every other surface in the package.
 */
export const SERIES_VARS = [
  'var(--viz-series-1)',
  'var(--viz-series-2)',
  'var(--viz-series-3)',
  'var(--viz-series-4)',
  'var(--viz-series-5)',
  'var(--viz-series-6)',
  'var(--viz-series-7)',
  'var(--viz-series-8)',
] as const;

/** Reserved state colours. Never reused as a categorical slot. */
export const STATUS_VARS = {
  good: 'var(--viz-good)',
  neutral: 'var(--viz-neutral)',
  warning: 'var(--viz-warning)',
  serious: 'var(--viz-serious)',
  critical: 'var(--viz-critical)',
} as const;

export type StatusTone = keyof typeof STATUS_VARS;

/** Grid, axis and de-emphasis inks, so charts stop hard-coding gray-400. */
export const CHART_INK = {
  grid: 'var(--viz-grid)',
  axis: 'var(--viz-axis)',
  label: 'var(--viz-label)',
  /** The "everything that is not the point" colour, for the emphasis form. */
  muted: 'var(--viz-muted)',
  /** Painted behind marks to separate them without drawing a border. */
  surface: 'var(--viz-surface)',
} as const;

/**
 * The colour for categorical slot `index`, counted from zero.
 *
 * Past the eighth slot this returns the de-emphasis ink rather than wrapping:
 * a cycled 9th hue is indistinguishable from an existing slot under CVD, and
 * silently returning one would hide the modelling mistake. Fold the tail into
 * an "Other" series instead.
 */
export function seriesColor(index: number): string {
  return SERIES_VARS[index] ?? CHART_INK.muted;
}

/**
 * Resolve one series' colour from an explicit choice, a status tone, or its
 * slot. Explicit wins, because a caller naming a colour has a reason.
 */
export function resolveSeriesColor(
  index: number,
  explicit?: string,
  tone?: StatusTone,
): string {
  if (explicit) return explicit;
  if (tone) return STATUS_VARS[tone];
  return seriesColor(index);
}
