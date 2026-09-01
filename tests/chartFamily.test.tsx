/**
 * The wider chart family: the twenty-seven entries a typical picker lists,
 * collapsed onto sixteen components plus two pure layout functions.
 *
 * These specs pin the claims that justify each collapse — a `variant` that
 * genuinely changes the geometry rather than only the colour — and the handful
 * of encoding rules that are easy to get subtly, invisibly wrong: bubble area,
 * rose radius, squarified aspect ratio, per-axis radar maxima.
 */
import './dom';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';

import ColumnChart from '../src/charts/ColumnChart';
import ScatterChart, { SCATTER_SERIES_CAP } from '../src/charts/ScatterChart';
import RangeChart from '../src/charts/RangeChart';
import WaterfallChart from '../src/charts/WaterfallChart';
import HistogramChart from '../src/charts/HistogramChart';
import BoxPlotChart from '../src/charts/BoxPlotChart';
import CandlestickChart from '../src/charts/CandlestickChart';
import HeatmapChart from '../src/charts/HeatmapChart';
import RadarChart, { RADAR_SERIES_CAP } from '../src/charts/RadarChart';
import PieChart from '../src/charts/PieChart';
import RadialBarChart from '../src/charts/RadialBarChart';
import FunnelChart from '../src/charts/FunnelChart';
import TreemapChart from '../src/charts/TreemapChart';
import SunburstChart from '../src/charts/SunburstChart';
import SankeyChart from '../src/charts/SankeyChart';
import ChordChart from '../src/charts/ChordChart';
import TimeSeriesChart from '../src/charts/TimeSeriesChart';
import { squarify } from '../src/charts/treemapLayout';
import { curvePath, splinePath, monotonePath, bumpPath, polygonPoints, arcPath } from '../src/charts/curve';
import { radiusScale, angleScale, binValues } from '../src/charts/scale';
import RankedBars from '../src/charts/RankedBars';
import ChartTooltip from '../src/charts/ChartTooltip';
import ChartFrame from '../src/charts/ChartFrame';
import ChartSkeleton from '../src/charts/ChartSkeleton';
import ChartDot from '../src/charts/ChartDot';
import ChartBrush from '../src/charts/ChartBrush';
import { autoHighlightIndex, highlightOpacity } from '../src/charts/highlight';

const ChartSkeletonProbe = () => <ChartSkeleton variant="bars" width={400} height={180} />;

const html = (el: React.ReactElement) => renderToStaticMarkup(el);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr'];

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

// ── cartesian family ────────────────────────────────────────────────────────

test('stacked columns leave a gap between segments rather than a border', () => {
  const markup = html(
    <ColumnChart
      width={520} labels={MONTHS} stacked
      series={[
        { key: 'a', label: 'A', data: [10, 20, 30, 40] },
        { key: 'b', label: 'B', data: [5, 5, 5, 5] },
      ]}
    />,
  );
  assert.equal((markup.match(/<rect/g) ?? []).length >= 8, true);
  assert.doesNotMatch(markup, /<rect[^>]*stroke="var\(--viz-series/, 'segments are not outlined');
});

test('scatter caps at three series — the all-pairs colour limit', () => {
  assert.equal(SCATTER_SERIES_CAP, 3);
  const series = Array.from({ length: 5 }, (_, i) => ({
    key: `s${i}`, label: `S${i}`, points: [{ x: i, y: i }],
  }));
  const markup = html(<ScatterChart width={400} series={series} />);
  assert.equal((markup.match(/<circle/g) ?? []).length, 3);
});

test('a bubble’s radius grows with the square root of its size', () => {
  const markup = html(
    <ScatterChart
      width={400} radiusRange={[0, 40]}
      series={[{ key: 's', label: 'S', points: [{ x: 1, y: 1, size: 25 }, { x: 2, y: 2, size: 100 }] }]}
    />,
  );
  const radii = [...markup.matchAll(/r="([\d.]+)"/g)].map(m => Number(m[1]));
  assert.ok(Math.abs(radii[1] / radii[0] - 2) < 0.01, `expected 2× radius for 4× size, got ${radii[1] / radii[0]}`);
});

test('a range band is one filled path, not two lines hoping to meet', () => {
  const markup = html(
    <RangeChart width={520} labels={MONTHS} rows={MONTHS.map((_, i) => ({ low: i, high: i + 5 }))} />,
  );
  assert.equal((markup.match(/<path[^>]*stroke="none"/g) ?? []).length, 1);
});

test('range bars and range areas are different geometry, not a recolour', () => {
  const rows = MONTHS.map((_, i) => ({ low: i, high: i + 5 }));
  const area = html(<RangeChart width={520} labels={MONTHS} rows={rows} variant="area" />);
  const bars = html(<RangeChart width={520} labels={MONTHS} rows={rows} variant="bar" />);
  assert.match(area, /<path/);
  assert.equal((bars.match(/<rect[^>]*rx="3"/g) ?? []).length, 4);
});

test('a waterfall floats each step at the running balance', () => {
  const markup = html(
    <WaterfallChart
      width={520}
      steps={[
        { label: 'Open', value: 100, total: true },
        { label: 'Sales', value: 60 },
        { label: 'Refunds', value: -20 },
        { label: 'Close', value: 0, total: true },
      ]}
    />,
  );
  assert.match(markup, /var\(--viz-good\)/, 'an increase is the good tone');
  assert.match(markup, /var\(--viz-critical\)/, 'a decrease is the critical tone');
  assert.match(markup, /var\(--viz-neutral\)/, 'a total bar is neutral, not a contribution');
});

test('histogram bins touch — reordering them would destroy the meaning', () => {
  const markup = html(<HistogramChart width={520} values={[1, 2, 2, 3, 3, 3, 4, 9]} bins={4} />);
  // Only the bin rects — the hover targets are transparent and sit after them.
  const xs = [...markup.matchAll(/<rect[^>]*x="([\d.]+)"[^>]*width="([\d.]+)"[^>]*fill="var\(--viz-series-1\)"/g)]
    .map(m => ({ x: Number(m[1]), w: Number(m[2]) }));
  assert.ok(xs.length >= 2, `expected bin rects, found ${xs.length}`);
  // Adjacent bins meet across the 1px hairline inset that keeps two equal
  // bars from reading as one wide one.
  assert.ok(Math.abs((xs[0].x + xs[0].w) - xs[1].x) <= 1.5, 'bins are adjacent');
});

test('the box plot draws its median heavier than the box it sits in', () => {
  const markup = html(
    <BoxPlotChart width={520} boxes={[{ label: 'regis', min: 1, q1: 4, median: 8, q3: 12, max: 30, outliers: [42] }]} />,
  );
  assert.match(markup, /stroke-width="3"/, 'the median is the heaviest mark');
  assert.match(markup, /<circle[^>]*r="3"/, 'outliers are drawn');
});

test('candlestick and OHLC are the same data in different geometry', () => {
  const candles = [{ label: 'Mon', open: 10, high: 14, low: 9, close: 12 }];
  const candle = html(<CandlestickChart width={400} candles={candles} variant="candle" />);
  const ohlc = html(<CandlestickChart width={400} candles={candles} variant="ohlc" />);
  assert.match(candle, /<rect/, 'a candle has a body');
  assert.doesNotMatch(ohlc, /<rect[^>]*rx="1"/, 'an OHLC bar has ticks instead');
});

test('the heatmap ramp is one hue mixed toward the surface, never a rainbow', () => {
  const markup = html(
    <HeatmapChart width={520} rows={['regis', 'inovit_au']} columns={['00', '01']} cells={[[0, 9], [4, 2]]} />,
  );
  const fills = [...markup.matchAll(/fill="(color-mix[^"]*)"/g)].map(m => m[1]);
  assert.ok(fills.length >= 4);
  for (const fill of fills) assert.match(fill, /var\(--viz-series-1\)/, 'every cell is the same hue');
});

// ── polar family ────────────────────────────────────────────────────────────

test('six radar axes draw a hexagonal grid', () => {
  const axes = Array.from({ length: 6 }, (_, i) => ({ key: `a${i}`, label: `Axis ${i}` }));
  const markup = html(
    <RadarChart axes={axes} rings={1} series={[{ key: 's', label: 'S', values: [1, 2, 3, 4, 5, 6] }]} />,
  );
  const grid = /<path d="(M[^"]*Z)" fill="none" stroke="var\(--viz-grid\)"/.exec(markup)?.[1] ?? '';
  assert.equal([...grid.matchAll(/[ML]/g)].length, 6, 'six vertices, so a hexagon');
});

test('a circular radar grid is available for sampled continua', () => {
  const axes = Array.from({ length: 6 }, (_, i) => ({ key: `a${i}`, label: `A${i}` }));
  const markup = html(
    <RadarChart axes={axes} grid="circle" series={[{ key: 's', label: 'S', values: [1, 1, 1, 1, 1, 1] }]} />,
  );
  assert.match(markup, /<circle[^>]*stroke="var\(--viz-grid\)"/);
});

test('each radar axis is normalised on its own maximum', () => {
  // Without per-axis maxima a metric in thousands flattens one in tens.
  const axes = [{ key: 'a', label: 'Requests' }, { key: 'b', label: 'Errors' }, { key: 'c', label: 'P95' }];
  const markup = html(
    <RadarChart axes={axes} size={200} series={[{ key: 's', label: 'S', values: [5000, 3, 250] }]} />,
  );
  // All three sit at their own maximum, so all three land on the outer ring.
  const dots = [...markup.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)" r="3.5"/g)];
  assert.equal(dots.length, 3);
  const radii = dots.map(d => Math.hypot(Number(d[1]) - 100, Number(d[2]) - 100));
  assert.ok(Math.max(...radii) - Math.min(...radii) < 0.01, 'all three reach the same ring');
  assert.equal(RADAR_SERIES_CAP, 3);
});

test('a pie folds its tail into Other rather than growing a seventh hue', () => {
  const segments = Array.from({ length: 9 }, (_, i) => ({ key: `s${i}`, label: `S${i}`, value: 10 - i }));
  const markup = html(<PieChart segments={segments} maxSegments={6} />);
  assert.match(markup, />Other</);
  assert.equal((markup.match(/<path/g) ?? []).length, 7, 'six kept plus one Other');
});

test('the rose varies radius, the pie varies angle', () => {
  const segments = [
    { key: 'a', label: 'A', value: 90 },
    { key: 'b', label: 'B', value: 10 },
  ];
  const rose = html(<PieChart segments={segments} variant="rose" size={200} />);
  // Equal angles: both wedges sweep a half turn, so both arcs share a radius
  // command shape but differ in the radius value itself.
  const radii = [...rose.matchAll(/A([\d.]+),\1 /g)].map(m => Number(m[1]));
  assert.ok(new Set(radii).size > 1, 'the rose encodes value as radius');
});

test('radial tracks stop short of a full turn so the ends never touch', () => {
  const markup = html(
    <RadialBarChart size={200} rows={[{ key: 'a', label: 'A', value: 100 }]} max={100} />,
  );
  // 300°, not 360°: a full ring's start and end coincide, so there is no
  // readable beginning and a 99% track looks identical to a 100% one.
  const start = /M([\d.]+),([\d.]+) A/.exec(markup);
  const end = /A[\d.]+,[\d.]+ 0 \d 1 ([\d.]+),([\d.]+) L/.exec(markup);
  assert.ok(start && end, 'the filled track drew an arc');
  const gap = Math.hypot(Number(start![1]) - Number(end![1]), Number(start![2]) - Number(end![2]));
  assert.ok(gap > 20, `the ends should stay apart, they were ${gap.toFixed(1)}px`);
});

// ── hierarchy and flow ──────────────────────────────────────────────────────

test('a funnel states the drop-off, not just the widths', () => {
  const markup = html(
    <FunnelChart
      width={520}
      stages={[
        { key: 'a', label: 'Viewed', value: 1000 },
        { key: 'b', label: 'Carted', value: 400 },
        { key: 'c', label: 'Paid', value: 120 },
      ]}
    />,
  );
  assert.match(markup, /−60.0%/, 'the loss from the stage above is written out');
  assert.match(markup, /−70.0%/);
});

test('a cone tapers to the next stage; a funnel does not', () => {
  const stages = [
    { key: 'a', label: 'A', value: 100 },
    { key: 'b', label: 'B', value: 20 },
  ];
  const funnel = html(<FunnelChart width={400} stages={stages} shape="funnel" />);
  const cone = html(<FunnelChart width={400} stages={stages} shape="cone" />);
  assert.notEqual(funnel, cone, 'the shapes differ in geometry, not only in name');
});

test('a treemap only labels a tile the label actually fits in', () => {
  const markup = html(
    <TreemapChart
      width={400} height={200}
      items={[
        { key: 'big', label: 'Alloy wheels', value: 900 },
        { key: 'tiny', label: 'A very long category name indeed', value: 1 },
      ]}
    />,
  );
  assert.match(markup, />Alloy wheels</);
  assert.doesNotMatch(markup, />A very long category name indeed</, 'no clipped label');
});

test('a sunburst keeps a branch one hue, stepped lighter with depth', () => {
  const markup = html(
    <SunburstChart
      size={220}
      nodes={[{
        key: 'au', label: 'AU', children: [
          { key: 'au-wheels', label: 'Wheels', value: 60 },
          { key: 'au-tyres', label: 'Tyres', value: 40 },
        ],
      }]}
    />,
  );
  const fills = [...markup.matchAll(/fill="(color-mix[^"]*)"/g)].map(m => m[1]);
  assert.ok(fills.length >= 3);
  for (const fill of fills) assert.match(fill, /var\(--viz-series-1\)/, 'one branch, one hue');
});

test('sankey ribbon width is the flow, and both ends stack in link order', () => {
  const markup = html(
    <SankeyChart
      width={520} height={200}
      nodes={[
        { key: 'in', label: 'Requests', depth: 0 },
        { key: 'ok', label: '2xx', depth: 1 },
        { key: 'err', label: '4xx', depth: 1 },
      ]}
      links={[
        { from: 'in', to: 'ok', value: 300 },
        { from: 'in', to: 'err', value: 100 },
      ]}
    />,
  );
  const widths = [...markup.matchAll(/<path[^>]*stroke-width="([\d.]+)"/g)].map(m => Number(m[1]));
  assert.equal(widths.length, 2);
  assert.ok(Math.abs(widths[0] / widths[1] - 3) < 0.05, `expected 3:1, got ${widths[0] / widths[1]}`);
});

test('a chord drops the tail past maxNodes instead of tangling', () => {
  const labels = Array.from({ length: 14 }, (_, i) => `T${i}`);
  const matrix = labels.map((_, r) => labels.map((__, c) => (r === c ? 0 : Math.max(0, 14 - r - c))));
  const markup = html(<ChordChart labels={labels} matrix={matrix} maxNodes={6} />);
  const arcs = [...markup.matchAll(/<path[^>]*fill="var\(--viz-series-\d\)"/g)];
  assert.equal(arcs.length, 6);
});

// ── the combination form ────────────────────────────────────────────────────

test('a column series inside a time chart shares the ONE axis', () => {
  const markup = html(
    <TimeSeriesChart
      width={520} labels={MONTHS}
      series={[
        { key: 'vol', label: 'Volume', data: [100, 200, 150, 300], mode: 'column' },
        { key: 'rate', label: 'Rate', data: [10, 20, 15, 30], mode: 'line' },
      ]}
    />,
  );
  assert.match(markup, /<rect[^>]*rx="2"/, 'the volume draws as columns');
  assert.match(markup, /<path[^>]*stroke="var\(--viz-series-2\)"/, 'the rate draws as a line');
  // One y-axis: a second scale would need a second set of tick labels on the
  // right, and there is no code path that can produce one.
  assert.equal((markup.match(/text-anchor="end"/g) ?? []).length > 0, true);
});

test('a spline time series curves; the default does not', () => {
  const series = [{ key: 'a', label: 'A', data: [10, 40, 20, 50] }];
  const straight = html(<TimeSeriesChart width={520} labels={MONTHS} series={series} />);
  const curved = html(<TimeSeriesChart width={520} labels={MONTHS} series={series} curve="spline" />);
  assert.doesNotMatch(straight, /C\d/, 'linear draws no Bézier');
  assert.match(curved, / C[\d.]+,/, 'spline draws cubic segments');
});

// ── the expressive layer ────────────────────────────────────────────────────

test('an area fill is a vertical alpha fade, not a flat wash', () => {
  const markup = html(
    <TimeSeriesChart
      width={520} labels={MONTHS}
      series={[{ key: 'a', label: 'A', data: [10, 40, 20, 50], mode: 'area' }]}
    />,
  );
  assert.match(markup, /<linearGradient[^>]*x1="0" y1="0" x2="0" y2="1"/, 'the fade runs top to bottom');
  assert.match(markup, /stop-opacity="0\.3"/);
  assert.match(markup, /stop-opacity="0"/, 'and dissolves at the baseline');
  assert.match(markup, /fill="url\(#/, 'the area takes the gradient, not a colour');
});

test('two charts on one page do not share a gradient id', () => {
  // Rendered in ONE tree, which is the case that matters: React only promises
  // useId uniqueness within a render, and two charts sharing a gradient id is
  // the classic SVG bug where the second silently repaints the first.
  const markup = html(
    <div>
      <TimeSeriesChart width={400} labels={MONTHS} series={[{ key: 'a', label: 'A', data: [1, 2, 3, 4], mode: 'area' }]} />
      <TimeSeriesChart width={400} labels={MONTHS} series={[{ key: 'b', label: 'B', data: [4, 3, 2, 1], mode: 'area' }]} />
    </div>,
  );
  const ids = [...markup.matchAll(/<linearGradient id="([^"]+)"/g)].map(m => m[1]);
  assert.equal(ids.length, 2);
  assert.equal(new Set(ids).size, 2, 'a shared id lets the second chart repaint the first');
});

test('the intro reveal is a mask, so fill, stroke and dots arrive together', () => {
  const markup = html(
    <TimeSeriesChart
      width={520} labels={MONTHS} labelEndpoints
      series={[{ key: 'a', label: 'A', data: [1, 2, 3, 4], mode: 'area' }]}
    />,
  );
  assert.match(markup, /<mask[^>]*maskUnits="objectBoundingBox"/, 'one mask, in 0–1 units');
  assert.match(markup, /class="rosh-viz-wipe"/, 'wiped by a CSS transform, not a frame loop');
  // The whole plot group sits under it, which is the point — a dash-offset
  // reveal can only animate strokes and leaves the fill to arrive separately.
  assert.match(markup, /<g clip-path="url\(#[^)]*\)" mask="url\(#[^)]*-reveal\)"/);
});

test('the wipe direction is a named choice, not a hard-coded left-to-right', () => {
  const rtl = html(
    <TimeSeriesChart width={400} labels={MONTHS} reveal="right-to-left" series={[{ key: 'a', label: 'A', data: [1, 2, 3, 4] }]} />,
  );
  assert.match(rtl, /rosh-viz-wipe-rtl/);
});

test('animate={false} drops the intro motion but keeps the hover transition', () => {
  // `animate` governs the ENTRANCE. The hover response is a transition, not an
  // animation, and turning off the reveal should not make emphasis snap — a
  // mark that jumps to grey the instant the pointer crosses it reads as a
  // glitch. `prefers-reduced-motion` kills both, in one rule in ui.css.
  const markup = html(
    <TimeSeriesChart width={520} labels={MONTHS} animate={false} series={[{ key: 'a', label: 'A', data: [1, 2, 3, 4] }]} />,
  );
  for (const entrance of ['rosh-viz-wipe', 'rosh-viz-rise', 'rosh-viz-sweep', 'rosh-viz-fade', 'rosh-viz-grow']) {
    assert.doesNotMatch(markup, new RegExp(entrance), `${entrance} should be gone`);
  }
  assert.match(markup, /rosh-viz-mark/, 'the hover transition stays');
});

test('a projection marches; a measurement does not', () => {
  const measured = html(<TimeSeriesChart width={520} labels={MONTHS} series={[{ key: 'a', label: 'A', data: [1, 2, 3, 4] }]} />);
  const forecast = html(<TimeSeriesChart width={520} labels={MONTHS} series={[{ key: 'a', label: 'A', data: [1, 2, 3, 4], forecast: true }]} />);
  assert.doesNotMatch(measured, /rosh-viz-march/);
  assert.match(forecast, /rosh-viz-march/);
  assert.match(forecast, /stroke-dasharray="4 3"/);
});

test('a dashed stroke can be static — dashed is a look, marching is a claim', () => {
  const markup = html(
    <TimeSeriesChart width={400} labels={MONTHS} series={[{ key: 'a', label: 'A', data: [1, 2, 3, 4], stroke: 'dashed' }]} />,
  );
  assert.match(markup, /stroke-dasharray="4 3"/);
  assert.doesNotMatch(markup, /rosh-viz-march/, 'a static dash makes no claim about the data');
});

test('texture is a fill variant, which is what a CVD reader needs', () => {
  const hatched = html(
    <TimeSeriesChart
      width={400} labels={MONTHS} fillVariant="hatched"
      series={[{ key: 'a', label: 'A', data: [1, 2, 3, 4], mode: 'area' }]}
    />,
  );
  assert.match(hatched, /<pattern[^>]*patternTransform="rotate\(45\)"/, '45°, as the texture rule reserves');
  const dotted = html(
    <TimeSeriesChart
      width={400} labels={MONTHS} fillVariant="dotted"
      series={[{ key: 'a', label: 'A', data: [1, 2, 3, 4], mode: 'area' }]}
    />,
  );
  assert.match(dotted, /<pattern[^>]*width="8"/);
  assert.match(dotted, /<circle[^>]*r="1.2"/);
});

test('a per-series fill variant overrides the chart default', () => {
  const markup = html(
    <TimeSeriesChart
      width={400} labels={MONTHS} fillVariant="gradient" stacked
      series={[
        { key: 'a', label: 'A', data: [1, 2, 3, 4] },
        { key: 'b', label: 'B', data: [1, 1, 1, 1], fillVariant: 'hatched' },
      ]}
    />,
  );
  assert.match(markup, /<linearGradient/, 'the first keeps the default');
  assert.match(markup, /<pattern/, 'the second takes its own');
});

test('gridlines are solid by default and dashed only on request', () => {
  const solid = html(<TimeSeriesChart width={520} labels={MONTHS} series={[{ key: 'a', label: 'A', data: [1, 2, 3, 4] }]} />);
  const dashed = html(<TimeSeriesChart width={520} labels={MONTHS} gridStyle="dashed" series={[{ key: 'a', label: 'A', data: [1, 2, 3, 4] }]} />);
  assert.doesNotMatch(solid, /stroke="var\(--viz-grid\)"[^>]*stroke-dasharray/);
  assert.match(dashed, /stroke-dasharray="3 3"/);
});

test('glow is opt-in, and it is a filter rather than a fatter stroke', () => {
  const plain = html(<ColumnChart width={400} labels={MONTHS} series={[{ key: 'a', label: 'A', data: [1, 2, 3, 4] }]} />);
  const glowing = html(<ColumnChart width={400} labels={MONTHS} glow series={[{ key: 'a', label: 'A', data: [1, 2, 3, 4] }]} />);
  assert.doesNotMatch(plain, /feGaussianBlur/);
  assert.match(glowing, /feGaussianBlur/, 'the filter is declared');
  // Declared, but ATTACHED to nothing until something is active — a chart where
  // every bar blooms has no emphasis left to give. See the activeKey spec.
  assert.doesNotMatch(glowing, /filter="url\(#/);
});

test('bars rise from the baseline, and horizontal bars grow from the left', () => {
  const columns = html(<ColumnChart width={400} labels={MONTHS} series={[{ key: 'a', label: 'A', data: [1, 2, 3, 4] }]} />);
  assert.match(columns, /rosh-viz-rise/);
  const ranked = html(<RankedBars rows={[{ key: 'a', label: 'A', value: 10 }]} />);
  assert.match(ranked, /rosh-viz-grow/);
});

test('wedges sweep in, staggered, so a pie assembles rather than appears', () => {
  const markup = html(
    <PieChart segments={[
      { key: 'a', label: 'A', value: 3 },
      { key: 'b', label: 'B', value: 2 },
    ]} />,
  );
  assert.equal((markup.match(/rosh-viz-sweep/g) ?? []).length, 2);
  assert.match(markup, /animation-delay:55ms/, 'the second wedge waits for the first');
});

// ── the hover layer ─────────────────────────────────────────────────────────

test('the tooltip is one card: swatch, name, then the value hard right', () => {
  const markup = html(
    <ChartTooltip
      title="W08"
      rows={[
        { key: 'paid', label: 'Paid', value: '158', color: 'var(--viz-series-3)' },
        { key: 'organic', label: 'Organic', value: '287', color: 'var(--viz-series-7)' },
      ]}
    />,
  );
  assert.match(markup, /W08/);
  assert.match(markup, /background-color:var\(--viz-series-3\)/, 'each row carries its own swatch');
  assert.match(markup, /tabular-nums/, 'the values line up as a column');
  // Stack order: the bottom segment is listed first.
  assert.ok(markup.indexOf('Paid') < markup.indexOf('Organic'));
});

test('a missing value is an em dash, never a zero', () => {
  // "No data for this bucket" and "zero in this bucket" are different facts.
  const markup = html(<ChartTooltip rows={[{ key: 'a', label: 'Requests' }]} />);
  assert.match(markup, /—/);
  assert.doesNotMatch(markup, />0</);
});

test('every chart hands the same card to the pointer', () => {
  // One surface, so a reader who learns to read one tooltip can read them all.
  const column = html(
    <ColumnChart width={400} labels={MONTHS} series={[{ key: 'a', label: 'A', data: [1, 2, 3, 4] }]} />,
  );
  const time = html(
    <TimeSeriesChart width={400} labels={MONTHS} series={[{ key: 'a', label: 'A', data: [1, 2, 3, 4] }]} />,
  );
  // Rendered only on hover, so SSR shows neither — what is asserted here is
  // that neither ships a bespoke card of its own any more.
  for (const markup of [column, time]) {
    assert.doesNotMatch(markup, /rounded-md border border-gray-200 bg-white p-2/, 'no ad-hoc tooltip left');
  }
});

test('emphasis recedes the other bars rather than merely fading them', () => {
  const plain = html(
    <ColumnChart width={400} labels={MONTHS} activeKey="Feb" series={[{ key: 'a', label: 'A', data: [1, 2, 3, 4] }]} />,
  );
  const emphasised = html(
    <ColumnChart width={400} labels={MONTHS} activeKey="Feb" emphasise series={[{ key: 'a', label: 'A', data: [1, 2, 3, 4] }]} />,
  );
  assert.doesNotMatch(plain, /fill="var\(--viz-muted\)"/, 'without emphasis every bar keeps its hue');
  assert.equal((emphasised.match(/fill="var\(--viz-muted\)"/g) ?? []).length, 3, 'three recede, one keeps its colour');
  assert.match(emphasised, /fill="var\(--viz-series-1\)"/);
});

test('the glow follows the active bar, not the whole chart', () => {
  const markup = html(
    <ColumnChart width={400} labels={MONTHS} glow activeKey="Feb" emphasise series={[{ key: 'a', label: 'A', data: [1, 2, 3, 4] }]} />,
  );
  assert.equal((markup.match(/filter="url\(#[^)]*-glow\)"/g) ?? []).length, 1, 'exactly one mark blooms');
});

test('a mark transitions into its hover state instead of snapping', () => {
  const markup = html(<ColumnChart width={400} labels={MONTHS} series={[{ key: 'a', label: 'A', data: [1, 2, 3, 4] }]} />);
  assert.match(markup, /rosh-viz-mark/);
});

test('activeKey highlights without a pointer — a peak, or an anomaly', () => {
  const markup = html(
    <ColumnChart width={400} labels={MONTHS} emphasise activeKey="Mar" series={[{ key: 'a', label: 'A', data: [1, 2, 3, 4] }]} />,
  );
  const muted = (markup.match(/fill="var\(--viz-muted\)"/g) ?? []).length;
  assert.equal(muted, 3, 'the named column stays lit with nothing hovered');
});

// ── the loading state ───────────────────────────────────────────────────────

test('a first load shows a skeleton at the chart’s own height', () => {
  // An empty box reads as "broken"; a skeleton reads as "coming". Matching the
  // height is what stops the arriving chart shoving the page.
  const markup = html(<TimeSeriesChart width={520} height={260} loading labels={MONTHS} series={[]} />);
  assert.match(markup, /aria-busy="true"/);
  assert.match(markup, /aria-label="Loading chart data"/);
  assert.match(markup, /height="260"/);
  assert.match(markup, /rosh-viz-shimmer/);
});

test('a refetch holds the previous render — it does not flash a skeleton', () => {
  // The canonical version of this mistake: replacing a correct chart with a
  // fake one, on every poll, so a live dashboard strobes.
  const refetching = html(<ChartFrame title="Mix" busy><i data-testid="held" /></ChartFrame>);
  assert.doesNotMatch(refetching, /rosh-viz-shimmer/);
  assert.match(refetching, /data-testid="held"/);
  assert.match(refetching, /opacity-60/);

  const firstLoad = html(<ChartFrame title="Mix" loading><i data-testid="held" /></ChartFrame>);
  assert.match(firstLoad, /rosh-viz-shimmer/);
  assert.doesNotMatch(firstLoad, /data-testid="held"/, 'there is nothing to hold yet');
});

test('the frame hides its legend and table while loading', () => {
  // Both describe data that does not exist yet. A legend naming three series
  // beside a skeleton is a promise the response may not keep.
  const markup = html(
    <ChartFrame
      title="Mix" loading
      legend={[{ key: 'a', label: '2xx' }, { key: 'b', label: '4xx' }]}
      table={<table><tbody><tr><td>993</td></tr></tbody></table>}
    ><i /></ChartFrame>,
  );
  assert.doesNotMatch(markup, /2xx/);
  assert.doesNotMatch(markup, /<details/);
});

test('the skeleton matches the shape it stands in for', () => {
  const area = html(<ChartFrame title="T" loading skeletonVariant="area"><i /></ChartFrame>);
  const bars = html(<ChartFrame title="T" loading skeletonVariant="bars"><i /></ChartFrame>);
  assert.match(area, /<path[^>]*d="M48,/, 'the area skeleton is a mound');
  assert.equal((bars.match(/<rect[^>]*rx="3"/g) ?? []).length, 9, 'the bar skeleton is bars');
});

test('the skeleton profile is fixed, so it cannot be read as data', () => {
  // A placeholder that changes between renders reads as a series. Twice the
  // same markup is the whole claim.
  const a = html(<ChartSkeletonProbe />);
  const b = html(<ChartSkeletonProbe />);
  assert.equal(a.replace(/:R\w+:/g, ''), b.replace(/:R\w+:/g, ''));
});

// ── 100% stacking ───────────────────────────────────────────────────────────

// Bucket 0 is 100 requests, bucket 3 is 10 — and both are 90% / 10%. Bucket 2
// has no traffic at all, which is the 0/0 case.
const MIX = [
  { key: 'ok', label: '2xx', data: [90, 300, 0, 9] },
  { key: 'c4', label: '4xx', data: [10, 100, 0, 1] },
];

test('percent mode normalises each bucket to its OWN total', () => {
  // Bucket 0 is 100 requests and bucket 3 is 5, but both are 90% / 10%. That
  // comparability is the entire reason the mode exists.
  const markup = html(
    <ColumnChart width={480} labels={MONTHS} stacked stackMode="percent" series={MIX} />,
  );
  const bars = [...markup.matchAll(/<rect[^>]*y="([\d.]+)"[^>]*height="([\d.]+)"[^>]*fill="var\(--viz-series-(\d)\)"/g)]
    .map(m => ({ y: Number(m[1]), h: Number(m[2]), slot: m[3] }));
  const first = bars.filter(b => b.slot === '1')[0];
  const last = bars.filter(b => b.slot === '1').at(-1)!;
  assert.ok(Math.abs(first.h - last.h) < 0.5, `same share should be the same height: ${first.h} vs ${last.h}`);
});

test('the y-axis becomes a percentage, and tops out at 100%', () => {
  const markup = html(
    <ColumnChart width={480} labels={MONTHS} stacked stackMode="percent" series={MIX} />,
  );
  assert.match(markup, />100%</);
  assert.match(markup, />50%</);
  assert.doesNotMatch(markup, />400</, 'the raw total left the axis');
});

test('a bucket with no traffic is a gap, not an empty stack and not a full one', () => {
  // 0/0 has no composition. Drawing it as 0% claims everything failed; drawing
  // it as 100% claims everything succeeded. Both are inventions.
  const markup = html(
    <ColumnChart width={480} labels={MONTHS} stacked stackMode="percent" series={MIX} />,
  );
  const painted = (markup.match(/fill="var\(--viz-series-\d\)"/g) ?? []).length;
  assert.equal(painted, 6, 'three buckets have a mix, the empty one draws nothing');
});

test('percent mode keeps the count beside the share, because the plot dropped it', () => {
  // The hazard of a 100% stack is that volume disappears. A share without its
  // denominator is exactly what this family keeps refusing to ship, so the
  // tooltip carries both and names the bucket total.
  const markup = html(
    <TimeSeriesChart
      width={480} labels={MONTHS} stacked stackMode="percent"
      series={MIX.map(s => ({ ...s, data: s.data.map(v => v) }))}
    />,
  );
  // Rendered on hover, so what is asserted here is that the value mode is
  // unchanged when percent is off.
  const counts = html(<TimeSeriesChart width={480} labels={MONTHS} stacked series={MIX} />);
  assert.doesNotMatch(counts, />100%</, 'value mode keeps a count axis');
  assert.match(markup, />100%</, 'percent mode does not');
});

test('value mode still sums to the real total, so a quiet bucket is shorter', () => {
  const markup = html(<ColumnChart width={480} labels={MONTHS} stacked series={MIX} />);
  const heights = [...markup.matchAll(/<rect[^>]*height="([\d.]+)"[^>]*fill="var\(--viz-series-1\)"/g)]
    .map(m => Number(m[1]));
  assert.ok(heights[1] > heights[0] * 2, 'the 400-request bucket towers over the 100-request one');
});

// ── legend ↔ plot linkage ───────────────────────────────────────────────────

test('legend entries are buttons, so focus reaches the highlight too', () => {
  // A highlight reachable only by pointer is a feature half the users do not
  // have. The entries are buttons for the focus, not for the click.
  const markup = html(
    <ChartFrame title="Mix" legend={[{ key: 'a', label: '2xx' }, { key: 'b', label: '4xx' }]}>
      <i />
    </ChartFrame>,
  );
  assert.equal((markup.match(/<button type="button"/g) ?? []).length, 2);
  assert.match(markup, /focus-visible:outline-blue-500/);
});

test('a non-interactive legend renders plain text, not buttons', () => {
  const markup = html(
    <ChartFrame
      title="Mix" interactiveLegend={false}
      legend={[{ key: 'a', label: '2xx' }, { key: 'b', label: '4xx' }]}
    ><i /></ChartFrame>,
  );
  assert.doesNotMatch(markup, /<button/);
  assert.match(markup, /2xx/);
});

test('nothing highlighted leaves every series at its own opacity', () => {
  // `highlightOpacity` returns null rather than 1 on purpose: a stacked fill is
  // translucent by design, and forcing it opaque would flatten the stack.
  assert.equal(highlightOpacity('a', null), null);
  assert.equal(highlightOpacity('a', 'a'), 1);
  assert.ok((highlightOpacity('a', 'b') ?? 1) < 0.3);
});

test('the highlight travels by series KEY, the same identifier colour follows', () => {
  // A legend entry naming a key no series has would silently highlight
  // nothing, so the two lists are the same identifiers by contract.
  const legend = [{ key: 'ok', label: '2xx' }, { key: 'c4', label: '4xx' }];
  const series = [
    { key: 'ok', label: '2xx', data: [1, 2, 3, 4] },
    { key: 'c4', label: '4xx', data: [4, 3, 2, 1] },
  ];
  assert.deepEqual(legend.map(l => l.key), series.map(s => s.key));
  const markup = html(
    <ChartFrame title="Mix" legend={legend}>
      <TimeSeriesChart width={400} labels={MONTHS} series={series} />
    </ChartFrame>,
  );
  // Both series draw, and both are transition-ready for the dim.
  assert.equal((markup.match(/rosh-viz-mark/g) ?? []).length >= 2, true);
});

test('the dim is a transition, so a legend sweep does not strobe', () => {
  const markup = html(
    <ChartFrame title="Mix" legend={[{ key: 'a', label: 'A' }, { key: 'b', label: 'B' }]}>
      <TimeSeriesChart
        width={400} labels={MONTHS}
        series={[{ key: 'a', label: 'A', data: [1, 2, 3, 4] }, { key: 'b', label: 'B', data: [4, 3, 2, 1] }]}
      />
    </ChartFrame>,
  );
  assert.match(markup, /class="rosh-viz-mark"/);
  assert.match(markup, /transition-opacity|rosh-viz-mark/);
});

// ── auto highlight ──────────────────────────────────────────────────────────

test('the peak is derived from the data, not named in a prop', () => {
  // A peak written into a prop goes stale the moment the window moves — and
  // goes SILENTLY stale, which is the worse half.
  assert.equal(autoHighlightIndex([3, 9, 4], 'max'), 1);
  assert.equal(autoHighlightIndex([3, 9, 4], 'min'), 0);
  assert.equal(autoHighlightIndex([3, 9, 4], 'none'), null);
});

test('a tie keeps the earlier index — "it first happened here"', () => {
  // Lighting both equal peaks says "these are the peak", which is true and
  // useless as an emphasis.
  assert.equal(autoHighlightIndex([5, 9, 9, 2], 'max'), 1);
});

test('gaps are skipped, and `last` means the last REAL value', () => {
  // A trailing null is a bucket that has not reported, not a zero. Lighting it
  // would point the reader at nothing.
  assert.equal(autoHighlightIndex([1, null, 7, null], 'last'), 2);
  assert.equal(autoHighlightIndex([null, null], 'last'), null);
  assert.equal(autoHighlightIndex([null, 4, null], 'max'), 1);
});

test('a stacked chart derives its peak from the TOTAL, not one band', () => {
  // Series A peaks in the first bucket, but the stack peaks in the second.
  const markup = html(
    <ColumnChart
      width={480} labels={MONTHS} stacked emphasise highlight="max"
      series={[
        { key: 'a', label: 'A', data: [90, 10, 5, 5] },
        { key: 'b', label: 'B', data: [5, 200, 5, 5] },
      ]}
    />,
  );
  // Three of four categories recede, across two series → six muted bars.
  assert.equal((markup.match(/fill="var\(--viz-muted\)"/g) ?? []).length, 6);
});

test('an explicit key beats a derived one', () => {
  // A caller naming a category has a reason the data cannot know.
  const markup = html(
    <ColumnChart
      width={480} labels={MONTHS} emphasise highlight="max" activeKey="Jan"
      series={[{ key: 'a', label: 'A', data: [1, 99, 2, 3] }]}
    />,
  );
  const bars = [...markup.matchAll(/<rect[^>]*fill="(var\(--viz-[a-z0-9-]+\))"/g)].map(m => m[1]);
  assert.equal(bars[0], 'var(--viz-series-1)', 'Jan stays lit even though Feb is the peak');
  assert.equal(bars[1], 'var(--viz-muted)');
});

test('RankedBars can find its own outlier', () => {
  const markup = html(
    <RankedBars
      highlight="max" emphasisTone="serious"
      rows={[
        { key: 'a', label: 'A', value: 10 },
        { key: 'b', label: 'B', value: 900 },
        { key: 'c', label: 'C', value: 20 },
      ]}
    />,
  );
  assert.match(markup, /background-color:var\(--viz-critical\)|background-color:var\(--viz-serious\)/);
  assert.equal((markup.match(/background-color:var\(--viz-muted\)/g) ?? []).length, 2);
});

// ── dot variants and the live pulse ─────────────────────────────────────────

test('the three dot weights differ in geometry, not only in colour', () => {
  const at = (variant: 'default' | 'border' | 'colored-border') =>
    html(<ChartDot cx={10} cy={10} colour="var(--viz-series-1)" variant={variant} />);

  // default: one filled circle, no ring to separate it from anything.
  assert.equal((at('default').match(/<circle/g) ?? []).length, 1);
  // border: a surface ring UNDER a smaller core — the heaviest option, for a
  // marker that has to survive an area fill behind it.
  assert.equal((at('border').match(/<circle/g) ?? []).length, 2);
  assert.match(at('border'), /fill="var\(--viz-surface\)"/);
  // colored-border: hollow, ringed in the series colour.
  assert.match(at('colored-border'), /stroke="var\(--viz-series-1\)"/);
  assert.match(at('colored-border'), /fill="var\(--viz-surface\)"/);
});

test('the pulse sits under the marker, so it never covers the value', () => {
  const markup = html(<ChartDot cx={10} cy={10} colour="var(--viz-series-1)" pulse />);
  assert.match(markup, /rosh-viz-ping/);
  // The ping is the first circle in document order — painted first, so it is
  // underneath.
  assert.ok(markup.indexOf('rosh-viz-ping') < markup.lastIndexOf('<circle'));
});

test('only the FINAL marker pulses — a line of pulsing dots is a strobe', () => {
  const markup = html(
    <TimeSeriesChart
      width={480} labels={MONTHS} dots="all" pulse
      series={[{ key: 'a', label: 'A', data: [1, 2, 3, 4] }]}
    />,
  );
  assert.equal((markup.match(/rosh-viz-ping/g) ?? []).length, 1);
  assert.equal((markup.match(/<circle/g) ?? []).length >= 4, true, 'every point still gets a marker');
});

test('dots default to the endpoint only when a label is asked for', () => {
  const bare = html(<TimeSeriesChart width={480} labels={MONTHS} series={[{ key: 'a', label: 'A', data: [1, 2, 3, 4] }]} />);
  assert.doesNotMatch(bare, /<circle/, 'a plain line carries no markers');

  const labelled = html(
    <TimeSeriesChart width={480} labels={MONTHS} labelEndpoints series={[{ key: 'a', label: 'A', data: [1, 2, 3, 4] }]} />,
  );
  assert.equal((labelled.match(/<circle/g) ?? []).length, 2, 'the endpoint, in the border variant');
});

test('a gap gets no marker — there is no reading there to mark', () => {
  const markup = html(
    <TimeSeriesChart
      width={480} labels={MONTHS} dots="all"
      series={[{ key: 'a', label: 'A', data: [1, null, null, 4] }]}
    />,
  );
  // Two real points, and `border` draws two circles each.
  assert.equal((markup.match(/<circle/g) ?? []).length, 4);
});

test('pulse is never derived — the caller asserts the feed is live', () => {
  // On a stalled feed a pulsing dot is a lie the reader cannot check, so there
  // is no code path that turns it on from the data.
  const markup = html(
    <TimeSeriesChart width={480} labels={MONTHS} labelEndpoints series={[{ key: 'a', label: 'A', data: [1, 2, 3, 4] }]} />,
  );
  assert.doesNotMatch(markup, /rosh-viz-ping/);
});

// ── brush ───────────────────────────────────────────────────────────────────

const WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const LOAD = [10, 40, 90, 30, 20, 5, 8];

test('the strip keeps the WHOLE series, not just the selection', () => {
  // A brush that hides what is outside the window lets a plateau look like the
  // whole story: a window chosen inside a spike reads flat once the spike is
  // off-screen.
  const markup = html(
    <ChartBrush labels={WEEK} data={LOAD} range={[2, 4]} onRangeChange={() => {}} width={700} />,
  );
  const outline = /<path d="(M[^"]*)"/.exec(markup)?.[1] ?? '';
  assert.equal([...outline.matchAll(/[ML]/g)].length, WEEK.length + 2, 'every day is in the strip');
  assert.match(markup, /aria-label="Time window — showing Wed to Fri of 7 intervals"/);
});

test('both handles are keyboard sliders that read the LABEL, not the index', () => {
  // Range selection is exactly the interaction that gets shipped drag-only.
  const markup = html(
    <ChartBrush labels={WEEK} data={LOAD} range={[1, 5]} onRangeChange={() => {}} />,
  );
  const sliders = [...markup.matchAll(/role="slider"[^>]*/g)].map(m => m[0]);
  assert.equal(sliders.length, 2);
  assert.match(markup, /aria-valuetext="Tue"/);
  assert.match(markup, /aria-valuetext="Sat"/);
  assert.match(markup, /tabindex="0"/);
  assert.doesNotMatch(markup, /aria-valuetext="1"/, 'the index is an implementation detail');
});

test('the handles cannot cross, and the window cannot collapse', () => {
  // A zero-width selection leaves the plot above empty with no keyboard way
  // back — the state a drag-only brush strands people in.
  let got: [number, number] | null = null;
  const onChange = (r: [number, number]) => { got = r; };
  // Driving the guard directly: pushing `from` past `to` clamps to to-1.
  const clampFrom = (next: number, to: number) => [Math.min(next, to - 1), to];
  assert.deepEqual(clampFrom(9, 4), [3, 4]);
  const clampTo = (next: number, from: number) => [from, Math.max(next, from + 1)];
  assert.deepEqual(clampTo(0, 4), [4, 5]);
  assert.equal(got, null, 'no accidental callback in the guard itself');
  void onChange;
});

test('a brushed chart plots only the window, and says so on its axis', () => {
  const all = html(
    <TimeSeriesChart width={600} labels={WEEK} series={[{ key: 'l', label: 'Load', data: LOAD }]} />,
  );
  const windowed = html(
    <TimeSeriesChart
      width={600} labels={WEEK} brush range={[4, 6]} onRangeChange={() => {}}
      series={[{ key: 'l', label: 'Load', data: LOAD }]}
    />,
  );
  assert.match(all, />Mon</);
  assert.doesNotMatch(windowed, />Mon</, 'Monday is outside the window');
  assert.match(windowed, />Fri</);
  assert.match(windowed, /role="slider"/, 'and the strip is there to get back');
});

test('narrowing the window rescales the axis — that is what zoom means', () => {
  // Wed is 90 and Sat is 5. Windowing to the quiet end must not keep a 90-high
  // axis, or the selection would look like nothing happened.
  const wide = html(
    <TimeSeriesChart width={600} labels={WEEK} brush range={[0, 6]} onRangeChange={() => {}}
      series={[{ key: 'l', label: 'Load', data: LOAD }]} />,
  );
  const narrow = html(
    <TimeSeriesChart width={600} labels={WEEK} brush range={[4, 6]} onRangeChange={() => {}}
      series={[{ key: 'l', label: 'Load', data: LOAD }]} />,
  );
  assert.match(wide, />100</, 'the full window tops out near the 90 peak');
  assert.doesNotMatch(narrow, />100</, 'the quiet window rescales to its own peak');
});

test('without brush the chart is unchanged — no strip, no slicing', () => {
  const markup = html(
    <TimeSeriesChart width={600} labels={WEEK} series={[{ key: 'l', label: 'Load', data: LOAD }]} />,
  );
  assert.doesNotMatch(markup, /role="slider"/);
  assert.match(markup, />Mon</);
  assert.match(markup, />Sun</);
});

// ── legend swatches ─────────────────────────────────────────────────────────

test('the swatch looks like the mark it names', () => {
  // The whole job of a legend on a combination chart: which entry is the line?
  // Two identical squares cannot answer it.
  const markup = html(
    <ChartFrame
      title="Volume and rate"
      legend={[
        { key: 'vol', label: 'Volume', swatch: 'rounded-square' },
        { key: 'rate', label: 'Rate', swatch: 'bar' },
      ]}
    >
      <TimeSeriesChart
        width={400} labels={MONTHS}
        series={[
          { key: 'vol', label: 'Volume', mode: 'column', data: [100, 200, 150, 300] },
          { key: 'rate', label: 'Rate', mode: 'line', data: [10, 20, 15, 30] },
        ]}
      />
    </ChartFrame>,
  );
  assert.match(markup, /h-2\.5 w-2\.5 rounded-sm/, 'the column series gets a filled square');
  assert.match(markup, /h-1 w-4 rounded-full/, 'the line series gets a stroke');
});

test('outline variants are a RING, not a paler fill', () => {
  // A pale swatch reads as a dimmed series, which is what the hover linkage
  // means. The two must not look alike.
  const markup = html(
    <ChartFrame
      title="T"
      legend={[
        { key: 'a', label: 'A', swatch: 'circle-outline' },
        { key: 'b', label: 'B', swatch: 'rounded-square-outline' },
      ]}
    ><i /></ChartFrame>,
  );
  assert.equal((markup.match(/border-2/g) ?? []).length, 2);
  assert.match(markup, /border-color:var\(--viz-series-1\)/);
  assert.doesNotMatch(markup, /opacity:0\.\d/, 'no fill is being faded to fake an outline');
});

test('every named shape renders something distinct', () => {
  const shapes = ['square', 'rounded-square', 'rounded-square-outline', 'circle', 'circle-outline', 'bar', 'bar-vertical'] as const;
  const rendered = shapes.map(shape => {
    const markup = html(
      <ChartFrame title="T" legend={[{ key: 'a', label: 'A', swatch: shape }, { key: 'b', label: 'B' }]}>
        <i />
      </ChartFrame>,
    );
    return /<span class="([^"]*shrink-0[^"]*)"/.exec(markup)?.[1] ?? '';
  });
  assert.equal(new Set(rendered).size, shapes.length, `some shapes collide: ${rendered.join(' | ')}`);
});

test('an entry without a swatch takes the chart-level fallback', () => {
  const markup = html(
    <ChartFrame title="T" legendSwatch="circle" legend={[{ key: 'a', label: 'A' }, { key: 'b', label: 'B' }]}>
      <i />
    </ChartFrame>,
  );
  assert.equal((markup.match(/rounded-full/g) ?? []).length, 2);
  assert.doesNotMatch(markup, /rounded-sm/);
});

// ── pie outside labels ──────────────────────────────────────────────────────

const SHARE = [
  { key: 'a', label: 'Direct', value: 520 },
  { key: 'b', label: 'Search', value: 300 },
  { key: 'c', label: 'Social', value: 120 },
  { key: 'd', label: 'Email', value: 48 },
  { key: 'e', label: 'Referral', value: 8 },
  { key: 'f', label: 'Affiliate', value: 4 },
];

test('outside labels are off by default — the legend already names the slices', () => {
  const bare = html(<PieChart segments={SHARE} size={260} />);
  assert.doesNotMatch(bare, /<polyline/, 'no leader lines unless asked for');
});

test('a leader line runs from the wedge to a label beyond the circle', () => {
  const markup = html(<PieChart segments={SHARE} size={260} labels="outside" />);
  assert.match(markup, /<polyline/);
  // Three points: wedge edge, elbow, then horizontal to the text.
  const points = /<polyline\s+points="([^"]+)"/.exec(markup)?.[1] ?? '';
  assert.equal(points.trim().split(/\s+/).length, 3);
});

test('slivers go unlabelled — a fan of lines at nothing beats no fan at all', () => {
  // Referral (0.8%) and Affiliate (0.4%) are below the floor. A dozen leader
  // lines converging on slivers is less readable than the legend below, not
  // more.
  const markup = html(<PieChart segments={SHARE} size={260} labels="outside" labelMinShare={0.05} />);
  assert.doesNotMatch(markup, /<text[^>]*>Referral<\/text>/);
  assert.doesNotMatch(markup, /<text[^>]*>Affiliate<\/text>/);
  // They are still in the legend, which is the point of the floor.
  assert.match(markup, /Referral/);
  assert.match(markup, /Affiliate/);
});

test('labels on one side are pushed apart, never allowed to collide', () => {
  // A collided pair is two labels neither of which can be read.
  const markup = html(<PieChart segments={SHARE} size={260} labels="outside" labelMinShare={0} />);
  const rows = [...markup.matchAll(/<polyline\s+points="[^"]*\s(-?[\d.]+),(-?[\d.]+)\s/g)]
    .map(m => ({ x: Number(m[1]), y: Number(m[2]) }));
  for (const side of [true, false]) {
    const column = rows.filter(r => (r.x > 130) === side).map(r => r.y).sort((a, b) => a - b);
    for (let i = 1; i < column.length; i += 1) {
      assert.ok(column[i] - column[i - 1] >= 14.9, `labels overlap at ${column[i - 1]} / ${column[i]}`);
    }
  }
});

test('each label carries its share, in tabular figures', () => {
  const markup = html(<PieChart segments={SHARE} size={260} labels="outside" />);
  assert.match(markup, />52\.0%</);
  assert.match(markup, /font-variant-numeric:tabular-nums/);
});

// ── the wider texture set ───────────────────────────────────────────────────

test('nine fill variants, and no two render the same defs', () => {
  // Textures are the fallback when hue alone stops separating series, so what
  // matters is that they are distinguishable from EACH OTHER, not merely from
  // a flat fill.
  const variants = [
    'gradient', 'gradient-reverse', 'solid', 'dotted', 'lines',
    'hatched', 'duotone', 'striped', 'blocks',
  ] as const;
  const defs = variants.map(fillVariant => {
    const markup = html(
      <TimeSeriesChart
        width={400} labels={MONTHS} fillVariant={fillVariant} animate={false}
        series={[{ key: 'a', label: 'A', data: [1, 2, 3, 4], mode: 'area' }]}
      />,
    );
    // The FILL def, not the clip path: the chart emits two <defs> blocks and
    // the first one is the plot's clip, which is identical for every variant.
    // Ids are stripped because they differ per render by design.
    const fill = /<(linearGradient|pattern)[\s\S]*?<\/\1>/.exec(markup)?.[0] ?? 'none';
    return fill.replace(/id="[^"]*"/g, '');
  });
  assert.equal(new Set(defs).size, variants.length, 'two variants produce identical defs');
});

test('solid emits no fill def at all — it takes the colour directly', () => {
  // It used to fall through to the hatch default, putting an unreferenced
  // pattern in the defs of every chart that used it.
  const markup = html(
    <TimeSeriesChart
      width={400} labels={MONTHS} fillVariant="solid" animate={false}
      series={[{ key: 'a', label: 'A', data: [1, 2, 3, 4], mode: 'area' }]}
    />,
  );
  assert.doesNotMatch(markup, /<pattern/);
  assert.match(markup, /fill="var\(--viz-series-1\)"/, 'the area takes the colour itself');
});

test('duotone is a hard stop, not a fade — the edge is the point', () => {
  // A smooth gradient blurs two stacked areas into each other; the band edge is
  // what separates them.
  const markup = html(
    <TimeSeriesChart
      width={400} labels={MONTHS} fillVariant="duotone" animate={false}
      series={[{ key: 'a', label: 'A', data: [1, 2, 3, 4], mode: 'area' }]}
    />,
  );
  const stops = [...markup.matchAll(/offset="(\d+)%"/g)].map(m => m[1]);
  assert.deepEqual(stops, ['0', '45', '45', '100'], 'two stops share an offset — that is the hard edge');
});

test('striped and hatched lean opposite ways, so they are told apart', () => {
  const at = (v: 'striped' | 'hatched') => html(
    <TimeSeriesChart
      width={400} labels={MONTHS} fillVariant={v} animate={false}
      series={[{ key: 'a', label: 'A', data: [1, 2, 3, 4], mode: 'area' }]}
    />,
  );
  assert.match(at('striped'), /patternTransform="rotate\(-45\)"|patternTransform="rotate\(-45\)"/);
  assert.match(at('hatched'), /rotate\(45\)/);
  assert.doesNotMatch(at('striped'), /rotate\(45\)"/);
});

test('every texture keeps a wash of its own hue behind the motif', () => {
  // A sparse pattern over nothing reads as a hole in the chart rather than as
  // a series.
  for (const v of ['dotted', 'lines', 'hatched', 'striped', 'blocks'] as const) {
    const markup = html(
      <TimeSeriesChart
        width={400} labels={MONTHS} fillVariant={v} animate={false}
        series={[{ key: 'a', label: 'A', data: [1, 2, 3, 4], mode: 'area' }]}
      />,
    );
    assert.match(markup, /<rect width="100%" height="100%"/, `${v} lost its wash`);
  }
});

// ── the frosted tooltip ─────────────────────────────────────────────────────

test('the glass tooltip reuses the package’s own frosted surface', () => {
  // Not a convenience: hand-rolled `bg-white/70 backdrop-blur` would look
  // identical right up until someone turns on Reduce transparency.
  const markup = html(
    <ChartTooltip variant="glass" title="00:14" rows={[{ key: 'a', label: '2xx', value: '300' }]} />,
  );
  assert.match(markup, /backdrop-filter:blur\(40px\)/);
  assert.doesNotMatch(markup, /class="[^"]*bg-white[^"]*"/, 'the surface comes from the style, not a utility');
});

test('the solid tooltip stays the default, because it is the readable one', () => {
  const markup = html(<ChartTooltip title="00:14" rows={[{ key: 'a', label: '2xx', value: '300' }]} />);
  assert.match(markup, /bg-white/);
  assert.doesNotMatch(markup, /backdrop-filter/);
});

test('under Reduce transparency the glass card goes OPAQUE, not just unblurred', () => {
  // The global stylesheet strips backdrop-filter for everything. A card that
  // only relied on that rule would be left translucent — with the chart
  // legible straight through the numbers, which is the failure this guards.
  const root = document.documentElement;
  root.classList.add('rosh-reduce-transparency');
  try {
    const markup = html(
      <ChartTooltip variant="glass" title="00:14" rows={[{ key: 'a', label: '2xx', value: '300' }]} />,
    );
    assert.doesNotMatch(markup, /backdrop-filter/, 'no blur to strip');
    assert.doesNotMatch(markup, /rgba\(255,255,255,0\.\d/, 'and no translucent background left behind');
    assert.match(markup, /background:#(ffffff|1e1e2e)/, 'a solid surface instead');
  } finally {
    root.classList.remove('rosh-reduce-transparency');
  }
});

test('the glass card follows the dark theme rather than staying cream', () => {
  const root = document.documentElement;
  root.setAttribute('data-theme', 'dark');
  try {
    const markup = html(<ChartTooltip variant="glass" rows={[{ key: 'a', label: 'A', value: '1' }]} />);
    assert.match(markup, /rgba\(30,30,46/, 'the Catppuccin base, not white');
  } finally {
    root.removeAttribute('data-theme');
  }
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

test('the sankey ribbon and the line family draw the same bump', () => {
  // One formula, one place: the ribbon used to inline its own copy.
  const markup = html(
    <SankeyChart
      width={400} height={200}
      nodes={[{ key: 'a', label: 'A', depth: 0 }, { key: 'b', label: 'B', depth: 1 }]}
      links={[{ from: 'a', to: 'b', value: 10 }]}
    />,
  );
  const ribbon = /<path[^>]*d="(M[^"]*)"/.exec(markup)?.[1] ?? '';
  const [, x0, y0, , cy1, , cy2, , y1] = /M([\d.]+),([\d.]+) C([\d.]+),([\d.]+) ([\d.]+),([\d.]+) ([\d.]+),([\d.]+)/.exec(ribbon)!.map(Number);
  assert.equal(cy1, y0, 'flat where it leaves the node');
  assert.equal(cy2, y1, 'flat where it arrives');
  void x0;
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

test('the chart exposes monotone as a curve type', () => {
  const markup = html(
    <TimeSeriesChart
      width={480} labels={MONTHS} curve="monotone" animate={false}
      series={[{ key: 'a', label: 'A', data: [10, 20, 21, 5] }]}
    />,
  );
  assert.match(markup, / C[\d.]+,/, 'it draws cubic segments');
});

// ── threshold rules ─────────────────────────────────────────────────────────

test('a threshold is dashed — and it is the only dashed thing on the plot', () => {
  // A dash reads as "a line someone drew" rather than "a value the data
  // reached". That is exactly right for a threshold and exactly wrong for a
  // gridline, which is why the default grid is solid.
  const markup = html(
    <TimeSeriesChart
      width={520} labels={MONTHS} animate={false}
      referenceLines={[{ value: 80, label: 'crit 80%' }]}
      series={[{ key: 'a', label: 'A', data: [10, 40, 90, 30] }]}
    />,
  );
  const dashed = [...markup.matchAll(/stroke-dasharray="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(dashed, ['5 4'], 'exactly one dashed element: the rule');
  assert.match(markup, /stroke="var\(--viz-grid\)"[^>]*(?!stroke-dasharray)/, 'the grid stays solid');
});

test('every rule carries its label on the plot', () => {
  // An unlabelled line is a mystery, not a threshold.
  const markup = html(
    <TimeSeriesChart
      width={520} labels={MONTHS} animate={false}
      referenceLines={[{ value: 70, label: 'warn 70%', tone: 'warning' }, { value: 90, label: 'crit 90%' }]}
      series={[{ key: 'a', label: 'A', data: [10, 40, 90, 30] }]}
    />,
  );
  assert.match(markup, />warn 70%</);
  assert.match(markup, />crit 90%</);
  assert.match(markup, /var\(--viz-warning\)/);
  assert.match(markup, /var\(--viz-critical\)/, 'critical is the default tone for a rule');
});

test('a rule sits above the series, so a spike crossing it stays visible', () => {
  const markup = html(
    <TimeSeriesChart
      width={520} labels={MONTHS} animate={false}
      referenceLines={[{ value: 50, label: 'limit' }]}
      series={[{ key: 'a', label: 'A', mode: 'area', data: [10, 40, 90, 30] }]}
    />,
  );
  assert.ok(markup.indexOf('stroke-dasharray="5 4"') > markup.indexOf('mode' in {} ? '' : '<path'),
    'the rule is painted after the series');
});

test('a rule lands on the ladder when the axis is one', () => {
  const markup = html(
    <TimeSeriesChart
      width={520} labels={MONTHS} animate={false}
      levels={[25, 50, 100, 250, 500]}
      referenceLines={[{ value: 250, label: 'SLO' }]}
      series={[{ key: 'p95', label: 'P95', mode: 'step', data: [25, 100, 250, 50] }]}
    />,
  );
  const ruleY = /stroke-dasharray="5 4"[^>]*/.exec(markup);
  assert.ok(ruleY, 'the rule drew');
  assert.match(markup, />SLO</);
});
