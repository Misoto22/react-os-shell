/**
 * Chart primitives — the geometry, the palette and the motion layer, tested
 * without a chart in sight.
 *
 * These are pure functions and inert tokens, so they are worth asserting on
 * directly: a curve that overshoots is a defect whether or not any chart
 * currently draws with it, and finding that through a rendered component means
 * reading a path string back out of markup to reach the same fact.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { curvePath, splinePath, monotonePath, bumpPath, linearPath, stepPath, areaFrom, areaBetween, polygonPoints, arcPath } from '../src/charts/curve';
import { linearScale, bandScale, ladderScale, niceMax, angleScale, radiusScale, binValues } from '../src/charts/scale';
import { squarify } from '../src/charts/treemapLayout';
import { SERIES_VARS, SERIES_SLOT_COUNT, STATUS_VARS, CHART_INK, seriesColor, resolveSeriesColor } from '../src/charts/palette';

/** The histogram bounds the latency ladder is built from. */
const BOUNDS = [25, 50, 100, 250, 500, 1000, 2500, 5000];

// ── curves ──────────────────────────────────────────────────────────────────

test('a spline passes through every data point, unlike a plain Bézier', () => {
  const points: [number, number][] = [[0, 100], [50, 20], [100, 60], [150, 40]];
  const d = splinePath(points);
  for (const [x, y] of points) assert.ok(d.includes(`${x.toFixed(2)},${y.toFixed(2)}`), `missing ${x},${y}`);
});

test('a spline never overshoots the data’s own range', () => {
  // Smoothing through 0 → 10 → 0 wants to dip past zero on the way out and
  // back. On a count that would draw negative requests.
  const points: [number, number][] = [[0, 100], [50, 0], [100, 100]];
  const numbers = [...splinePath(points).matchAll(/,(-?[\d.]+)/g)].map(m => Number(m[1]));
  assert.ok(Math.min(...numbers) >= 0, `overshot below the range: ${Math.min(...numbers)}`);
  assert.ok(Math.max(...numbers) <= 100, `overshot above the range: ${Math.max(...numbers)}`);
});

test('two points are a straight line whatever the curve asks for', () => {
  assert.equal(curvePath([[0, 0], [10, 10]], 'spline'), 'M0.00,0.00 L10.00,10.00');
});

test('a hexagon is six vertices — the shape follows the axis count', () => {
  assert.equal(polygonPoints(0, 0, 10, 6).length, 6);
  assert.equal(polygonPoints(0, 0, 10, 5).length, 5);
});

test('a full-turn arc is split in two, or it draws nothing at all', () => {
  // Start and end coincide on a complete circle, so one arc command renders
  // empty. Every donut at 100% would silently vanish.
  const d = arcPath(50, 50, 20, 40, 0, Math.PI * 2);
  assert.equal([...d.matchAll(/A/g)].length, 4, 'two wedges, two arcs each');
});

// ── scales ──────────────────────────────────────────────────────────────────

test('bubble radius is square-rooted, so AREA carries the value', () => {
  const r = radiusScale([0, 100], { from: 0, to: 10 });
  // Quadruple the value → double the radius → quadruple the area.
  assert.ok(Math.abs(r(25) - 5) < 1e-9, `${r(25)}`);
  assert.ok(Math.abs(r(100) - 10) < 1e-9, `${r(100)}`);
});

test('the angle scale starts at twelve o’clock', () => {
  assert.equal(angleScale(4)(0), -Math.PI / 2);
});

test('the top histogram bin is closed, so the maximum lands inside it', () => {
  const bins = binValues([0, 1, 2, 3, 4, 5], 5);
  assert.equal(bins.length, 5);
  assert.equal(bins.reduce((n, b) => n + b.count, 0), 6, 'no observation fell off the end');
});

// ── treemap layout ──────────────────────────────────────────────────────────

test('squarify tiles the whole rectangle without overlapping', () => {
  const items = [1, 2, 3, 5, 8, 13].map((v, i) => ({ key: `k${i}`, label: `k${i}`, value: v }));
  const tiles = squarify(items, 400, 300);
  assert.equal(tiles.length, items.length);
  const area = tiles.reduce((n, t) => n + t.width * t.height, 0);
  assert.ok(Math.abs(area - 400 * 300) < 1, `covered ${area} of 120000`);
});

test('squarify beats naive slicing on the worst aspect ratio', () => {
  const items = Array.from({ length: 12 }, (_, i) => ({ key: `k${i}`, label: `k${i}`, value: 12 - i }));
  const tiles = squarify(items, 400, 300);
  const worst = Math.max(...tiles.map(t => Math.max(t.width / t.height, t.height / t.width)));
  // Strict slicing would put the smallest of twelve in a sliver well past 10:1.
  assert.ok(worst < 6, `worst aspect ratio ${worst.toFixed(2)}`);
});

test('squarify hands back the caller’s values, not its internal areas', () => {
  const tiles = squarify([{ key: 'a', label: 'a', value: 7 }, { key: 'b', label: 'b', value: 3 }], 100, 100);
  assert.equal(tiles.find(t => t.key === 'a')?.value, 7);
});

// ── the bump curve ──────────────────────────────────────────────────────────

test('a bump leaves and arrives FLAT — the change happens in the gap', () => {
  // The shape a rank takes: third place is third place all month and then
  // moves. Both control points share their y with the endpoint they belong to,
  // which is what makes the tangent horizontal.
  const d = bumpPath([[0, 100], [100, 20]]);
  const [, c1y, , c2y] = /C([\d.]+),([\d.]+) ([\d.]+),([\d.]+)/.exec(d)!.slice(1).map(Number);
  assert.equal(c1y, 100, 'the first control point is level with the start');
  assert.equal(c2y, 20, 'the second is level with the end');
});

test('the control points sit at the midpoint x, so the curve is symmetric', () => {
  const d = bumpPath([[0, 0], [100, 50]]);
  const [c1x, , c2x] = /C([\d.]+),[\d.]+ ([\d.]+),([\d.]+)/.exec(d)!.slice(1).map(Number);
  assert.equal(c1x, 50);
  void c2x;
  assert.match(d, /C50\.00,0\.00 50\.00,50\.00/);
});

test('bump and spline are different claims, not different looks', () => {
  // A spline passes through with a slope; a bump arrives level. On a rank the
  // spline invents a value between two integer places that never existed.
  const points: [number, number][] = [[0, 30], [50, 10], [100, 20]];
  assert.notEqual(curvePath(points, 'bump'), curvePath(points, 'spline'));
  assert.match(curvePath(points, 'bump'), /C25\.00,30\.00/, 'level out of the first point');
});

test('a single pair still draws — Sankey ribbons are exactly that', () => {
  assert.match(bumpPath([[0, 0], [10, 10]]), /^M0\.00,0\.00 C5\.00,0\.00 5\.00,10\.00 10\.00,10\.00$/);
  assert.equal(bumpPath([[3, 4]]), 'M3.00,4.00');
});

// ── monotone ────────────────────────────────────────────────────────────────

/** Sample a cubic Bézier segment, so overshoot can be measured not assumed. */
const sampleCubic = (d: string): number[] => {
  const nums = [...d.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)].map(m => [Number(m[1]), Number(m[2])]);
  const out: number[] = [];
  for (let seg = 0; seg + 3 < nums.length; seg += 3) {
    const [p0, c1, c2, p1] = [nums[seg], nums[seg + 1], nums[seg + 2], nums[seg + 3]];
    for (let t = 0; t <= 1; t += 0.02) {
      const u = 1 - t;
      out.push(u ** 3 * p0[1] + 3 * u ** 2 * t * c1[1] + 3 * u * t ** 2 * c2[1] + t ** 3 * p1[1]);
    }
  }
  return out;
};

/** How many times a sampled curve moves DOWN. */
const descents = (ys: number[]) => {
  let n = 0;
  for (let i = 1; i < ys.length; i += 1) if (ys[i] < ys[i - 1] - 1e-9) n += 1;
  return n;
};

test('on rising data the spline DIPS; monotone cannot', () => {
  // This is the whole difference, and it is not about the overall range — the
  // spline's clamp already keeps it inside that. It is that Catmull-Rom breaks
  // MONOTONICITY: fed a series that only ever rises, it draws a fall that never
  // happened on the way to the next point. Measured, not assumed.
  const rising: [number, number][] = [[0, 0], [40, 10], [80, 11], [120, 12], [160, 100]];
  assert.equal(descents(sampleCubic(monotonePath(rising))), 0, 'monotone must never turn down here');
  assert.ok(
    descents(sampleCubic(splinePath(rising))) > 50,
    'the spline is expected to dip — that is what monotone exists to prevent',
  );
});

test('monotone holds the line on a near-flat run before a jump', () => {
  // 0, 1, 1.05, 10 — the shape where an ordinary spline visibly sags before it
  // climbs.
  const shape: [number, number][] = [[0, 0], [50, 1], [100, 1.05], [150, 10]];
  assert.equal(descents(sampleCubic(monotonePath(shape))), 0);
  assert.ok(descents(sampleCubic(splinePath(shape))) > 0);
});

test('a flat segment stays flat', () => {
  // Equal neighbours mean nothing changed. A curve that dips and returns draws
  // a change that never happened.
  const flat: [number, number][] = [[0, 5], [50, 5], [100, 5], [150, 40]];
  const ys = sampleCubic(monotonePath(flat)).slice(0, 100);
  assert.ok(Math.max(...ys) - Math.min(...ys) < 0.001, 'the flat run wobbled');
});

/**
 * Sample every segment and report the worst excursion beyond that segment's
 * OWN two endpoints. This is the property monotone actually promises, and it
 * is strictly stronger than "stays inside the global range" — a curve can sit
 * well within the overall min and max while still inventing a bump between two
 * particular samples.
 */
const worstOvershoot = (d: string): number => {
  const nums = [...d.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)].map(m => [Number(m[1]), Number(m[2])]);
  let worst = 0;
  for (let seg = 0; seg + 3 < nums.length; seg += 3) {
    const [p0, c1, c2, p1] = [nums[seg], nums[seg + 1], nums[seg + 2], nums[seg + 3]];
    const lo = Math.min(p0[1], p1[1]);
    const hi = Math.max(p0[1], p1[1]);
    for (let t = 0; t <= 1; t += 0.01) {
      const u = 1 - t;
      const y = u ** 3 * p0[1] + 3 * u ** 2 * t * c1[1] + 3 * u * t ** 2 * c2[1] + t ** 3 * p1[1];
      worst = Math.max(worst, lo - y, y - hi);
    }
  }
  return worst;
};

test('monotone does not overshoot AT A PEAK', () => {
  // The case every other monotone test here missed: they all fed strictly
  // rising data, which has no local extremum, and the extremum is the only
  // place the guard matters. Real observability data is full of them — this
  // shape is a throughput series that climbs slightly, then falls off a cliff.
  //
  // Without the sign guard the tangent at the peak comes out POSITIVE while
  // the segment arriving at it has a negative secant, so the curve rises past
  // the peak and comes back down: a burst of traffic that never happened.
  const peak: [number, number][] = [[0, 120], [190, 110], [380, 395], [570, 420], [760, 412]];
  assert.ok(
    worstOvershoot(monotonePath(peak)) < 1e-9,
    `monotone overshot by ${worstOvershoot(monotonePath(peak)).toFixed(2)}px at a local extremum`,
  );
});

test('monotone does not overshoot in a trough either', () => {
  // The mirror image, because a sign guard written for one direction and not
  // the other is a bug that only half the data reveals.
  const trough: [number, number][] = [[0, 20], [100, 300], [200, 310], [300, 40], [400, 30]];
  assert.ok(worstOvershoot(monotonePath(trough)) < 1e-9);
});

test('a spline overshoots an INTERIOR extremum; monotone does not', () => {
  // Guards the contrast rather than the curve: if the spline ever stops
  // overshooting, the two curve types have quietly converged and choosing
  // between them stopped meaning anything.
  //
  // The extremum has to be interior — a local max that is NOT the global max.
  // `splinePath` clamps its control points to the series' overall range, so at
  // the global extremum that clamp already prevents the bulge and the two
  // curves look identical. Picking the global peak here would have proved
  // nothing while appearing to.
  const interior: [number, number][] = [[0, 400], [100, 200], [200, 210], [300, 100], [400, 90]];
  assert.ok(worstOvershoot(splinePath(interior)) > 5);
  assert.equal(worstOvershoot(monotonePath(interior)) < 1e-9, true);
});

test('monotone holds at every extremum shape, not just the one that found the bug', () => {
  const shapes: [number, number][][] = [
    [[0, 400], [100, 200], [200, 210], [300, 100], [400, 90]],
    [[0, 20], [100, 300], [200, 310], [300, 40], [400, 30]],
    [[0, 50], [50, 200], [100, 60], [150, 220], [200, 40]],
  ];
  for (const shape of shapes) {
    assert.ok(worstOvershoot(monotonePath(shape)) < 1e-9, `overshot on ${JSON.stringify(shape)}`);
  }
});

test('monotone still passes through every point', () => {
  const points: [number, number][] = [[0, 30], [40, 10], [80, 60], [120, 45]];
  const d = monotonePath(points);
  for (const [x, y] of points) assert.ok(d.includes(`${x.toFixed(2)},${y.toFixed(2)}`), `missing ${x},${y}`);
});

test('a repeated x is a flat segment, not a division by zero', () => {
  const d = monotonePath([[0, 10], [0, 20], [50, 30]]);
  assert.doesNotMatch(d, /NaN|Infinity/);
});

test('two points are a straight line — there is nothing to interpolate', () => {
  assert.equal(curvePath([[0, 0], [10, 10]], 'monotone'), 'M0.00,0.00 L10.00,10.00');
});

// ── scales ──────────────────────────────────────────────────────────────────

test('a flat domain maps to the low edge instead of dividing by zero', () => {
  // A percentile pinned to one bound for a whole window is a real case, and it
  // must draw a flat line rather than a plot full of NaN.
  const scale = linearScale([25, 25], { from: 100, to: 0 });
  assert.equal(scale(25), 100);
});

test('the ladder spaces rungs evenly, not by numeric distance', () => {
  const scale = ladderScale(BOUNDS, { from: 200, to: 0 });
  // 25 → bottom, 5000 → top, and the gap 25→50 equals the gap 2500→5000.
  assert.equal(scale(25), 200);
  assert.equal(scale(5000), 0);
  // Equal to within float noise: both gaps are one seventh of the plot, but
  // they are reached by different multiplications, so the last bits differ.
  const low = scale(50) - scale(25);
  const high = scale(5000) - scale(2500);
  assert.ok(Math.abs(low - high) < 1e-9, `${low} vs ${high}`);
});

test('a value off the ladder snaps up, and an overflow lands on the top rung', () => {
  const scale = ladderScale(BOUNDS, { from: 200, to: 0 });
  assert.equal(scale(180), scale(250), 'between rungs snaps to the one above');
  assert.equal(scale(99999), scale(5000), 'past the top rung is the top rung');
});

test('band padding leaves a gap, and step bands touch when it is zero', () => {
  const gapped = bandScale(4, { from: 0, to: 100 }, 0.2);
  assert.equal(gapped.bandwidth, 20);
  const flush = bandScale(4, { from: 0, to: 100 });
  assert.equal(flush.end(0), flush(1), 'adjacent step segments share an edge');
});

test('niceMax rounds an axis top to something a human would print', () => {
  assert.equal(niceMax(16.55), 20);
  assert.equal(niceMax(993), 1000);
  assert.equal(niceMax(0), 1);
});

// ── palette ─────────────────────────────────────────────────────────────────

test('slots do not cycle: a ninth series gets the de-emphasis ink', () => {
  // Cycling would hand slot 9 a hue indistinguishable from an existing one
  // under CVD. Returning the muted ink instead makes the modelling mistake
  // visible rather than plausible.
  assert.equal(seriesColor(0), SERIES_VARS[0]);
  assert.equal(seriesColor(7), SERIES_VARS[7]);
  assert.equal(seriesColor(8), CHART_INK.muted);
});
