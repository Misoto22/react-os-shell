import './dom';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import Meter from '../src/charts/Meter';
import { STATUS_VARS } from '../src/charts/palette';

/** STATUS_VARS are `var(--…)` strings; parentheses are regex syntax. */
const escapeRe = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * A meter whose fill is made of parts.
 *
 * Found by aligning an ERP against its benchmark set: Business Central and
 * NetSuite both show fulfilment ON the order line — 80 of 100 shipped, 15 more
 * picked — because "what is still owed" is a spatial question, not one the
 * reader should have to do arithmetic for. `Meter` could only draw one fill,
 * so consumers hand-rolled a layered track instead. The kit already proved the
 * shape works in `ContainerFillChart`, whose own doc describes layering
 * "instruction (blue) and loaded (green) into the same bar so both are visible
 * at once" — it was just locked to container volumes.
 *
 * The single-value form must be untouched by this: it is the one every
 * observability console already renders.
 */

test('the single-value meter is unchanged when no segments are passed', () => {
  const html = renderToStaticMarkup(
    <Meter value={0.42} objective={0.9} label="Success rate" />,
  );
  assert.match(html, /role="meter"/);
  assert.match(html, /width:42\.00%|width: 42\.00%/);
  // The objective marker and its verdict still render.
  assert.match(html, /objective/);
  assert.match(html, /missed/);
});

test('segments are laid end to end on one track', () => {
  const html = renderToStaticMarkup(
    <Meter
      value={0.95}
      label="Line 3"
      segments={[
        { value: 0.8, label: 'Shipped' },
        { value: 0.15, label: 'Picked', tone: 'neutral' },
      ]}
    />,
  );
  assert.match(html, /width:80\.00%|width: 80\.00%/);
  assert.match(html, /width:15\.00%|width: 15\.00%/);
});

test('each part is NAMED with its share, so colour never travels alone', () => {
  // The single-value form writes its value out for the same reason: greyscale,
  // CVD and forced-colors all survive a written breakdown and none of them
  // survive two adjacent hues.
  const html = renderToStaticMarkup(
    <Meter
      value={0.95}
      label="Line 3"
      segments={[
        { value: 0.8, label: 'Shipped' },
        { value: 0.15, label: 'Picked' },
      ]}
    />,
  );
  assert.match(html, /Shipped 80\.0%/);
  assert.match(html, /Picked 15\.0%/);
});

test('the ARIA value stays the TOTAL, not the last segment', () => {
  // A screen reader should hear "95%", which is what the line is fulfilled to.
  // Reading the final segment would announce 15%.
  const html = renderToStaticMarkup(
    <Meter
      value={0.95}
      label="Line 3"
      segments={[{ value: 0.8, label: 'Shipped' }, { value: 0.15, label: 'Picked' }]}
    />,
  );
  assert.match(html, /aria-valuenow="95"/);
});

test('a segment wider than the track is clipped rather than overflowing it', () => {
  const html = renderToStaticMarkup(
    <Meter value={1} label="Over" segments={[{ value: 1.4, label: 'Shipped' }]} />,
  );
  assert.match(html, /width:100\.00%|width: 100\.00%/);
  assert.doesNotMatch(html, /width:140/);
});

test('segments that SUM past the track keep their widths and let the tail clip', () => {
  // The case the single-segment test above cannot reach: `clamp01` bounds each
  // part on its own, so a pair like 80/50 arrives at the DOM intact and it is
  // the flex box that decides what happens next. Flex items shrink by default,
  // which rendered this pair as 61.54/38.46 — a bar that agreed with neither
  // the breakdown printed under it nor the objective marker drawn over it.
  const html = renderToStaticMarkup(
    <Meter
      value={1}
      label="Line 3"
      segments={[
        { value: 0.8, label: 'Shipped' },
        { value: 0.5, label: 'Picked' },
      ]}
    />,
  );
  assert.match(html, /width:80\.00%|width: 80\.00%/, 'the first part keeps its stated width');
  assert.match(html, /width:50\.00%|width: 50\.00%/, 'and so does the second');
  // `shrink-0` is what holds them there; without it the browser rescales both
  // and nothing in the markup says so.
  const parts = [...html.matchAll(/class="h-full shrink-0[^"]*"/g)];
  assert.equal(parts.length, 2, 'every part opts out of flex shrinking');
});

test('the first segment carries the meter\u2019s verdict, so bar and figure agree', () => {
  // A missed objective paints the readout `critical`. The bar under it used to
  // be hard-coded `good`, so the same meter said "behind" in the number and
  // "fine" in the fill.
  const missed = renderToStaticMarkup(
    <Meter value={0.4} objective={0.9} label="Line 3" segments={[{ value: 0.4, label: 'Shipped' }]} />,
  );
  assert.match(missed, /missed/);
  assert.match(missed, new RegExp(escapeRe(STATUS_VARS.critical)), 'the fill takes the critical tone');
  assert.doesNotMatch(missed, new RegExp(escapeRe(STATUS_VARS.good)), 'and not the good one');

  // A segment that names its own tone still wins.
  const named = renderToStaticMarkup(
    <Meter
      value={0.4}
      objective={0.9}
      label="Line 3"
      segments={[{ value: 0.4, label: 'Shipped', tone: 'good' }]}
    />,
  );
  assert.match(named, new RegExp(escapeRe(STATUS_VARS.good)));
});

test('a segmented meter with an objective still prints ONE caption line', () => {
  // The breakdown used to be its own paragraph beside the detail/objective
  // one, so this combination stacked two grey lines where every other form of
  // the control prints a single joined one.
  const html = renderToStaticMarkup(
    <Meter
      value={0.95}
      objective={0.9}
      detail="Order 44182"
      label="Line 3"
      segments={[{ value: 0.8, label: 'Shipped' }, { value: 0.15, label: 'Picked' }]}
    />,
  );
  const captions = [...html.matchAll(/<p class="mt-1\.5 text-xs text-gray-500">/g)];
  assert.equal(captions.length, 1, 'one caption, not two stacked');
  assert.match(html, /Shipped 80\.0% · Picked 15\.0% · Order 44182 · objective 90\.0% met/);
});

test('the unavailable state still wins over segments', () => {
  // `value == null` means "not enough data to judge", and that is true however
  // many parts the caller happens to have computed.
  const html = renderToStaticMarkup(
    <Meter value={null} label="Line 3" segments={[{ value: 0.8, label: 'Shipped' }]} />,
  );
  assert.doesNotMatch(html, /role="meter"/);
  assert.match(html, /Not enough eligible requests/);
});
