/**
 * The decorative chart family (Sparkline, BarChart, DonutChart, LineChart) is
 * `aria-hidden` and axis-less by design — the numbers live as text elsewhere on
 * the page. That left every consumer building its own axes, its own tooltip and
 * its own colours the moment a chart had to be READ, and the EFFICIENT
 * Observability console is what that produced: a dual-axis plot, quantised
 * percentiles joined by sloped lines, and two legend entries in the same green.
 *
 * These specs pin the claims that make the analytical family worth having, and
 * each one is a bug that shipped somewhere before it was a test here.
 */
import './dom';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';

import TimeSeriesChart from '../src/charts/TimeSeriesChart';
import RankedBars from '../src/charts/RankedBars';
import Meter from '../src/charts/Meter';
import StatTile from '../src/charts/StatTile';
import ChartFrame from '../src/charts/ChartFrame';
import { seriesColor, SERIES_VARS, CHART_INK } from '../src/charts/palette';
import { bandScale, ladderScale, linearScale, niceMax } from '../src/charts/scale';

const html = (el: React.ReactElement) => renderToStaticMarkup(el);

// Real values from the Observability API: P95 over five one-minute buckets.
const P95 = [100, 250, 100, 250, 50];
const BOUNDS = [25, 50, 100, 250, 500, 1000, 2500, 5000];
const MINUTES = ['00:12', '00:13', '00:14', '00:15', '00:16'];

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

// ── TimeSeriesChart ─────────────────────────────────────────────────────────

test('step mode draws flat segments only — no sloped join anywhere', () => {
  const markup = html(
    <TimeSeriesChart
      width={600}
      labels={MINUTES}
      levels={BOUNDS}
      series={[{ key: 'p95', label: 'P95', data: P95, mode: 'step' }]}
    />,
  );
  const path = /d="(M[^"]*)"/.exec(markup)?.[1] ?? '';
  assert.ok(path.length > 0, 'the step series drew a path');
  // Every segment is horizontal (same y as the previous point) or vertical
  // (same x). A segment that changes both at once is the drawn transition this
  // mode exists to refuse.
  const points = [...path.matchAll(/([\d.]+),([\d.]+)/g)].map(m => [Number(m[1]), Number(m[2])]);
  for (let i = 1; i < points.length; i += 1) {
    const sameX = points[i][0] === points[i - 1][0];
    const sameY = points[i][1] === points[i - 1][1];
    assert.ok(sameX || sameY, `sloped segment between point ${i - 1} and ${i}`);
  }
});

test('the ladder axis prints the bounds themselves as its ticks', () => {
  const markup = html(
    <TimeSeriesChart
      width={600}
      labels={MINUTES}
      levels={BOUNDS}
      series={[{ key: 'p95', label: 'P95', data: P95, mode: 'step' }]}
    />,
  );
  for (const bound of BOUNDS) assert.match(markup, new RegExp(`>${bound}<`));
});

test('a null bucket is a gap, not a segment drawn across it', () => {
  const markup = html(
    <TimeSeriesChart
      width={600}
      labels={MINUTES}
      series={[{ key: 'rps', label: 'req/s', data: [10, null, null, 4, 2] }]}
    />,
  );
  // Three real points, so three path commands — never five.
  const path = /d="(M[^"]*)"/.exec(markup)?.[1] ?? '';
  assert.equal([...path.matchAll(/[ML]/g)].length, 3);
});

test('stacked areas leave a surface gap rather than a border between them', () => {
  const markup = html(
    <TimeSeriesChart
      width={600}
      stacked
      labels={MINUTES}
      series={[
        { key: 'ok', label: '2xx', data: [333, 300, 300, 300, 0], tone: 'good' },
        { key: 'c4', label: '4xx', data: [660, 330, 330, 125, 205], tone: 'warning' },
      ]}
    />,
  );
  const fills = markup.match(/<path[^>]*stroke="none"/g) ?? [];
  assert.equal(fills.length, 2, 'one fill per stacked band');
  assert.doesNotMatch(markup, /stroke-width="1"[^>]*fill="var\(--viz-good\)"/, 'no border around a band');
});

test('an empty window says so instead of rendering a blank plot', () => {
  const markup = html(<TimeSeriesChart width={600} labels={[]} series={[]} />);
  assert.match(markup, /No data in this window/);
});

test('the plot is keyboard reachable and describes itself', () => {
  const markup = html(
    <TimeSeriesChart width={600} labels={MINUTES} series={[{ key: 'p95', label: 'P95', data: P95 }]} />,
  );
  assert.match(markup, /tabindex="0"/);
  assert.match(markup, /aria-label="P95 over 5 intervals"/);
});

// ── RankedBars ──────────────────────────────────────────────────────────────

const ROUTES = [
  { key: 'unmatched', label: '__unmatched__', value: 1963 },
  { key: 'health', label: 'api/health/', value: 1051 },
  { key: 'me', label: 'api/auth/me/', value: 697 },
];

test('every bar takes one colour when nothing is emphasised', () => {
  const markup = html(<RankedBars rows={ROUTES} />);
  const painted = markup.match(/background-color:var\(--viz-series-1\)/g) ?? [];
  assert.equal(painted.length, ROUTES.length, 'no darker-where-bigger ramp');
});

test('emphasis lifts one row and recedes the rest', () => {
  const markup = html(<RankedBars rows={ROUTES} emphasisKey="me" emphasisTone="critical" />);
  assert.match(markup, /background-color:var\(--viz-critical\)/);
  const muted = markup.match(/background-color:var\(--viz-muted\)/g) ?? [];
  assert.equal(muted.length, ROUTES.length - 1);
});

// ── Meter ───────────────────────────────────────────────────────────────────

test('a missing attainment renders the unavailable state, not a zero bar', () => {
  const markup = html(<Meter label="Latency SLO" value={null} objective={0.99} />);
  assert.match(markup, /Not enough eligible requests/);
  assert.doesNotMatch(markup, /role="meter"/);
});

test('the objective is marked on the track and stated in words', () => {
  const markup = html(<Meter label="Latency SLO" value={1} objective={0.99} />);
  assert.match(markup, /role="meter"/);
  assert.match(markup, /aria-valuenow="100"/);
  assert.match(markup, /objective 99.0% met/);
});

test('missing the objective changes the tone AND the sentence', () => {
  const markup = html(<Meter label="Latency SLO" value={0.94} objective={0.99} />);
  assert.match(markup, /var\(--viz-critical\)/);
  assert.match(markup, /objective 99.0% missed/, 'never colour alone');
});

// ── StatTile ────────────────────────────────────────────────────────────────

test('a delta carries an arrow and a word, so it survives greyscale', () => {
  const markup = html(<StatTile label="Requests" value="2,883" delta={-412} deltaTone="warning" />);
  assert.match(markup, /▼/);
  assert.match(markup, /<span class="sr-only"> down<\/span>/);
});

// ── ChartFrame ──────────────────────────────────────────────────────────────

test('one series gets no legend box; two or more always do', () => {
  const one = html(
    <ChartFrame title="Throughput" legend={[{ key: 'a', label: 'req/s' }]}><i /></ChartFrame>,
  );
  assert.doesNotMatch(one, /req\/s/);
  const two = html(
    <ChartFrame title="Mix" legend={[{ key: 'a', label: '2xx' }, { key: 'b', label: '4xx' }]}><i /></ChartFrame>,
  );
  assert.match(two, /2xx/);
  assert.match(two, /4xx/);
});

test('the table view is a disclosure in the frame, not each caller’s discipline', () => {
  const markup = html(
    <ChartFrame title="Mix" table={<table><tbody><tr><td>993</td></tr></tbody></table>}><i /></ChartFrame>,
  );
  assert.match(markup, /<details/);
  assert.match(markup, /Show the data as a table/);
  assert.match(markup, /993/);
});

test('refetching dims the previous render rather than flashing a skeleton', () => {
  const markup = html(<ChartFrame title="Mix" busy><i data-testid="held" /></ChartFrame>);
  assert.match(markup, /aria-busy="true"/);
  assert.match(markup, /opacity-60/);
  assert.match(markup, /data-testid="held"/, 'the previous render is still there');
});
