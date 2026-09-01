/**
 * Path builders — the shape a line takes between two points.
 *
 * Split out of the chart components because the choice is a claim about the
 * data, not a style preference, and three different charts need to make it:
 *
 *   linear     the value moved directly from A to B. The default, and the only
 *              honest one when the samples are all you know.
 *   monotone   a smooth curve that CANNOT overshoot between two points. If the
 *              data rises from A to B, so does the curve — no local bump, no
 *              invented peak. The curved option to reach for by default.
 *   spline     Catmull-Rom. Looser and rounder, and it can bulge past a point
 *              on the way to the next one: 10, 20, 21 draws a hump above 21
 *              that the data does not contain. Clamped to the data's overall
 *              range, so it cannot leave the plot, but a LOCAL invention is
 *              still an invention. Kept for when the looser shape is wanted
 *              knowingly.
 *   step       the value HELD at A until B. Right for anything quantised or
 *              state-like, and the reason `TimeSeriesChart` has a step mode at
 *              all: joining two histogram bounds with a slope draws a
 *              transition that never happened.
 *   bump       flat AT each point, curved between them. The shape a rank takes:
 *              third place is third place for the whole month and then moves,
 *              so the tangent at the sample is horizontal and all the change
 *              happens in the gap. It is also the shape of a flow between two
 *              nodes, which is why `SankeyChart` draws its ribbons with it.
 *
 * The spline is Catmull-Rom converted to cubic Bézier, which is the standard
 * trick — it passes THROUGH the data (a plain Bézier would not) and needs no
 * solver. `tension` 0 gives the classic uniform Catmull-Rom; higher values
 * flatten it toward straight segments.
 *
 * One thing a spline cannot be allowed to do is invent a value outside the
 * data's range — a smooth curve through 0, 10, 0 will dip below zero on the way
 * out and back, and on a count that reads as negative requests. `clampY` pulls
 * the control points back inside the span the points actually occupy.
 */

export type Curve = 'linear' | 'monotone' | 'spline' | 'step' | 'bump';

export type Point = [number, number];

const fixed = (n: number) => n.toFixed(2);

export function linearPath(points: Point[]): string {
  return points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${fixed(x)},${fixed(y)}`).join(' ');
}

/**
 * Flat across each band, vertical only at the boundary. Takes bands rather than
 * points because a held value occupies an interval, not an instant.
 */
export function stepPath(bands: { start: number; end: number; y: number }[]): string {
  let d = '';
  bands.forEach((band, i) => {
    d += `${i === 0 ? 'M' : ' L'}${fixed(band.start)},${fixed(band.y)}`;
    d += ` L${fixed(band.end)},${fixed(band.y)}`;
  });
  return d;
}

/**
 * Fritsch–Carlson monotone cubic interpolation.
 *
 * The tangent at each point starts as the average of its two neighbouring
 * secants, then gets pulled back until it cannot produce an overshoot. That
 * limiting step is the whole algorithm: without it this is an ordinary cubic
 * spline that bulges past the data between samples, and a bulge on a count is a
 * value nobody measured.
 *
 * Works unchanged in SVG's flipped y-axis — monotonicity survives negation.
 */
export function monotonePath(points: Point[]): string {
  if (points.length < 3) return linearPath(points);

  const n = points.length;
  const dx: number[] = [];
  const secant: number[] = [];
  for (let i = 0; i < n - 1; i += 1) {
    const h = points[i + 1][0] - points[i][0];
    dx.push(h);
    // A repeated x has no slope; treat the segment as flat rather than
    // dividing by zero.
    secant.push(h === 0 ? 0 : (points[i + 1][1] - points[i][1]) / h);
  }

  const m: number[] = [secant[0]];
  for (let i = 1; i < n - 1; i += 1) {
    // At a local extremum the two secants disagree in sign, and ANY non-zero
    // tangent there is an overshoot by construction: the curve would have to
    // leave the data's range and come back. The magnitude test below cannot
    // catch this — it squares alpha and beta, which throws away exactly the
    // sign that says the tangent points the wrong way — so a peak has to be
    // flattened here, before that test ever runs.
    m.push(secant[i - 1] * secant[i] <= 0 ? 0 : (secant[i - 1] + secant[i]) / 2);
  }
  m.push(secant[n - 2]);

  for (let i = 0; i < n - 1; i += 1) {
    if (secant[i] === 0) {
      // A flat segment must stay flat, or the curve dips and returns through a
      // value the data says never changed.
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const alpha = m[i] / secant[i];
    const beta = m[i + 1] / secant[i];
    const magnitude = alpha * alpha + beta * beta;
    if (magnitude > 9) {
      const tau = 3 / Math.sqrt(magnitude);
      m[i] = tau * alpha * secant[i];
      m[i + 1] = tau * beta * secant[i];
    }
  }

  let d = `M${fixed(points[0][0])},${fixed(points[0][1])}`;
  for (let i = 0; i < n - 1; i += 1) {
    const h = dx[i] / 3;
    d += ` C${fixed(points[i][0] + h)},${fixed(points[i][1] + m[i] * h)}`
      + ` ${fixed(points[i + 1][0] - h)},${fixed(points[i + 1][1] - m[i + 1] * h)}`
      + ` ${fixed(points[i + 1][0])},${fixed(points[i + 1][1])}`;
  }
  return d;
}

export function splinePath(points: Point[], tension = 0): string {
  if (points.length < 3) return linearPath(points);

  const ys = points.map(p => p[1]);
  const lo = Math.min(...ys);
  const hi = Math.max(...ys);
  const clampY = (y: number) => Math.min(hi, Math.max(lo, y));
  const factor = (1 - tension) / 6;

  let d = `M${fixed(points[0][0])},${fixed(points[0][1])}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) * factor;
    const c1y = clampY(p1[1] + (p2[1] - p0[1]) * factor);
    const c2x = p2[0] - (p3[0] - p1[0]) * factor;
    const c2y = clampY(p2[1] - (p3[1] - p1[1]) * factor);
    d += ` C${fixed(c1x)},${fixed(c1y)} ${fixed(c2x)},${fixed(c2y)} ${fixed(p2[0])},${fixed(p2[1])}`;
  }
  return d;
}

/**
 * Horizontal tangents at every point: out of A flat, into B flat, all the
 * movement in between. The control points sit at the midpoint x of each pair,
 * which is what makes both ends level.
 */
export function bumpPath(points: Point[]): string {
  if (points.length < 2) return linearPath(points);
  let d = `M${fixed(points[0][0])},${fixed(points[0][1])}`;
  for (let i = 1; i < points.length; i += 1) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    const mid = (x0 + x1) / 2;
    d += ` C${fixed(mid)},${fixed(y0)} ${fixed(mid)},${fixed(y1)} ${fixed(x1)},${fixed(y1)}`;
  }
  return d;
}

export function curvePath(points: Point[], curve: Curve = 'linear', tension = 0): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M${fixed(points[0][0])},${fixed(points[0][1])}`;
  if (curve === 'monotone') return monotonePath(points);
  if (curve === 'spline') return splinePath(points, tension);
  if (curve === 'bump') return bumpPath(points);
  return linearPath(points);
}

/** Close a line into an area against a flat baseline. */
export function areaFrom(path: string, points: Point[], baselineY: number): string {
  if (points.length === 0) return '';
  const first = points[0];
  const last = points[points.length - 1];
  return `${path} L${fixed(last[0])},${fixed(baselineY)} L${fixed(first[0])},${fixed(baselineY)} Z`;
}

/** Close a line onto another line — a band, or one layer of a stack. */
export function areaBetween(topPath: string, bottom: Point[]): string {
  if (bottom.length === 0) return topPath;
  const back = [...bottom].reverse().map(([x, y]) => `${fixed(x)},${fixed(y)}`).join(' L');
  return `${topPath} L${back} Z`;
}

/** A regular polygon's vertices — six of them is the hexagon a radar draws. */
export function polygonPoints(
  cx: number, cy: number, radius: number, sides: number, rotation = -Math.PI / 2,
): Point[] {
  return Array.from({ length: sides }, (_, i) => {
    const angle = rotation + (i * 2 * Math.PI) / sides;
    return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)] as Point;
  });
}

/** An SVG arc wedge, used by pie, rose, radial bar and sunburst alike. */
export function arcPath(
  cx: number, cy: number, inner: number, outer: number, startAngle: number, endAngle: number,
): string {
  const sweep = endAngle - startAngle;
  // A full turn cannot be drawn as one arc — the start and end points coincide,
  // so the renderer draws nothing. Split it in half.
  if (Math.abs(sweep) >= Math.PI * 2) {
    const mid = startAngle + Math.PI;
    return `${arcPath(cx, cy, inner, outer, startAngle, mid)} ${arcPath(cx, cy, inner, outer, mid, startAngle + Math.PI * 2)}`;
  }
  const large = Math.abs(sweep) > Math.PI ? 1 : 0;
  const p = (r: number, a: number): Point => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const [ox1, oy1] = p(outer, startAngle);
  const [ox2, oy2] = p(outer, endAngle);
  if (inner <= 0) {
    return `M${fixed(cx)},${fixed(cy)} L${fixed(ox1)},${fixed(oy1)} A${fixed(outer)},${fixed(outer)} 0 ${large} 1 ${fixed(ox2)},${fixed(oy2)} Z`;
  }
  const [ix2, iy2] = p(inner, endAngle);
  const [ix1, iy1] = p(inner, startAngle);
  return `M${fixed(ox1)},${fixed(oy1)} A${fixed(outer)},${fixed(outer)} 0 ${large} 1 ${fixed(ox2)},${fixed(oy2)} L${fixed(ix2)},${fixed(iy2)} A${fixed(inner)},${fixed(inner)} 0 ${large} 0 ${fixed(ix1)},${fixed(iy1)} Z`;
}
