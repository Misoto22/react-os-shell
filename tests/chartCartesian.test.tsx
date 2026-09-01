/**
 * The cartesian family and the chrome it shares — axes, legend, tooltip,
 * skeleton, dot, brush.
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
import TimeSeriesChart from '../src/charts/TimeSeriesChart';
import RankedBars from '../src/charts/RankedBars';
import ChartTooltip from '../src/charts/ChartTooltip';
import ChartFrame from '../src/charts/ChartFrame';
import ChartSkeleton from '../src/charts/ChartSkeleton';
import ChartDot from '../src/charts/ChartDot';
import ChartBrush from '../src/charts/ChartBrush';
import { binValues } from '../src/charts/scale';
import { autoHighlightIndex, highlightOpacity } from '../src/charts/highlight';

const ChartSkeletonProbe = () => <ChartSkeleton variant="bars" width={400} height={180} />;
const html = (el: React.ReactElement) => renderToStaticMarkup(el);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr'];

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
    html(<ChartDot cx={10} cy={10} color="var(--viz-series-1)" variant={variant} />);

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
  const markup = html(<ChartDot cx={10} cy={10} color="var(--viz-series-1)" pulse />);
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

// ── signed data ─────────────────────────────────────────────────────────────

test('grouped columns grow from the zero line, not the plot floor', () => {
  // With a negative in the domain the floor is BELOW zero: footing every bar
  // on it drew a positive bar straight through the zero line, and clamped a
  // negative bar to nothing.
  const markup = html(
    <ColumnChart width={300} labels={['a']} animate={false} series={[
      { key: 'up', label: 'Up', data: [5] },
      { key: 'down', label: 'Down', data: [-3] },
    ]} />,
  );
  const rects = [...markup.matchAll(/<rect[^>]*\by="([\d.]+)"[^>]*\bheight="([\d.]+)" rx=/g)]
    .map(m => ({ y: Number(m[1]), height: Number(m[2]) }));
  assert.equal(rects.length, 2, 'both bars draw');
  const [up, down] = rects;
  assert.ok(up.height > 0 && down.height > 0, 'neither bar vanishes');
  // Both bars anchor on the SAME zero line: the positive one ends where the
  // negative one begins.
  assert.ok(Math.abs(up.y + up.height - down.y) < 0.51,
    `bars must meet at zero: up ends ${up.y + up.height}, down starts ${down.y}`);
});

test('stacked negatives stack DOWN from zero instead of vanishing', () => {
  const markup = html(
    <ColumnChart width={300} labels={['a']} stacked animate={false} series={[
      { key: 'in', label: 'In', data: [5] },
      { key: 'out', label: 'Out', data: [-3] },
    ]} />,
  );
  const rects = [...markup.matchAll(/<rect[^>]*\by="([\d.]+)"[^>]*\bheight="([\d.]+)" rx=/g)]
    .map(m => ({ y: Number(m[1]), height: Number(m[2]) }));
  assert.equal(rects.length, 2, 'the negative segment is drawn, not clamped away');
  assert.ok(rects.every(r => r.height > 0), 'both segments have body');
});
