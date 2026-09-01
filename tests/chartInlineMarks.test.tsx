/**
 * Inline marks — the forms small enough to live inside a cell.
 *
 * Held to the same bar as a full chart: a value that is not there renders as
 * absent rather than as zero, and a tone means a status rather than a position
 * in a list.
 */
import './dom';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';

import RankedBars from '../src/charts/RankedBars';
import Meter from '../src/charts/Meter';
import StatTile from '../src/charts/StatTile';

const html = (node: React.ReactElement) => renderToStaticMarkup(node);

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

test('a NaN row is "no data", not the biggest bar', () => {
  // A NaN% width is invalid CSS and silently dropped, so the inner div used
  // to default to FULL width — the one row with no data painted as the max.
  const markup = html(<RankedBars rows={[
    { key: 'bad', label: 'bad', value: NaN },
    { key: 'ok', label: 'ok', value: 10 },
  ]} animate={false} />);
  assert.doesNotMatch(markup, /NaN/, 'no NaN reaches the markup');
  assert.match(markup, /—/, 'the missing value prints the em dash');
  assert.match(markup, /width:100\.00%/, 'the good row still spans the scale');
});

test('the tracks and the objective marker survive dark mode', () => {
  // bg-gray-100 remaps to the same --surface token the host card takes in
  // dark mode, and bg-gray-600 has no dark remap at all — both vanished.
  const bars = html(<RankedBars rows={ROUTES} />);
  const meter = html(<Meter value={0.97} objective={0.99} label="Attainment" />);
  assert.doesNotMatch(bars + meter, /bg-gray-100/, 'tracks sit on --surface-raised, not the surface itself');
  assert.match(bars, /bg-gray-200/, 'RankedBars track');
  assert.match(meter, /bg-gray-200/, 'Meter track');
  assert.doesNotMatch(meter, /bg-gray-600/, 'the marker is not an unmapped gray class');
  assert.match(meter, /background-color:var\(--viz-axis\)/, 'the marker takes the axis ink');
});
