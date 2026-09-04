/**
 * Shared chart types. The charts are dependency-free inline SVG/CSS — color
 * defaults to `currentColor` so a parent `text-*` class themes them, and
 * geometry comes from numeric props (not Tailwind classes), so they sidestep
 * the design-sync compiled-CSS / arbitrary-value constraints entirely.
 */
import { type CSSProperties, type ReactNode } from 'react';

import type { Curve } from './curve';
import type { StatusTone } from './palette';

export interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  /** Line color. Defaults to `currentColor`. */
  stroke?: string;
  /** Area fill under the line. Omit for a bare line. */
  fill?: string;
  strokeWidth?: number;
  showDots?: boolean;
  className?: string;
  style?: CSSProperties;
}

export interface BarChartProps {
  data: number[];
  /** Optional labels under each bar. */
  labels?: string[];
  height?: number;
  /** Bar color. Defaults to `currentColor`. */
  color?: string;
  /** Per-bar color overrides. */
  colors?: string[];
  /** Value mapped to a full-height bar. Defaults to the max of `data`. */
  max?: number;
  /** Gap between bars, in px. */
  gap?: number;
  className?: string;
  style?: CSSProperties;
}

export interface LineChartSeries {
  data: number[];
  /** Shown in the legend (`showLegend`) and in point tooltips. */
  label?: string;
  /** Line color. Defaults to `currentColor`. */
  color?: string;
  /** Area fill under this line. Omit for a bare line. */
  fill?: string;
}

export interface LineChartProps {
  /** One or more series drawn over the same x positions. */
  series: LineChartSeries[];
  /** X-axis labels rendered under the plot, one per data point. */
  labels?: string[];
  height?: number;
  strokeWidth?: number;
  showDots?: boolean;
  /** Value at the top of the plot. Defaults to the max across all series. */
  max?: number;
  /** Value at the bottom of the plot. Defaults to the min across all series. */
  min?: number;
  /** Max / mid / min values in a left gutter, with faint reference lines. */
  showScale?: boolean;
  /** Color-dot legend above the plot, from the series' `label`s. */
  showLegend?: boolean;
  className?: string;
  style?: CSSProperties;
}

export interface DonutSegment {
  label: string;
  value: number;
  color?: string;
}

export interface DonutChartProps {
  segments: DonutSegment[];
  size?: number;
  thickness?: number;
  /** Rendered in the hole, e.g. a total. */
  centerLabel?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/* ── Analytical charts ──────────────────────────────────────────────────────
 * The four types above are decorative: stretched viewBox, `aria-hidden`, no
 * axis. The ones below are read rather than glanced at, so they draw in real
 * pixels and carry axes, a legend and a table view. See `scale.ts` for why the
 * two families cannot share a geometry.
 */

/** One reserved state colour. Never doubles as a categorical slot. */
export type ChartStatusTone = StatusTone;

/**
 * The shape of a legend swatch.
 *
 * Not decoration: the swatch should look like the MARK it names. In a
 * combination chart — volume as columns behind a rate as a line — a legend
 * where both entries are identical squares fails at the one job it has, which
 * is telling the reader which entry is the line. `bar` reads as a stroke,
 * `square` as a filled region, `circle` as a point, and the outline variants as
 * the hollow versions of each.
 */
export type ChartLegendSwatch =
  | 'square'
  | 'rounded-square'
  | 'rounded-square-outline'
  | 'circle'
  | 'circle-outline'
  | 'bar'
  | 'bar-vertical';

export interface ChartLegendEntry {
  key: string;
  label: string;
  /** Explicit colour wins over `tone`, which wins over the slot order. */
  color?: string;
  tone?: ChartStatusTone;
  /** Match the mark: `bar` for a line series, `square` for an area or column. */
  swatch?: ChartLegendSwatch;
}

export interface TimeSeriesSeries {
  /** Stable identity. Colour follows this, never the row's current rank. */
  key: string;
  label: string;
  /** One entry per bucket; `null` is a gap, drawn as a gap. */
  data: (number | null)[];
  color?: string;
  tone?: ChartStatusTone;
  /**
   * `line` (default) · `area` for a single series carrying the story ·
   * `step` for a value that can only land on a level in `levels` ·
   * `column` for the volume behind a rate, which is the Combination form —
   * still on ONE shared axis, never a second scale.
   */
  mode?: 'line' | 'area' | 'step' | 'column';
  /** Shorthand for `stroke: 'animated-dashed'` — a projection, not a measurement. */
  forecast?: boolean;
  /** Per-series stroke treatment; overrides `forecast`. */
  stroke?: ChartStrokeVariant;
  /** Per-series fill treatment; overrides the chart's `fillVariant`. */
  fillVariant?: ChartFillVariant;
}

export interface TimeSeriesChartProps {
  series: TimeSeriesSeries[];
  /** X tick labels, one per bucket. Length defines the band count. */
  labels: string[];
  height?: number;
  /** Sum the series into bands. Implies `area` for every series. */
  stacked?: boolean;
  /**
   * What a stack's height means.
   *
   * `value` (default) — the bands sum to the real total, so a quiet bucket is
   * visibly shorter than a busy one.
   *
   * `percent` — each bucket is normalised to its own total, so the chart shows
   * COMPOSITION and volume disappears from it entirely. That is the whole point
   * and the whole hazard: a bucket of four requests and a bucket of four
   * thousand draw the same height. Reach for it when the question is "what is
   * the mix", never when it is "how much" — and note the tooltip keeps the raw
   * counts beside the shares precisely because the plot has dropped them.
   */
  stackMode?: ChartStackMode;
  /**
   * Ordinal rungs for the y-axis. Present ⇒ the axis is the level ladder, with
   * equal spacing per rung, and the ticks ARE these values.
   */
  levels?: number[];
  /**
   * How a line gets from one point to the next.
   *
   * `monotone` is the curved option to reach for: it cannot overshoot between
   * two points, so it never draws a peak the data does not contain. `spline` is
   * Catmull-Rom — looser, rounder, and able to bulge past a point on the way to
   * the next one. `bump` is flat AT each sample and moves in between, which is
   * what a rank does. Ignored by `step` and `column`.
   */
  curve?: ChartCurve;
  /** 0 is uniform Catmull-Rom; higher flattens toward straight segments. */
  tension?: number;
  max?: number;
  yTickCount?: number;
  formatValue?: (value: number) => string;
  yAxisLabel?: string;
  /**
   * Horizontal rules across the plot — a warn level, a critical level, an SLO
   * target, a budget.
   *
   * This is the one place a DASHED rule is right, and the reason gridlines are
   * not: a dash reads as "a line someone drew" rather than "a value the data
   * reached", which is exactly what a threshold is. Every rule carries its
   * label on the plot, because an unlabelled line is a mystery.
   */
  referenceLines?: ChartReferenceLine[];
  /** Direct-label the last point of each series, and nothing else. */
  labelEndpoints?: boolean;
  /**
   * Where markers appear. `last` is the default when `labelEndpoints` is on —
   * a value on every point is chaos and goes unread, so the endpoint carries it
   * alone unless the caller asks otherwise.
   */
  dots?: 'none' | 'all' | 'last';
  dotVariant?: ChartDotVariant;
  /**
   * A range strip under the plot. The strip always shows the WHOLE series with
   * the window lit, because a chart that draws only the selection tells the
   * reader nothing about what they are not looking at — and a window chosen
   * inside a spike reads as a plateau once the spike is off-screen.
   *
   * Uncontrolled by default. Pass `range` and `onRangeChange` together to drive
   * it, e.g. to keep two charts on one window.
   */
  brush?: boolean;
  range?: ChartRange;
  onRangeChange?: (range: ChartRange) => void;
  /**
   * Pulse the final marker. It CLAIMS the feed is live, so it is never derived:
   * on a stalled feed a pulsing dot is a lie the reader cannot check, and only
   * the caller knows whether the data is still arriving.
   */
  pulse?: boolean;
  /**
   * FIRST load only — there is no data yet, so show the skeleton. On a refetch
   * the data is already on screen: use `ChartFrame`'s `busy`, which holds the
   * previous render. A skeleton on every poll strobes a live dashboard.
   */
  loading?: boolean;
  /** Reveal on mount. Disabled globally by `prefers-reduced-motion` anyway. */
  animate?: boolean;
  /**
   * Direction of the intro wipe. It is an SVG mask, so fill, stroke and point
   * markers arrive together rather than each on its own schedule.
   */
  reveal?: ChartRevealDirection;
  /** Default fill treatment for every area in the chart. */
  fillVariant?: ChartFillVariant;
  /**
   * `dashed` is available because chart libraries commonly draw it that way.
   * It is not the default: a dashed rule reads as a threshold or a projection,
   * and a gridline is neither.
   */
  gridStyle?: 'solid' | 'dashed';
  /** Overrides the measured width. For SSR and specs. */
  width?: number;
  className?: string;
  emptyLabel?: string;
}

export interface RankedBarsRow {
  key: string;
  label: string;
  value: number;
}

export interface RankedBarsProps {
  rows: RankedBarsRow[];
  /** Value mapped to a full-width bar. Defaults to the largest row. */
  max?: number;
  formatValue?: (value: number) => string;
  /** Highlight one row and recede the rest — the emphasis form. */
  emphasisKey?: string;
  /** Derive that row from the data instead of naming it. */
  highlight?: ChartAutoHighlight;
  emphasisTone?: ChartStatusTone;
  barHeight?: number;
  rowGap?: number;
  animate?: boolean;
  className?: string;
  emptyLabel?: string;
}

/** One filled part of a segmented meter track. */
export interface MeterSegment {
  /** 0–1 of the WHOLE track, not of the remainder. Segments are laid end to
   *  end and HOLD their stated widths, so a set summing past 1 has its tail
   *  clipped at the end of the track rather than every part shrunk to fit —
   *  a rescale would leave the bar disagreeing with the breakdown printed
   *  under it. */
  value: number;
  /** What this part IS — "Shipped", "Loaded". Read out with its share, so the
   *  meaning survives greyscale, CVD and forced-colors like the single-value
   *  form's does. */
  label: string;
  tone?: ChartStatusTone;
}

export interface MeterProps {
  /** 0–1. `null` renders the unavailable state rather than a zero bar. */
  value: number | null | undefined;
  /**
   * Parts of one whole, laid end to end on the same track — "80 of 100 shipped,
   * 15 more picked" rather than two meters or two numbers to subtract.
   *
   * `value` still governs the readout, the ARIA value and the objective
   * verdict, so a segmented meter is the same control with its fill broken up;
   * pass the TOTAL as `value`. The first segment takes that verdict's tone
   * unless it names its own, so the bar and the figure above it never
   * disagree; the rest default to `neutral`. Without this the props behave
   * exactly as before.
   */
  segments?: MeterSegment[];
  /** 0–1. Marked on the track. */
  objective?: number;
  label: string;
  detail?: string;
  formatValue?: (value: number) => string;
  /** Overrides the derived good/critical tone. */
  tone?: ChartStatusTone;
  className?: string;
  unavailableLabel?: string;
}

export interface StatTileProps {
  label: string;
  /** Pre-formatted: the tile does not know the domain's rounding rules. */
  value: ReactNode;
  unit?: string;
  /** Signed change. Rendered with an arrow AND a word, never colour alone. */
  delta?: number;
  deltaTone?: ChartStatusTone;
  trend?: number[];
  trendTone?: ChartStatusTone;
  footnote?: ReactNode;
  className?: string;
}

export interface ChartFrameProps {
  title: string;
  subtitle?: string;
  /** Rendered when there are two or more entries; one series needs no box. */
  legend?: ChartLegendEntry[];
  /** The WCAG-clean twin. Omit only when the chart carries no continuous scale. */
  table?: ReactNode;
  tableLabel?: string;
  /** Refetching: hold the previous render at reduced opacity, never a skeleton. */
  busy?: boolean;
  /**
   * First load, nothing to hold yet. Renders a skeleton in place of `children`.
   * Distinct from `busy` on purpose — see `ChartSkeleton`'s docblock for why
   * collapsing the two is the mistake.
   */
  loading?: boolean;
  /**
   * Legend entries recede the other series on hover and focus. On by default —
   * turn it off only when the legend keys are not series keys.
   */
  interactiveLegend?: boolean;
  /** Fallback swatch for entries that do not name their own. */
  legendSwatch?: ChartLegendSwatch;
  /** Match the skeleton to the chart it stands in for. */
  skeletonVariant?: 'area' | 'bars';
  /** The skeleton's height. Defaults to a chart-sized block. */
  skeletonHeight?: number;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

/* ── The wider chart family ─────────────────────────────────────────────────
 * Twenty-seven entries in a typical chart picker collapse to these, because
 * several of the listed "types" are one component with a variant: candlestick
 * and OHLC carry identical data, radar area and radar line differ by a fill,
 * funnel and cone by a taper, pie and Nightingale by whether value is angle or
 * radius. Shipping them separately would duplicate the scale, the axis, the
 * hover and the colour rule four times over, and then let the copies drift.
 */

export interface ChartTooltipRow {
  key: string;
  label: ReactNode;
  /** Pre-formatted. `null`/`undefined` renders an em dash, never a zero. */
  value?: ReactNode;
  color?: string;
}

export interface ChartTooltipProps {
  /**
   * The surface the card is drawn on.
   *
   * `solid` (default) is the readable one and the right choice over a busy
   * plot. `glass` is the frosted variant — it reuses this package's own
   * `glassStyle()`, which matters more than the look: that helper already
   * returns an OPAQUE surface when the user has "Reduce transparency" on,
   * because the global stylesheet strips `backdrop-filter` and a translucent
   * card with the blur gone is a card you cannot read the numbers through.
   */
  variant?: 'solid' | 'glass';
  title?: ReactNode;
  /** In STACK order — bottom segment first, the way the column is read. */
  rows: ChartTooltipRow[];
  footnote?: ReactNode;
  /** Dim every row but this one. */
  emphasisKey?: string;
  className?: string;
}

export interface ChartSkeletonProps {
  height?: number;
  width?: number;
  /** Match the chart it stands in for, so the arriving chart does not jump. */
  variant?: 'area' | 'bars';
  bars?: number;
  label?: string;
  className?: string;
}

export type ChartStackMode = 'value' | 'percent';

/**
 * Which category to light without a pointer.
 *
 * `max` and `min` are derived from the data, so the highlight follows the data
 * rather than a hard-coded label — a peak named in a prop goes stale the moment
 * the window moves, and goes silently stale, which is worse. `last` is the
 * live-dashboard case: the most recent bucket is the one being watched.
 */
export type ChartAutoHighlight = 'none' | 'max' | 'min' | 'last';

export type ChartDotVariant = 'default' | 'border' | 'colored-border';

export interface ChartDotProps {
  cx: number;
  cy: number;
  color: string;
  variant?: ChartDotVariant;
  /** A pulsing halo. Asserts the reading is LIVE — see ChartDot's docblock. */
  pulse?: boolean;
  title?: string;
}

/** `[fromIndex, toIndex]`, inclusive, into the chart's own label list. */
export type ChartRange = [number, number];

export interface ChartBrushProps {
  labels: string[];
  /** The full series, in miniature. `null` is a gap, drawn as one. */
  data: (number | null)[];
  range: ChartRange;
  onRangeChange: (range: ChartRange) => void;
  height?: number;
  width?: number;
  color?: string;
  className?: string;
}

export interface ChartReferenceLine {
  /** Where on the value axis the rule sits. */
  value: number;
  /** Named on the rule itself — an unlabelled line is a mystery, not a threshold. */
  label?: string;
  tone?: ChartStatusTone;
  color?: string;
}

export type ChartCurve = Curve;

/**
 * Fill treatments. The textured ones are not decoration: a hatch is what a
 * colour-vision or forced-colors reader needs when hue alone stops separating
 * two series, which is why texture is a variant rather than a hack.
 */
export type ChartFillVariant =
  | 'gradient'
  | 'gradient-reverse'
  | 'solid'
  | 'dotted'
  | 'lines'
  | 'hatched'
  | 'duotone'
  | 'striped'
  | 'blocks';

export type ChartStrokeVariant = 'solid' | 'dashed' | 'animated-dashed';

export type ChartRevealDirection = 'left-to-right' | 'right-to-left' | 'center-out';

export type ChartBackgroundVariant =
  | 'none' | 'dots' | 'grid' | 'cross-hatch' | 'diagonal-lines' | 'plus';

export interface ColumnSeries {
  key: string;
  label: string;
  data: (number | null)[];
  color?: string;
  tone?: ChartStatusTone;
}

export interface ColumnChartProps {
  series: ColumnSeries[];
  labels: string[];
  stacked?: boolean;
  /** See `TimeSeriesChartProps.stackMode`. */
  stackMode?: ChartStackMode;
  height?: number;
  width?: number;
  max?: number;
  formatValue?: (value: number) => string;
  yAxisLabel?: string;
  className?: string;
  emptyLabel?: string;
  radius?: number;
  loading?: boolean;
  animate?: boolean;
  /**
   * A soft outer bloom on the ACTIVE bar only. Off by default — it is an
   * accent, and a chart where every mark glows has no emphasis left to give.
   */
  glow?: boolean;
  /**
   * On hover, recede every other mark to the de-emphasis ink instead of merely
   * fading it. Fading keeps eight competing hues on screen at reduced contrast;
   * receding leaves exactly one thing coloured, which is the point.
   */
  emphasise?: boolean;
  /**
   * Highlight this category with no pointer involved.
   *
   * Precedence is pointer > `activeKey` > `highlight`. The pointer always wins,
   * because a highlight that ignores where the reader is looking is worse than
   * none; and an explicit key beats a derived one, because a caller naming a
   * category has a reason the data cannot know.
   */
  activeKey?: string;
  /** Derive the highlighted category from the data. See `ChartAutoHighlight`. */
  highlight?: ChartAutoHighlight;
}

export interface ScatterPoint {
  x: number;
  y: number;
  /** Encoded as AREA, so it is square-rooted before it becomes a radius. */
  size?: number;
  label?: string;
}

export interface ScatterSeries {
  key: string;
  label: string;
  points: ScatterPoint[];
  color?: string;
  tone?: ChartStatusTone;
}

export interface ScatterChartProps {
  /** Capped at three: an all-pairs form, and the palette clears three slots. */
  series: ScatterSeries[];
  height?: number;
  width?: number;
  xLabel?: string;
  yLabel?: string;
  formatX?: (value: number) => string;
  formatY?: (value: number) => string;
  /**
   * Override the axis domain instead of deriving it from the data.
   *
   * The derived one rounds its top up to a "nice" number, which is right for a
   * value the reader compares against a round target and wasteful for one they
   * do not: a maximum of 33,000 becomes an axis to 50,000, spending a third of
   * the plot on emptiness. Pass a domain when the data's own extent is the
   * interesting range.
   */
  xDomain?: [number, number];
  yDomain?: [number, number];
  /**
   * `log` for a long tail — per-route counts where most points sit near the
   * origin and a few run orders of magnitude past them. On a linear axis those
   * many collapse into one clump and the chart only answers for the outliers.
   * The domain floor is raised to 1, since zero has no logarithm.
   */
  xScale?: 'linear' | 'log';
  yScale?: 'linear' | 'log';
  radiusRange?: [number, number];
  className?: string;
  emptyLabel?: string;
}

export interface RangeRow { low: number; high: number }

export interface RangeChartProps {
  rows: RangeRow[];
  labels: string[];
  /** `area` for a continuous span, `bar` for discrete ones. */
  variant?: 'area' | 'bar';
  curve?: ChartCurve;
  height?: number;
  width?: number;
  max?: number;
  min?: number;
  formatValue?: (value: number) => string;
  yAxisLabel?: string;
  color?: string;
  tone?: ChartStatusTone;
  label?: string;
  className?: string;
  emptyLabel?: string;
  radius?: number;
}

export interface WaterfallStep {
  label: string;
  /** Signed contribution. Ignored when `total` is set. */
  value: number;
  /** An anchored bar showing the running balance, not a contribution. */
  total?: boolean;
}

export interface WaterfallChartProps {
  steps: WaterfallStep[];
  height?: number;
  width?: number;
  formatValue?: (value: number) => string;
  yAxisLabel?: string;
  className?: string;
  emptyLabel?: string;
  radius?: number;
  connectors?: boolean;
}

export interface HistogramBin { from: number; to: number; count: number }

export interface HistogramChartProps {
  /** Raw observations. Ignored when `precomputed` is given. */
  values?: number[];
  /** A bin count, or the boundaries themselves when the domain has real edges. */
  bins?: number | number[];
  /** Already binned — for a backend that owns the bucket bounds. */
  precomputed?: HistogramBin[];
  height?: number;
  width?: number;
  color?: string;
  tone?: ChartStatusTone;
  formatBound?: (value: number) => string;
  formatCount?: (value: number) => string;
  yAxisLabel?: string;
  label?: string;
  className?: string;
  emptyLabel?: string;
}

export interface BoxPlotBox {
  label: string;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  outliers?: number[];
}

export interface BoxPlotChartProps {
  boxes: BoxPlotBox[];
  height?: number;
  width?: number;
  color?: string;
  tone?: ChartStatusTone;
  formatValue?: (value: number) => string;
  yAxisLabel?: string;
  label?: string;
  className?: string;
  emptyLabel?: string;
}

export interface Candle {
  label: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface CandlestickChartProps {
  candles: Candle[];
  /** `candle` fills the open-to-close body; `ohlc` shows it as two ticks. */
  variant?: 'candle' | 'ohlc';
  height?: number;
  width?: number;
  formatValue?: (value: number) => string;
  yAxisLabel?: string;
  label?: string;
  className?: string;
  emptyLabel?: string;
}

export interface HeatmapChartProps {
  rows: string[];
  columns: string[];
  /** `cells[row][column]`. */
  cells: number[][];
  height?: number;
  width?: number;
  /** The single sequential hue. Never a rainbow. */
  color?: string;
  max?: number;
  formatValue?: (value: number) => string;
  label?: string;
  className?: string;
  emptyLabel?: string;
  cellGap?: number;
  cellRadius?: number;
}

export interface RadarAxis {
  key: string;
  label: string;
  /** Per-axis maximum, so a metric in thousands cannot flatten one in tens. */
  max?: number;
}

export interface RadarSeries {
  key: string;
  label: string;
  /** One value per axis, in axis order. */
  values: number[];
  color?: string;
  tone?: ChartStatusTone;
}

export interface RadarChartProps {
  /** Three or more. Six of them draw the hexagon. */
  axes: RadarAxis[];
  /** Capped at three: an all-pairs form. */
  series: RadarSeries[];
  size?: number;
  mode?: 'area' | 'line';
  /** `polygon` (one vertex per axis) or `circle` for sampled continua. */
  grid?: 'polygon' | 'circle';
  rings?: number;
  formatValue?: (value: number) => string;
  animate?: boolean;
  className?: string;
  emptyLabel?: string;
}

export interface PieSegment {
  key: string;
  label: string;
  value: number;
  color?: string;
  tone?: ChartStatusTone;
}

export interface PieChartProps {
  segments: PieSegment[];
  /** `pie` · `ring` · `rose` (Nightingale: equal angles, radius carries value). */
  variant?: 'pie' | 'ring' | 'rose';
  size?: number;
  innerRadius?: number;
  padAngle?: number;
  /** Past this the tail folds into one segment rather than growing hues. */
  maxSegments?: number;
  otherLabel?: string;
  formatValue?: (value: number) => string;
  centerLabel?: ReactNode;
  animate?: boolean;
  /**
   * Where slice labels go.
   *
   * `none` (default) leaves the legend to do it. `outside` draws a leader line
   * from each wedge to a label beyond the circle — the answer to a small slice
   * whose name will not fit inside it, and the reason a pie can carry names at
   * all without a legend.
   *
   * Outside labels are still capped: below `labelMinShare` a wedge gets no
   * label, because a dozen leader lines fanning out at small slices is less
   * readable than the legend that is already there, not more.
   */
  labels?: 'none' | 'outside';
  /** Slices below this share (0–1) go unlabelled. */
  labelMinShare?: number;
  className?: string;
  emptyLabel?: string;
}

export interface RadialBarRow {
  key: string;
  label: string;
  value: number;
  color?: string;
  tone?: ChartStatusTone;
}

export interface RadialBarChartProps {
  rows: RadialBarRow[];
  /** `track` for gauges against their own 100%, `column` for cyclical categories. */
  variant?: 'track' | 'column';
  size?: number;
  max?: number;
  formatValue?: (value: number) => string;
  animate?: boolean;
  className?: string;
  emptyLabel?: string;
  trackGap?: number;
}

export interface FunnelStage {
  key: string;
  label: string;
  value: number;
}

export interface FunnelChartProps {
  stages: FunnelStage[];
  /** `cone` tapers each band toward the next stage's width. */
  shape?: 'funnel' | 'cone';
  height?: number;
  width?: number;
  gap?: number;
  formatValue?: (value: number) => string;
  /** The single hue the ordinal ramp steps through. */
  color?: string;
  className?: string;
  emptyLabel?: string;
}

export interface TreemapChartProps {
  items: { key: string; label: string; value: number }[];
  height?: number;
  width?: number;
  gap?: number;
  radius?: number;
  formatValue?: (value: number) => string;
  color?: string;
  className?: string;
  emptyLabel?: string;
}

export interface SunburstNode {
  key: string;
  label: string;
  /** Leaves carry a value; branches sum their children. */
  value?: number;
  children?: SunburstNode[];
}

export interface SunburstChartProps {
  nodes: SunburstNode[];
  size?: number;
  innerRadius?: number;
  ringGap?: number;
  formatValue?: (value: number) => string;
  centerLabel?: ReactNode;
  className?: string;
  emptyLabel?: string;
}

export interface SankeyNode {
  key: string;
  label: string;
  /** Column index. Nodes are laid out in the order given within a column. */
  depth: number;
  value?: number;
  color?: string;
  tone?: ChartStatusTone;
}

export interface SankeyLink {
  from: string;
  to: string;
  value: number;
  color?: string;
}

export interface SankeyChartProps {
  nodes: SankeyNode[];
  links: SankeyLink[];
  height?: number;
  width?: number;
  nodeWidth?: number;
  nodePadding?: number;
  formatValue?: (value: number) => string;
  className?: string;
  emptyLabel?: string;
}

export interface ChordChartProps {
  labels: string[];
  /** `matrix[from][to]`. Square, same order as `labels`. */
  matrix: number[][];
  size?: number;
  /** Past this the ribbons occlude each other; the tail is dropped. */
  maxNodes?: number;
  padAngle?: number;
  arcWidth?: number;
  formatValue?: (value: number) => string;
  className?: string;
  emptyLabel?: string;
}
