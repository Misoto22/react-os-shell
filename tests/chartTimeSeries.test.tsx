/**
 * TimeSeriesChart and ChartFrame, exercised through the kit surface.
 */
import './dom';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';

import TimeSeriesChart from '../src/charts/TimeSeriesChart';
import ChartFrame from '../src/charts/ChartFrame';
import { seriesColor, SERIES_VARS, CHART_INK } from '../src/charts/palette';

const P95 = [100, 250, 100, 250, 50];
const BOUNDS = [25, 50, 100, 250, 500, 1000, 2500, 5000];
const MINUTES = ['00:12', '00:13', '00:14', '00:15', '00:16'];
const html = (node: React.ReactElement) => renderToStaticMarkup(node);

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
