/**
 * Scale primitives — the piece the existing charts never needed.
 *
 * `Sparkline`, `BarChart`, `DonutChart` and `LineChart` are decorative: a
 * stretched `0 0 100 100` viewBox, `aria-hidden`, no axis, numbers carried as
 * text elsewhere on the page. That is the right shape for a dashboard tile and
 * the wrong one for a chart someone reads values off, because a stretched
 * viewBox stretches TEXT — an axis label in it is squashed or smeared by
 * whatever aspect ratio the container happens to have.
 *
 * So the analytical charts draw in real pixel space, and that means they need
 * scales. The split is borrowed from visx, which separates `@visx/scale` and
 * `@visx/axis` from any chart type at all: a scale is a pure function from a
 * data value to a pixel, nothing more, and everything else composes on top.
 * Keeping it a plain function (rather than pulling in d3-scale) also keeps this
 * package's dependency count where it is — zero.
 */

/** A pixel range, from the low edge to the high edge, in SVG coordinates. */
export interface Range {
  /** Pixel at the domain minimum. For y this is the BOTTOM, so it is larger. */
  from: number;
  /** Pixel at the domain maximum. */
  to: number;
}

export interface LinearScale {
  (value: number): number;
  domain: [number, number];
  range: Range;
  /** Evenly spaced domain values, for axis ticks. */
  ticks(count: number): number[];
}

/**
 * A continuous value → pixel mapping.
 *
 * A zero-width domain maps everything to the low edge rather than dividing by
 * zero: one flat series is a real case (a percentile pinned to one bound for a
 * whole window), and it should draw a flat line, not `NaN`.
 */
export function linearScale(
  domain: [number, number],
  range: Range,
): LinearScale {
  const [lo, hi] = domain;
  const span = hi - lo;
  const scale = ((value: number) => {
    if (span === 0) return range.from;
    return range.from + ((value - lo) / span) * (range.to - range.from);
  }) as LinearScale;
  scale.domain = domain;
  scale.range = range;
  scale.ticks = (count: number) => {
    if (count < 2) return [lo];
    return Array.from({ length: count }, (_, i) => lo + (span * i) / (count - 1));
  };
  return scale;
}

export interface BandScale {
  (index: number): number;
  /** Width of one band, gaps already removed. */
  bandwidth: number;
  /** Centre of band `index` — where a tick label or a point marker belongs. */
  center(index: number): number;
  /** Right edge of band `index`. A step segment runs from `(i)` to `end(i)`. */
  end(index: number): number;
  count: number;
}

/**
 * An index → band mapping, for anything drawn per bucket: bars, step segments,
 * a state ribbon, the hit target under a crosshair.
 *
 * `padding` is the fraction of a band left as gap — `0` for a continuous step
 * chart where segments must touch, `0.2` or so for bars that need daylight
 * between them. The gap is the design-system way to separate adjacent marks;
 * a stroke around each bar is the way that reads as noise.
 */
export function bandScale(
  count: number,
  range: Range,
  padding = 0,
): BandScale {
  const width = count > 0 ? (range.to - range.from) / count : 0;
  const gap = width * padding;
  const scale = ((index: number) => range.from + index * width + gap / 2) as BandScale;
  scale.bandwidth = Math.max(0, width - gap);
  scale.center = (index: number) => range.from + index * width + width / 2;
  scale.end = (index: number) => range.from + (index + 1) * width - gap / 2;
  scale.count = count;
  return scale;
}

export interface LadderScale {
  (value: number): number;
  /** The rungs, ascending — these are the axis ticks, by definition. */
  levels: number[];
  /** Rung index for a value, or -1 when it is not on the ladder. */
  indexOf(value: number): number;
  range: Range;
}

/**
 * An ORDINAL scale over a known set of levels, spaced evenly regardless of
 * their numeric distance.
 *
 * This exists for quantised measures — the ones whose value can only ever land
 * on a boundary. Histogram-derived percentiles are the case that forced it: a
 * backend returning the first bucket bound to reach P95 can only ever answer
 * 25, 50, 100, 250, 500, 1000, 2500 or 5000, and plotting those on a linear
 * millisecond axis crushes the bottom five rungs into a twentieth of the plot
 * while implying the gap from 2500 to 5000 is meaningful resolution. Equal
 * spacing per rung is the honest geometry, and it makes the quantisation
 * visible instead of hiding it under a smooth line.
 *
 * A value off the ladder snaps to the nearest rung at or above it, and to the
 * top rung when it exceeds every level — which is what an overflow bucket
 * means and how it should draw.
 */
export function ladderScale(levels: number[], range: Range): LadderScale {
  const rungs = [...levels].sort((a, b) => a - b);
  const last = Math.max(0, rungs.length - 1);
  const at = (index: number) =>
    last === 0 ? range.from : range.from + (index / last) * (range.to - range.from);
  const scale = ((value: number) => {
    const exact = rungs.indexOf(value);
    if (exact >= 0) return at(exact);
    const above = rungs.findIndex(rung => rung >= value);
    return at(above === -1 ? last : above);
  }) as LadderScale;
  scale.levels = rungs;
  scale.indexOf = (value: number) => rungs.indexOf(value);
  scale.range = range;
  return scale;
}

/**
 * Round a domain maximum up to a readable tick value — 1, 2, 2.5 or 5 times a
 * power of ten. Without it an axis tops out at 16.55 and prints 16.55, 8.28, 0.
 */
export function niceMax(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalised = value / magnitude;
  const step = normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 2.5 ? 2.5 : normalised <= 5 ? 5 : 10;
  return step * magnitude;
}

export interface AngleScale {
  (index: number): number;
  /** Radians per slot. */
  step: number;
  /** Centre angle of slot `index` — where a radar vertex or a label sits. */
  center(index: number): number;
  count: number;
}

/**
 * An index → angle mapping over a full turn, starting at twelve o'clock.
 *
 * Shared by everything polar: pie and rose wedges, radial bars, radar axes, and
 * the ring of a sunburst. Starting at -90° rather than 0° is the convention
 * every chart library lands on, because a reader expects the first slice at the
 * top; `padAngle` is the gap between marks, which is how adjacent wedges are
 * separated without drawing a border around each one.
 */
export function angleScale(count: number, padAngle = 0): AngleScale {
  const step = count > 0 ? (Math.PI * 2) / count : 0;
  const scale = ((index: number) => -Math.PI / 2 + index * step + padAngle / 2) as AngleScale;
  scale.step = Math.max(0, step - padAngle);
  scale.center = (index: number) => -Math.PI / 2 + index * step + step / 2;
  scale.count = count;
  return scale;
}

/**
 * Value → RADIUS, area-proportional.
 *
 * The one scale that must not be linear. A bubble's meaning is carried by its
 * area, and area grows with the square of the radius — so mapping a value
 * straight to a radius makes a doubled value look four times as big. Every
 * serious library square-roots this, and the bug is common enough in ones that
 * do not that it is worth the separate function.
 */
export function radiusScale(
  domain: [number, number],
  range: Range,
): (value: number) => number {
  const [lo, hi] = domain;
  const span = Math.sqrt(Math.max(0, hi)) - Math.sqrt(Math.max(0, lo));
  return (value: number) => {
    if (span === 0) return range.to;
    const t = (Math.sqrt(Math.max(0, value)) - Math.sqrt(Math.max(0, lo))) / span;
    return range.from + Math.min(1, Math.max(0, t)) * (range.to - range.from);
  };
}

/** Bin a set of observations into evenly spaced buckets, for a histogram. */
export function binValues(
  values: number[],
  binCount = 10,
): { from: number; to: number; count: number }[] {
  if (values.length === 0 || binCount < 1) return [];
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const width = (hi - lo) / binCount || 1;
  const bins = Array.from({ length: binCount }, (_, i) => ({
    from: lo + i * width,
    to: lo + (i + 1) * width,
    count: 0,
  }));
  for (const value of values) {
    // The top bin is closed on both sides, so the maximum lands in it rather
    // than in an imaginary bin past the end.
    const index = Math.min(binCount - 1, Math.floor((value - lo) / width));
    bins[index].count += 1;
  }
  return bins;
}
